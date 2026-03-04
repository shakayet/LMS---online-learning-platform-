import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { USER_ROLES, USER_STATUS } from '../../../enums/user';
import ApiError from '../../../errors/ApiError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../util/generateOTP';
import { User } from './user.model';
import QueryBuilder from '../../builder/QueryBuilder';
import AggregationBuilder from '../../builder/AggregationBuilder';
import { IUser, TUTOR_LEVEL } from './user.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import { TutorEarnings } from '../tutorEarnings/tutorEarnings.model';
import { TutorSessionFeedback } from '../tutorSessionFeedback/tutorSessionFeedback.model';
import { FEEDBACK_STATUS } from '../tutorSessionFeedback/tutorSessionFeedback.interface';
import { ActivityLogService } from '../activityLog/activityLog.service';

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  // Log activity for user registration
  const roleLabel = createUser.role === USER_ROLES.STUDENT ? 'Student' :
                    createUser.role === USER_ROLES.TUTOR ? 'Tutor' : 'User';
  ActivityLogService.logActivity({
    userId: createUser._id,
    actionType: 'USER_REGISTERED',
    title: `New ${roleLabel} Registered`,
    description: `${createUser.name} joined the platform as a ${roleLabel.toLowerCase()}`,
    entityType: 'USER',
    entityId: createUser._id,
    status: 'success',
  });

  // NOTE: Email verification temporarily disabled
  // Uncomment below to re-enable OTP email verification
  /*
  //send email
  const otp = generateOTP();
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!,
  };
  console.log('Sending email to:', createUser.email, 'with OTP:', otp);

  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  //save to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000),
  };
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } }
  );
  */

  return createUser;
};

const getUserProfileFromDB = async (
  user: JwtPayload
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.findById(id)
    .populate('tutorProfile.subjects', 'name');

  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // //unlink file here
  // if (payload.image) {
  //   unlinkFile(isExistUser.image);
  // }

  //unlink file here
  if (payload.profilePicture) {
    unlinkFile(isExistUser.profilePicture);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const userQuery = new QueryBuilder(User.find(), query)
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const users = await userQuery.modelQuery;
  const paginationInfo = await userQuery.getPaginationInfo();

  return {
    pagination: paginationInfo,
    data: users,
  };
};

const resendVerifyEmailToDB = async (email: string) => {
  const isExistUser = await User.findOne({ email });
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  // Generate new OTP
  const otp = generateOTP();

  // Save OTP to DB
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000), // 3 minutes
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });

  // Send email
  const emailData = emailTemplate.createAccount({
    name: isExistUser.name,
    email: isExistUser.email,
    otp,
  });
  await emailHelper.sendEmail(emailData);

  return { otp }; // optional: just for logging/debugging
};

const updateUserStatus = async (id: string, status: USER_STATUS) => {
  const user = await User.isExistUserById(id);
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  return updatedUser;
};

const getUserById = async (id: string) => {
  // Only return user info; remove task/bid side data
  const user = await User.findById(id)
    .select('-password -authentication')
    .populate({
      path: 'tutorProfile.subjects',
      select: 'name _id',
    });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  return user;
};

const getUserDetailsById = async (id: string) => {
  const user = await User.findById(id).select('-password -authentication');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  return user;
};

// ============ ADMIN: STUDENT MANAGEMENT ============

const getAllStudents = async (query: Record<string, unknown>) => {
  const studentQuery = new QueryBuilder(
    User.find({ role: USER_ROLES.STUDENT }).select('-password -authentication'),
    query
  )
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const students = await studentQuery.modelQuery;
  const paginationInfo = await studentQuery.getPaginationInfo();

  return {
    pagination: paginationInfo,
    data: students,
  };
};

