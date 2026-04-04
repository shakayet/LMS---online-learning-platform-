import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { SessionReview } from './sessionReview.model';
import { ISessionReview, IReviewStats } from './sessionReview.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS } from '../session/session.interface';
import QueryBuilder from '../../builder/QueryBuilder';

const createReview = async (
  studentId: string,
  payload: Partial<ISessionReview>
): Promise<ISessionReview> => {

  const session = await Session.findById(payload.sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status !== SESSION_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Can only review completed sessions'
    );
  }

  if (session.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only review your own sessions'
    );
  }

  const existingReview = await SessionReview.findOne({
    sessionId: payload.sessionId,
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Review already exists for this session'
    );
  }

  const review = await SessionReview.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    tutorId: session.tutorId,
  });

  await Session.findByIdAndUpdate(payload.sessionId, {
    reviewId: review._id,
  });

  const io = global.io;
  if (io && session.chatId) {
    const chatIdStr = String(session.chatId);
    const reviewPayload = {
      sessionId: payload.sessionId,
      chatId: chatIdStr,
      reviewId: review._id,
      rating: review.overallRating,
    };

    io.to(`chat::${chatIdStr}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);
    io.to(`user::${studentId}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);
    io.to(`user::${String(session.tutorId)}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);

    console.log(`[Socket Emit] STUDENT_REVIEW_SUBMITTED sent for session ${payload.sessionId}`);
  }

  return review;
};

const getMyReviews = async (studentId: string, query: Record<string, unknown>) => {
  const reviewQuery = new QueryBuilder(
    SessionReview.find({ studentId })
      .populate('sessionId', 'subject startTime endTime')
      .populate('tutorId', 'name email'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.getPaginationInfo();

  return { data: result, meta };
};

const getTutorReviews = async (
  tutorId: string,
  query: Record<string, unknown>,
  isAdmin: boolean = false
) => {
  const baseQuery = isAdmin
    ? { tutorId }
    : { tutorId, isPublic: true };

  const reviewQuery = new QueryBuilder(
    SessionReview.find(baseQuery)
      .populate('studentId', 'name')
      .populate('sessionId', 'subject startTime'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await reviewQuery.modelQuery;
  const meta = await reviewQuery.getPaginationInfo();

  return { data: result, meta };
};

const getReviewBySession = async (sessionId: string): Promise<ISessionReview | null> => {
  const review = await SessionReview.findOne({ sessionId })
    .populate('studentId', 'name email')
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime endTime');

  return review;
};

const getSingleReview = async (id: string): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id)
    .populate('studentId', 'name email')
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime endTime');

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  return review;
};

const updateReview = async (
  id: string,
  studentId: string,
  payload: Partial<ISessionReview>
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.studentId?.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only update your own reviews'
    );
  }

  Object.assign(review, payload);
  review.isEdited = true;
  review.editedAt = new Date();

  await review.save();

  return review;
};

const deleteReview = async (
  id: string,
  studentId: string
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.studentId?.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only delete your own reviews'
    );
  }

  await SessionReview.findByIdAndDelete(id);

  return review;
};

const getTutorStats = async (tutorId: string): Promise<IReviewStats> => {
  const reviews = await SessionReview.find({ tutorId, isPublic: true });

  if (reviews.length === 0) {
    return {
      tutorId: new Types.ObjectId(tutorId),
      totalReviews: 0,
      averageOverallRating: 0,
      averageTeachingQuality: 0,
      averageCommunication: 0,
      averagePunctuality: 0,
      averagePreparedness: 0,
      wouldRecommendPercentage: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const totalReviews = reviews.length;

  const averageOverallRating =
    reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;
  const averageTeachingQuality =
    reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / totalReviews;
  const averageCommunication =
    reviews.reduce((sum, r) => sum + r.communication, 0) / totalReviews;
  const averagePunctuality =
    reviews.reduce((sum, r) => sum + r.punctuality, 0) / totalReviews;
  const averagePreparedness =
    reviews.reduce((sum, r) => sum + r.preparedness, 0) / totalReviews;

  const wouldRecommendCount = reviews.filter(r => r.wouldRecommend).length;
  const wouldRecommendPercentage = (wouldRecommendCount / totalReviews) * 100;

  const ratingDistribution = reviews.reduce(
    (dist, r) => {
      const rating = Math.floor(r.overallRating) as 1 | 2 | 3 | 4 | 5;
      dist[rating]++;
      return dist;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );

  return {
    tutorId: new Types.ObjectId(tutorId),
    totalReviews,
    averageOverallRating: Math.round(averageOverallRating * 10) / 10,
    averageTeachingQuality: Math.round(averageTeachingQuality * 10) / 10,
    averageCommunication: Math.round(averageCommunication * 10) / 10,
    averagePunctuality: Math.round(averagePunctuality * 10) / 10,
    averagePreparedness: Math.round(averagePreparedness * 10) / 10,
    wouldRecommendPercentage: Math.round(wouldRecommendPercentage),
    ratingDistribution,
  };
};

const toggleVisibility = async (
  id: string,
  isPublic: boolean
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  review.isPublic = isPublic;
  await review.save();

  return review;
};

const linkOrphanedReviews = async (): Promise<{ linked: number; alreadyLinked: number }> => {
  const reviews = await SessionReview.find({});
  let linked = 0;
  let alreadyLinked = 0;

  for (const review of reviews) {
    const session = await Session.findById(review.sessionId);
    if (session) {
      if (!session.reviewId) {
        await Session.findByIdAndUpdate(review.sessionId, {
          reviewId: review._id,
        });
        linked++;
      } else {
        alreadyLinked++;
      }
    }
  }

  return { linked, alreadyLinked };
};

interface AdminCreateReviewPayload {
  tutorId: string;
  overallRating: number;
  teachingQuality: number;
  communication: number;
  punctuality: number;
  preparedness: number;
  comment?: string;
  wouldRecommend: boolean;
  isPublic?: boolean;
  reviewerName?: string;
}

const adminCreateReview = async (
  payload: AdminCreateReviewPayload
): Promise<ISessionReview> => {

  const { User } = await import('../user/user.model');
  const tutor = await User.findById(payload.tutorId);
  if (!tutor) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tutor not found');
  }

  const review = await SessionReview.create({
    tutorId: new Types.ObjectId(payload.tutorId),
    studentId: null,
    sessionId: null,
    overallRating: payload.overallRating,
    teachingQuality: payload.teachingQuality,
    communication: payload.communication,
    punctuality: payload.punctuality,
    preparedness: payload.preparedness,
    comment: payload.comment,
    wouldRecommend: payload.wouldRecommend,
    isPublic: payload.isPublic ?? true,
    isAdminCreated: true,
    reviewerName: payload.reviewerName,
  });

  return review;
};

const adminUpdateReview = async (
  id: string,
  payload: Partial<ISessionReview>
): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  Object.assign(review, payload);
  review.isEdited = true;
  review.editedAt = new Date();

  await review.save();

  return review;
};

const adminDeleteReview = async (id: string): Promise<ISessionReview | null> => {
  const review = await SessionReview.findById(id);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found');
  }

  if (review.sessionId) {
    await Session.findByIdAndUpdate(review.sessionId, {
      $unset: { reviewId: 1 },
    });
  }

  await SessionReview.findByIdAndDelete(id);

  return review;
};

export const SessionReviewService = {
  createReview,
  getMyReviews,
  getTutorReviews,
  getSingleReview,
  getReviewBySession,
  updateReview,
  deleteReview,
  getTutorStats,
  toggleVisibility,
  linkOrphanedReviews,

  adminCreateReview,
  adminUpdateReview,
  adminDeleteReview,
};
