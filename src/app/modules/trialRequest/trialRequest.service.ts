import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';
import { Secret } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Chat } from '../chat/chat.model';
import { Subject } from '../subject/subject.model';
import { ITrialRequest, TRIAL_REQUEST_STATUS } from './trialRequest.interface';
import { TrialRequest } from './trialRequest.model';
import { SessionRequest } from '../sessionRequest/sessionRequest.model';
import { SESSION_REQUEST_STATUS } from '../sessionRequest/sessionRequest.interface';
import { Message } from '../message/message.model';
import QueryBuilder from '../../builder/QueryBuilder';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';

// Response type for createTrialRequest
interface CreateTrialRequestResponse {
  trialRequest: ITrialRequest;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Create trial request (First-time Student or Guest ONLY)
 * For returning students, use SessionRequest module instead
 * Automatically creates User account when trial request is created
 */
const createTrialRequest = async (
  studentId: string | null,
  payload: Partial<ITrialRequest>
): Promise<CreateTrialRequestResponse> => {
  // Validate subject exists
  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // Validate based on age
  // Under 18: guardian info required
  // 18+: student email/password required
  if (payload.studentInfo?.isUnder18) {
    if (!payload.studentInfo?.guardianInfo) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Guardian information is required for students under 18'
      );
    }
  } else {
    if (!payload.studentInfo?.email) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email is required for students 18 and above'
      );
    }
    if (!payload.studentInfo?.password) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Password is required for students 18 and above'
      );
    }
  }

  // If logged-in student, verify and check eligibility
  if (studentId) {
    const student = await User.findById(studentId);
    if (!student) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
    }

    if (student.role !== USER_ROLES.STUDENT) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Only students can create trial requests'
      );
    }

    // Returning students should use SessionRequest, not TrialRequest
    if (student.studentProfile?.hasCompletedTrial) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have already completed a trial. Please use the session request feature for additional tutoring sessions.'
      );
    }

    // Check if student has pending trial request
    const pendingTrialRequest = await TrialRequest.findOne({
      studentId: new Types.ObjectId(studentId),
      status: TRIAL_REQUEST_STATUS.PENDING,
    });

    if (pendingTrialRequest) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You already have a pending trial request. Please wait for a tutor to accept or cancel it.'
      );
    }

    // Also check for pending session request
    const pendingSessionRequest = await SessionRequest.findOne({
      studentId: new Types.ObjectId(studentId),
      status: SESSION_REQUEST_STATUS.PENDING,
    });

    if (pendingSessionRequest) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have a pending session request. Please wait for it to be accepted or cancel it first.'
      );
    }
  } else {
    // Guest user - check by email for previous trials and pending requests
    const emailToCheck = payload.studentInfo?.isUnder18
      ? payload.studentInfo?.guardianInfo?.email
      : payload.studentInfo?.email;

    if (emailToCheck) {
      // Check if user already exists with this email
      const existingUser = await User.findOne({ email: emailToCheck.toLowerCase() });
      if (existingUser) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'An account with this email already exists. Please log in to create a trial request.'
        );
      }

      // Check if guest has already completed a trial
      const previousAcceptedTrial = await TrialRequest.findOne({
        $or: [
          { 'studentInfo.email': emailToCheck },
          { 'studentInfo.guardianInfo.email': emailToCheck },
        ],
        status: TRIAL_REQUEST_STATUS.ACCEPTED,
      });

      if (previousAcceptedTrial) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'You have already completed a trial with this email. Please log in to request more sessions.'
        );
      }

      // Check for pending requests
      const pendingRequest = await TrialRequest.findOne({
        $or: [
          { 'studentInfo.email': emailToCheck },
          { 'studentInfo.guardianInfo.email': emailToCheck },
        ],
        status: TRIAL_REQUEST_STATUS.PENDING,
      });

      if (pendingRequest) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'A pending trial request already exists for this email. Please wait for a tutor to accept or cancel it.'
        );
      }
    }
  }

  // Auto-create User account for guest users when trial request is created
  // Uses MongoDB transaction to prevent orphaned users if any step fails
  let createdStudentId = studentId;
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let userInfo: CreateTrialRequestResponse['user'] | undefined;
  let trialRequest: ITrialRequest & { _id: Types.ObjectId };

  if (!studentId && payload.studentInfo) {
    // Determine email and password based on age
    const isUnder18 = payload.studentInfo.isUnder18;
    const email = isUnder18
      ? payload.studentInfo.guardianInfo?.email
      : payload.studentInfo.email;
    const password = isUnder18
      ? payload.studentInfo.guardianInfo?.password
      : payload.studentInfo.password;
    const name = isUnder18
      ? payload.studentInfo.guardianInfo?.name || payload.studentInfo.name
      : payload.studentInfo.name;
    const phone = isUnder18
      ? payload.studentInfo.guardianInfo?.phone
      : undefined;

    if (email && password) {
      // Transaction: User + TrialRequest created together or not at all
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        // Create new User account within transaction
        const [newUser] = await User.create([{
          name: name,
          email: email.toLowerCase(),
          password: password,
          phone: phone,
          role: USER_ROLES.STUDENT,
          studentProfile: {
            hasCompletedTrial: false,
            trialRequestsCount: 1,
            sessionRequestsCount: 0,
          },
        }], { session: dbSession });

        createdStudentId = newUser._id.toString();

        // Generate JWT tokens for auto-login (pure computation, won't fail DB)
        accessToken = jwtHelper.createToken(
          { id: newUser._id, role: newUser.role, email: newUser.email },
          config.jwt.jwt_secret as Secret,
          config.jwt.jwt_expire_in as string
        );
        refreshToken = jwtHelper.createToken(
          { id: newUser._id, role: newUser.role, email: newUser.email },
          config.jwt.jwt_refresh_secret as Secret,
          config.jwt.jwt_refresh_expire_in as string
        );
        userInfo = {
          _id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        };

        // Create trial request within same transaction
        const [createdRequest] = await TrialRequest.create([{
          ...payload,
          studentId: new Types.ObjectId(createdStudentId),
          status: TRIAL_REQUEST_STATUS.PENDING,
        }], { session: dbSession });

        trialRequest = createdRequest;

        await dbSession.commitTransaction();
      } catch (error) {
        await dbSession.abortTransaction();
        throw error;
      } finally {
        dbSession.endSession();
      }
    } else {
      // No email/password - create trial request without user account
      trialRequest = await TrialRequest.create({
        ...payload,
        status: TRIAL_REQUEST_STATUS.PENDING,
      });
    }
  } else {
    // Logged-in student - create trial request directly (user already exists)
    trialRequest = await TrialRequest.create({
      ...payload,
      studentId: createdStudentId ? new Types.ObjectId(createdStudentId) : undefined,
      status: TRIAL_REQUEST_STATUS.PENDING,
    });

    // Increment student trial request count
    if (studentId) {
      await User.findByIdAndUpdate(studentId, {
        $inc: { 'studentProfile.trialRequestsCount': 1 },
      });
    }
  }

  // Send real-time notification to matching tutors via socket (AFTER transaction committed)
  const io = (global as any).io;
  if (io) {
    const matchingTutors = await User.find({
      role: USER_ROLES.TUTOR,
      'tutorProfile.isVerified': true,
      'tutorProfile.subjects': payload.subject,
    }).select('_id');

    const populatedRequest = await TrialRequest.findById(trialRequest._id)
      .populate('subject', 'name icon description')
      .select('-studentInfo.password -studentInfo.guardianInfo.password');

    matchingTutors.forEach(tutor => {
      io.to(`user::${tutor._id.toString()}`).emit('TRIAL_REQUEST_CREATED', {
        trialRequest: populatedRequest,
      });
    });

    console.log(`Trial request notification sent to ${matchingTutors.length} tutors`);
  }

  // TODO: Send email notification to admin
  // TODO: Send confirmation email to student

  return {
    trialRequest,
    accessToken,
    refreshToken,
    user: userInfo,
  };
};