const blockStudent = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a student');
  }
  if (user.status === USER_STATUS.RESTRICTED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Student is already blocked');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.RESTRICTED },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

const unblockStudent = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a student');
  }
  if (user.status === USER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Student is already active');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.ACTIVE },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

// ============ ADMIN: TUTOR MANAGEMENT ============

const getAllTutors = async (query: Record<string, unknown>) => {
  const tutorQuery = new QueryBuilder(
    User.find({ role: USER_ROLES.TUTOR })
      .select('-password -authentication')
      .populate({
        path: 'tutorProfile.subjects',
        select: 'name _id',
      }),
    query
  )
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const tutors = await tutorQuery.modelQuery;
  const paginationInfo = await tutorQuery.getPaginationInfo();

  return {
    pagination: paginationInfo,
    data: tutors,
  };
};

const blockTutor = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a tutor');
  }
  if (user.status === USER_STATUS.RESTRICTED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tutor is already blocked');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.RESTRICTED },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

const unblockTutor = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a tutor');
  }
  if (user.status === USER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Tutor is already active');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status: USER_STATUS.ACTIVE },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

const updateTutorSubjects = async (id: string, subjects: string[]) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a tutor');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { 'tutorProfile.subjects': subjects },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

/**
 * Admin: Update tutor profile (without password)
 * Admin can update all tutor fields except password
 */
interface AdminUpdateTutorPayload {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  tutorProfile?: {
    address?: string;
    birthDate?: string;
    bio?: string;
    languages?: string[];
    teachingExperience?: string;
    education?: string;
    subjects?: string[];
  };
}

const adminUpdateTutorProfile = async (
  id: string,
  payload: AdminUpdateTutorPayload
) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a tutor');
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  // Update basic fields
  if (payload.name) updateData.name = payload.name;
  if (payload.email) updateData.email = payload.email;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.dateOfBirth) updateData.dateOfBirth = payload.dateOfBirth;
  if (payload.location) updateData.location = payload.location;

  // Update tutor profile fields
  if (payload.tutorProfile) {
    const tp = payload.tutorProfile;
    if (tp.address !== undefined) updateData['tutorProfile.address'] = tp.address;
    if (tp.birthDate !== undefined) updateData['tutorProfile.birthDate'] = tp.birthDate;
    if (tp.bio !== undefined) updateData['tutorProfile.bio'] = tp.bio;
    if (tp.languages !== undefined) updateData['tutorProfile.languages'] = tp.languages;
    if (tp.teachingExperience !== undefined) updateData['tutorProfile.teachingExperience'] = tp.teachingExperience;
    if (tp.education !== undefined) updateData['tutorProfile.education'] = tp.education;
    if (tp.subjects !== undefined) updateData['tutorProfile.subjects'] = tp.subjects;
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  )
    .select('-password -authentication')
    .populate({
      path: 'tutorProfile.subjects',
      select: 'name _id',
    });

  return updatedUser;
};

/**
 * Admin: Update student profile (without password)
 * Admin can update all student fields except password
 */
interface AdminUpdateStudentPayload {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: string;
}

const adminUpdateStudentProfile = async (
  id: string,
  payload: AdminUpdateStudentPayload
) => {
  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  if (user.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User is not a student');
  }

  // Build update object
  const updateData: Record<string, unknown> = {};

  // Update basic fields
  if (payload.name) updateData.name = payload.name;
  if (payload.email) updateData.email = payload.email;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.dateOfBirth) updateData.dateOfBirth = payload.dateOfBirth;
  if (payload.location) updateData.location = payload.location;

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

// ============ TUTOR STATISTICS ============

/**
 * Calculate tutor level based on completed sessions
 */
const calculateTutorLevel = (completedSessions: number): TUTOR_LEVEL => {
  if (completedSessions >= 51) {
    return TUTOR_LEVEL.EXPERT;
  } else if (completedSessions >= 21) {
    return TUTOR_LEVEL.INTERMEDIATE;
  }
  return TUTOR_LEVEL.STARTER;
};

/**
 * Get sessions to next level
 */
const getSessionsToNextLevel = (
  completedSessions: number,
  currentLevel: TUTOR_LEVEL
): number | null => {
  switch (currentLevel) {
    case TUTOR_LEVEL.STARTER:
      return 21 - completedSessions; // Need 21 for INTERMEDIATE
    case TUTOR_LEVEL.INTERMEDIATE:
      return 51 - completedSessions; // Need 51 for EXPERT
    case TUTOR_LEVEL.EXPERT:
      return null; // Already at max level
    default:
      return null;
  }
};

type TutorStatisticsResponse = {
  // Level info
  currentLevel: TUTOR_LEVEL;
  sessionsToNextLevel: number | null;
  nextLevel: TUTOR_LEVEL | null;

  // Session stats
  totalSessions: number;
  completedSessions: number;
  totalHoursTaught: number;
  totalStudents: number;

  // Ratings
  averageRating: number;
  ratingsCount: number;

  // Earnings
  totalEarnings: number;
  pendingEarnings: number;

  // Feedback
  pendingFeedbackCount: number;
  overdueFeedbackCount: number;
};

/**
 * Get comprehensive tutor statistics
 */
