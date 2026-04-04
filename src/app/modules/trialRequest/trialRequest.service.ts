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

const createTrialRequest = async (
  studentId: string | null,
  payload: Partial<ITrialRequest>
): Promise<CreateTrialRequestResponse> => {

  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

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

    if (student.studentProfile?.hasCompletedTrial) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You have already completed a trial. Please use the session request feature for additional tutoring sessions.'
      );
    }

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

    const emailToCheck = payload.studentInfo?.isUnder18
      ? payload.studentInfo?.guardianInfo?.email
      : payload.studentInfo?.email;

    if (emailToCheck) {

      const existingUser = await User.findOne({ email: emailToCheck.toLowerCase() });
      if (existingUser) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'An account with this email already exists. Please log in to create a trial request.'
        );
      }

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

  let createdStudentId = studentId;
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let userInfo: CreateTrialRequestResponse['user'] | undefined;
  let trialRequest: ITrialRequest & { _id: Types.ObjectId };

  if (!studentId && payload.studentInfo) {

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

      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {

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

      trialRequest = await TrialRequest.create({
        ...payload,
        status: TRIAL_REQUEST_STATUS.PENDING,
      });
    }
  } else {

    trialRequest = await TrialRequest.create({
      ...payload,
      studentId: createdStudentId ? new Types.ObjectId(createdStudentId) : undefined,
      status: TRIAL_REQUEST_STATUS.PENDING,
    });

    if (studentId) {
      await User.findByIdAndUpdate(studentId, {
        $inc: { 'studentProfile.trialRequestsCount': 1 },
      });
    }
  }

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

  return {
    trialRequest,
    accessToken,
    refreshToken,
    user: userInfo,
  };
};

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

const getAvailableTrialRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view available requests');
  }

  const tutorSubjectIds = tutor.tutorProfile?.subjects || [];
  if (tutorSubjectIds.length === 0) {
    return {
      pagination: { page: 1, limit: 10, total: 0, totalPage: 0 },
      data: [],
    };
  }

  const now = new Date();

  const requestQuery = new QueryBuilder(
    TrialRequest.find({
      status: TRIAL_REQUEST_STATUS.PENDING,
      subject: { $in: tutorSubjectIds },
      expiresAt: { $gt: now },
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

const getMyAcceptedTrialRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

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

const acceptTrialRequest = async (
  requestId: string,
  tutorId: string,
  introductoryMessage?: string
): Promise<ITrialRequest | null> => {

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

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

  const chatParticipants = request.studentId
    ? [request.studentId, new Types.ObjectId(tutorId)]
    : [new Types.ObjectId(tutorId)];

  let chat = await Chat.findOne({
    participants: { $all: chatParticipants },
  });

  if (chat) {

    chat.trialRequestId = request._id;
    chat.sessionRequestId = undefined;
    await chat.save();
  } else {

    chat = await Chat.create({
      participants: chatParticipants,
      trialRequestId: request._id,
    });
  }

  if (introductoryMessage && introductoryMessage.trim()) {
    await Message.create({
      chatId: chat._id,
      sender: new Types.ObjectId(tutorId),
      text: introductoryMessage.trim(),
      type: 'text',
    });
  }

  await TrialRequest.findByIdAndUpdate(requestId, { chatId: chat._id });

  if (request.studentId) {
    await User.findByIdAndUpdate(request.studentId, {
      $set: { 'studentProfile.hasCompletedTrial': true },
    });
  }

  const io = (global as any).io;
  if (io) {

    const populatedRequest = await TrialRequest.findById(request._id)
      .populate('acceptedTutorId', 'name email profilePicture')
      .populate('subject', 'name icon description')
      .populate('chatId');

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

    const otherTutors = await User.find({
      role: USER_ROLES.TUTOR,
      'tutorProfile.isVerified': true,
      'tutorProfile.subjects': request.subject,
      _id: { $ne: tutorId },
    }).select('_id');

    otherTutors.forEach(otherTutor => {
      io.to(`user::${otherTutor._id.toString()}`).emit('TRIAL_REQUEST_TAKEN', {
        trialRequestId: request._id,
      });
    });
  }

  return request;
};

const cancelTrialRequest = async (
  requestId: string,
  studentIdOrEmail: string,
  cancellationReason: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

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

  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending trial requests can be cancelled'
    );
  }

  request.status = TRIAL_REQUEST_STATUS.CANCELLED;
  request.cancellationReason = cancellationReason;
  request.cancelledAt = new Date();
  await request.save();

  return request;
};

const extendTrialRequest = async (
  requestId: string,
  studentIdOrEmail: string
): Promise<ITrialRequest | null> => {
  const request = await TrialRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Trial request not found');
  }

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

  if (request.status !== TRIAL_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending trial requests can be extended'
    );
  }

  if (request.extensionCount && request.extensionCount >= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Trial request can only be extended once'
    );
  }

  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  request.expiresAt = newExpiresAt;
  request.isExtended = true;
  request.extensionCount = (request.extensionCount || 0) + 1;
  request.finalExpiresAt = undefined;
  request.reminderSentAt = undefined;
  await request.save();

  return request;
};

const sendExpirationReminders = async (): Promise<number> => {
  const now = new Date();

  const expiredRequests = await TrialRequest.find({
    status: TRIAL_REQUEST_STATUS.PENDING,
    expiresAt: { $lt: now },
    reminderSentAt: { $exists: false },
  });

  let reminderCount = 0;

  for (const request of expiredRequests) {

    const finalDeadline = new Date();
    finalDeadline.setDate(finalDeadline.getDate() + 3);

    request.reminderSentAt = now;
    request.finalExpiresAt = finalDeadline;
    await request.save();

    reminderCount++;
  }

  return reminderCount;
};

const autoDeleteExpiredRequests = async (): Promise<number> => {
  const now = new Date();

  const result = await TrialRequest.deleteMany({
    status: TRIAL_REQUEST_STATUS.PENDING,
    finalExpiresAt: { $lt: now },
  });

  return result.deletedCount;
};

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