/**
 * Get single trial request
 */
const getSingleTrialRequest = async (id: string): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('acceptedTutorId', 'name email profilePicture phone')
    .populate('subject', 'name icon description')
    .populate('chatId');

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  return request;
};

/**
 * Get available trial requests matching tutor's subjects (Tutor)
 * Returns PENDING requests where:
 * - Tutor teaches the requested subject
 * - Request is not expired
 * - Request was not created by the tutor's own students (future consideration)
 */
const getAvailableTrialRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  // Verify tutor exists and is verified
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view available requests');
  }

  // Get tutor's subjects
  const tutorSubjectIds = tutor.tutorProfile?.subjects || [];
  if (tutorSubjectIds.length === 0) {
    return {
      pagination: { page: 1, limit: 10, total: 0, totalPage: 0 },
      data: [],
    };
  }

  const now = new Date();

  // Build query for pending requests matching tutor's subjects
  const requestQuery = new QueryBuilder(
    TrialRequest.find({
      status: TRIAL_REQUEST_STATUS.PENDING,
      subject: { $in: tutorSubjectIds },
      expiresAt: { $gt: now }, // Not expired
    })
      .populate('subject', 'name icon description')
      .select('-studentInfo.password -studentInfo.guardianInfo.password'),
    query
  )
    .filter()
    .sort()
    .paginate();

  const requests = await requestQuery.modelQuery;
  const paginationInfo = await requestQuery.getPaginationInfo();

  // Calculate student age from DOB for each request
  const requestsWithAge = requests.map(request => {
    const reqObj = request.toObject();
    if (reqObj.studentInfo?.dateOfBirth) {
      const dob = new Date(reqObj.studentInfo.dateOfBirth);
      const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return { ...reqObj, studentAge: age };
    }
    return reqObj;
  });

  return {
    pagination: paginationInfo,
    data: requestsWithAge,
  };
};