const getTutorStatistics = async (tutorId: string): Promise<TutorStatisticsResponse> => {
  // Verify tutor exists
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  // Get session stats
  const sessionStats = await Session.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', SESSION_STATUS.COMPLETED] }, 1, 0] },
        },
        totalHours: {
          $sum: {
            $cond: [
              { $eq: ['$status', SESSION_STATUS.COMPLETED] },
              { $divide: ['$duration', 60] },
              0,
            ],
          },
        },
        uniqueStudents: { $addToSet: '$studentId' },
      },
    },
    {
      $project: {
        totalSessions: 1,
        completedSessions: 1,
        totalHours: 1,
        totalStudents: { $size: '$uniqueStudents' },
      },
    },
  ]);

  const stats = sessionStats[0] || {
    totalSessions: 0,
    completedSessions: 0,
    totalHours: 0,
    totalStudents: 0,
  };

  // Get earnings
  const earningsStats = await TutorEarnings.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
      },
    },
    {
      $group: {
        _id: null,
        totalEarnings: {
          $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$netEarnings', 0] },
        },
        pendingEarnings: {
          $sum: {
            $cond: [{ $in: ['$status', ['PENDING', 'PROCESSING']] }, '$netEarnings', 0],
          },
        },
      },
    },
  ]);

  const earnings = earningsStats[0] || {
    totalEarnings: 0,
    pendingEarnings: 0,
  };

  // Get pending feedback count
  const pendingFeedbackCount = await TutorSessionFeedback.countDocuments({
    tutorId: new Types.ObjectId(tutorId),
    status: FEEDBACK_STATUS.PENDING,
  });

  // Get overdue feedback count
  const now = new Date();
  const overdueFeedbackCount = await TutorSessionFeedback.countDocuments({
    tutorId: new Types.ObjectId(tutorId),
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lt: now },
  });

  // Calculate level
  const currentLevel = calculateTutorLevel(stats.completedSessions);
  const sessionsToNextLevel = getSessionsToNextLevel(stats.completedSessions, currentLevel);

  // Determine next level
  let nextLevel: TUTOR_LEVEL | null = null;
  if (currentLevel === TUTOR_LEVEL.STARTER) {
    nextLevel = TUTOR_LEVEL.INTERMEDIATE;
  } else if (currentLevel === TUTOR_LEVEL.INTERMEDIATE) {
    nextLevel = TUTOR_LEVEL.EXPERT;
  }

  return {
    currentLevel,
    sessionsToNextLevel,
    nextLevel,
    totalSessions: stats.totalSessions,
    completedSessions: stats.completedSessions,
    totalHoursTaught: Math.round(stats.totalHours * 10) / 10,
    totalStudents: stats.totalStudents,
    averageRating: tutor.averageRating || 0,
    ratingsCount: tutor.ratingsCount || 0,
    totalEarnings: earnings.totalEarnings,
    pendingEarnings: earnings.pendingEarnings,
    pendingFeedbackCount,
    overdueFeedbackCount,
  };
};

/**
 * Update tutor level after session completion
 */
const updateTutorLevelAfterSession = async (tutorId: string): Promise<void> => {
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    return;
  }

  // Get completed sessions count
  const completedSessions = await Session.countDocuments({
    tutorId: new Types.ObjectId(tutorId),
    status: SESSION_STATUS.COMPLETED,
  });

  // Calculate new level
  const newLevel = calculateTutorLevel(completedSessions);

  // Update if level changed
  if (tutor.tutorProfile?.level !== newLevel) {
    await User.findByIdAndUpdate(tutorId, {
      'tutorProfile.level': newLevel,
      'tutorProfile.levelUpdatedAt': new Date(),
      'tutorProfile.completedSessions': completedSessions,
    });
  } else {
    // Just update the session count
    await User.findByIdAndUpdate(tutorId, {
      'tutorProfile.completedSessions': completedSessions,
    });
  }
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateProfileToDB,
  getAllUsers,
  resendVerifyEmailToDB,
  updateUserStatus,
  getUserById,
  getUserDetailsById,
  // Admin: Student Management
  getAllStudents,
  blockStudent,
  unblockStudent,
  adminUpdateStudentProfile,
  // Admin: Tutor Management
  getAllTutors,
  blockTutor,
  unblockTutor,
  updateTutorSubjects,
  adminUpdateTutorProfile,
  // Tutor Statistics
  getTutorStatistics,
  updateTutorLevelAfterSession,
  calculateTutorLevel,
};
