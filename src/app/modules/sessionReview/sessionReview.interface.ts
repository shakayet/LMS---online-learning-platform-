import { Model, Types } from 'mongoose';

export type ISessionReview = {
  sessionId?: Types.ObjectId | null;
  studentId?: Types.ObjectId | null;
  tutorId: Types.ObjectId;

  overallRating: number;
  teachingQuality: number;
  communication: number;
  punctuality: number;
  preparedness: number;

  comment?: string;
  wouldRecommend: boolean;

  isPublic: boolean;
  isEdited: boolean;
  editedAt?: Date;

  isAdminCreated?: boolean;
  reviewerName?: string;
};

export type SessionReviewModel = Model<ISessionReview>;

export type IReviewStats = {
  tutorId: Types.ObjectId;
  totalReviews: number;
  averageOverallRating: number;
  averageTeachingQuality: number;
  averageCommunication: number;
  averagePunctuality: number;
  averagePreparedness: number;
  wouldRecommendPercentage: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
};