/**
 * Get tutor's accepted trial requests (Tutor)
 * Returns requests the tutor has accepted with their status
 */
const getMyAcceptedTrialRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  // Verify tutor exists
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  // Build query for accepted requests by this tutor
  const requestQuery = new QueryBuilder(
    TrialRequest.find({
      acceptedTutorId: new Types.ObjectId(tutorId),
    })
      .populate('studentId', 'name email profilePicture phone')
      .populate('subject', 'name icon description')
      .populate('chatId')
      .select('-studentInfo.password -studentInfo.guardianInfo.password'),
    query
  )
    .filter()
    .sort()
    .paginate();

  const requests = await requestQuery.modelQuery;
  const paginationInfo = await requestQuery.getPaginationInfo();

  return {
    pagination: paginationInfo,
    data: requests,
  };
};

/**
 * Accept trial request (Tutor)
 * Creates chat and connects student with tutor
 * Sends introductory message to chat
 * Marks student as having completed trial
 */
const acceptTrialRequest = async (
  requestId: string,
  tutorId: string,
  introductoryMessage?: string
): Promise<ITrialRequest | null> => {
  // Verify tutor FIRST (before atomic update, so we don't accept then fail)
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

  // Verify tutor teaches this subject - need to check request first
  const requestCheck = await TrialRequest.findById(requestId);
  if (!requestCheck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  const tutorSubjectIds = tutor.tutorProfile?.subjects?.map(s => s.toString()) || [];
  const requestSubjectId = typeof requestCheck.subject === 'object' && (requestCheck.subject as any)._id
    ? (requestCheck.subject as any)._id.toString()
    : requestCheck.subject.toString();
  if (!tutorSubjectIds.includes(requestSubjectId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You do not teach this subject'
    );
  }

  // Atomic update: only one teacher can accept (prevents race condition)
  // All validations passed, now atomically claim the request
  const request = await TrialRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: TRIAL_REQUEST_STATUS.PENDING,
      expiresAt: { $gt: new Date() },
    },
    {
      status: TRIAL_REQUEST_STATUS.ACCEPTED,
      acceptedTutorId: new Types.ObjectId(tutorId),
      acceptedAt: new Date(),
    },
    { new: true }
  ).populate('subject', 'name');

  if (!request) {
    // Another teacher accepted between our check and update, or it expired
    const existing = await TrialRequest.findById(requestId);
    if (existing?.status === TRIAL_REQUEST_STATUS.ACCEPTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This trial request has already been accepted by another tutor');
    }
    if (existing && new Date() > existing.expiresAt) {
      existing.status = TRIAL_REQUEST_STATUS.EXPIRED;
      await existing.save();
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This trial request has expired');
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This trial request is no longer available');
  }

  // Prepare chat participants
  // If studentId exists (logged-in user), use it; otherwise, create chat with tutor only for now
  const chatParticipants = request.studentId
    ? [request.studentId, new Types.ObjectId(tutorId)]
    : [new Types.ObjectId(tutorId)];

  // Check if chat already exists between tutor and student (to avoid duplicate chats)
  let chat = await Chat.findOne({
    participants: { $all: chatParticipants },
  });

  if (chat) {
    // Reuse existing chat, update trial request reference
    chat.trialRequestId = request._id;
    chat.sessionRequestId = undefined; // Clear session reference for trial
    await chat.save();
  } else {
    // Create new chat only if none exists
    chat = await Chat.create({
      participants: chatParticipants,
      trialRequestId: request._id,
    });
  }

  // Send introductory message if provided
  if (introductoryMessage && introductoryMessage.trim()) {
    await Message.create({
      chatId: chat._id,
      sender: new Types.ObjectId(tutorId),
      text: introductoryMessage.trim(),
      type: 'text',
    });
  }

  // Update chatId on the request (status/tutor/acceptedAt already set atomically above)
  await TrialRequest.findByIdAndUpdate(requestId, { chatId: chat._id });

  // Mark student as having completed trial (so they use SessionRequest next time)
  if (request.studentId) {
    await User.findByIdAndUpdate(request.studentId, {
      $set: { 'studentProfile.hasCompletedTrial': true },
    });
  }

  // Send real-time notification to student via socket
  const io = (global as any).io;
  if (io) {
    // Populate the request with tutor info for the notification
    const populatedRequest = await TrialRequest.findById(request._id)
      .populate('acceptedTutorId', 'name email profilePicture')
      .populate('subject', 'name icon description')
      .populate('chatId');

    // Emit to student's personal room
    if (request.studentId) {
      io.to(`user::${request.studentId.toString()}`).emit('TRIAL_REQUEST_ACCEPTED', {
        trialRequest: populatedRequest,
        tutor: {
          _id: tutor._id,
          name: tutor.name,
          profilePicture: tutor.profilePicture,
        },
        chatId: chat._id,
      });
      console.log(`Trial acceptance notification sent to student ${request.studentId}`);
    }

    // Also notify other tutors that this request is no longer available
    const otherTutors = await User.find({
      role: USER_ROLES.TUTOR,
      'tutorProfile.isVerified': true,
      'tutorProfile.subjects': request.subject,
      _id: { $ne: tutorId }, // Exclude the accepting tutor
    }).select('_id');

    otherTutors.forEach(otherTutor => {
      io.to(`user::${otherTutor._id.toString()}`).emit('TRIAL_REQUEST_TAKEN', {
        trialRequestId: request._id,
      });
    });
  }

  // TODO: Send email to student

  return request;
};

/**
 * Cancel trial request (Student)
 * Can be cancelled by studentId (logged-in) or by email (guest)
 */
const cancelTrialRequest = async (
  requestId: string,
  studentIdOrEmail: string,
  cancellationReason: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  // Verify ownership - check both studentId and studentInfo.email
  const isOwnerByStudentId =
    request.studentId && request.studentId.toString() === studentIdOrEmail;
  const isOwnerByEmail =
    request.studentInfo?.email?.toLowerCase() === studentIdOrEmail.toLowerCase();

  if (!isOwnerByStudentId && !isOwnerByEmail) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own trial requests'
    );
  }

  // Can only cancel PENDING requests
  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending trial requests can be cancelled'
    );
  }

  // Update request
  request.status = TRIAL_REQUEST_STATUS.CANCELLED;
  request.cancellationReason = cancellationReason;
  request.cancelledAt = new Date();
  await request.save();

  return request;
};

/**
 * Extend trial request (Student)
 * Adds 7 more days to expiration (max 1 extension)
 */
const extendTrialRequest = async (
  requestId: string,
  studentIdOrEmail: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

  // Verify ownership
  const isOwnerByStudentId =
    request.studentId && request.studentId.toString() === studentIdOrEmail;
  const isOwnerByEmail =
    request.studentInfo?.email?.toLowerCase() === studentIdOrEmail.toLowerCase();
  const isOwnerByGuardianEmail =
    request.studentInfo?.guardianInfo?.email?.toLowerCase() === studentIdOrEmail.toLowerCase();

  if (!isOwnerByStudentId && !isOwnerByEmail && !isOwnerByGuardianEmail) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only extend your own trial requests'
    );
  }

  // Can only extend PENDING requests
  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending trial requests can be extended'
    );
  }

  // Check extension limit (max 1)
  if (request.extensionCount && request.extensionCount >= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Trial request can only be extended once'
    );
  }

  // Extend by 7 days
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  request.expiresAt = newExpiresAt;
  request.isExtended = true;
  request.extensionCount = (request.extensionCount || 0) + 1;
  request.finalExpiresAt = undefined; // Reset final deadline
  request.reminderSentAt = undefined; // Reset reminder
  await request.save();

  // TODO: Send confirmation email

  return request;
};

/**
 * Send reminders for expiring requests (Cron job)
 * Finds requests where expiresAt has passed but no reminder sent yet
 * Sets finalExpiresAt to 3 days from now
 */
const sendExpirationReminders = async (): Promise<number> => {
  const now = new Date();

  // Find expired requests that haven't received reminder
  const expiredRequests = await TrialRequest.find({
    status: TRIAL_REQUEST_STATUS.PENDING,
    expiresAt: { $lt: now },
    reminderSentAt: { $exists: false },
  });

  let reminderCount = 0;

  for (const request of expiredRequests) {
    // Set reminder sent and final deadline (3 days)
    const finalDeadline = new Date();
    finalDeadline.setDate(finalDeadline.getDate() + 3);

    request.reminderSentAt = now;
    request.finalExpiresAt = finalDeadline;
    await request.save();

    // TODO: Send email notification
    // const email = request.studentInfo?.isUnder18
    //   ? request.studentInfo?.guardianInfo?.email
    //   : request.studentInfo?.email;
    // await sendEmail({
    //   to: email,
    //   subject: 'Your Trial Request is Expiring',
    //   template: 'trial-request-expiring',
    //   data: {
    //     name: request.studentInfo?.name,
    //     expiresAt: finalDeadline,
    //     extendUrl: `${FRONTEND_URL}/trial-requests/${request._id}/extend`,
    //     cancelUrl: `${FRONTEND_URL}/trial-requests/${request._id}/cancel`,
    //   }
    // });

    reminderCount++;
  }

  return reminderCount;
};

/**
 * Auto-delete requests after final deadline (Cron job)
 * Deletes requests where finalExpiresAt has passed with no response
 */
const autoDeleteExpiredRequests = async (): Promise<number> => {
  const now = new Date();

  const result = await TrialRequest.deleteMany({
    status: TRIAL_REQUEST_STATUS.PENDING,
    finalExpiresAt: { $lt: now },
  });

  return result.deletedCount;
};

/**
 * Auto-expire trial requests (Cron job - legacy)
 * Marks as EXPIRED instead of delete (for records)
 */
const expireOldRequests = async (): Promise<number> => {
  const result = await TrialRequest.updateMany(
    {
      status: TRIAL_REQUEST_STATUS.PENDING,
      finalExpiresAt: { $lt: new Date() },
    },
    {
      $set: { status: TRIAL_REQUEST_STATUS.EXPIRED },
    }
  );

  return result.modifiedCount;
};

export const TrialRequestService = {
  createTrialRequest,
  getSingleTrialRequest,
  getAvailableTrialRequests,
  getMyAcceptedTrialRequests,
  acceptTrialRequest,
  cancelTrialRequest,
  extendTrialRequest,
  sendExpirationReminders,
  autoDeleteExpiredRequests,
  expireOldRequests,
};
