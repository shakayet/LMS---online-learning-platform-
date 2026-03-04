import { Model, Types } from 'mongoose';

export type ISessionReview = {
  sessionId?: Types.ObjectId | null;  // Optional for admin-created reviews
  studentId?: Types.ObjectId | null;  // Optional for admin-created reviews
  tutorId: Types.ObjectId;

  // Ratings (1-5 scale)
  overallRating: number;        // Overall experience (required)
  teachingQuality: number;      // How well the tutor explained concepts
  communication: number;        // Clarity and responsiveness
  punctuality: number;          // On-time arrival
  preparedness: number;         // Tutor's preparation for session

  // Optional feedback
  comment?: string;             // Written review
  wouldRecommend: boolean;      // Would recommend this tutor

  // Metadata
  isPublic: boolean;            // Show publicly on tutor profile
  isEdited: boolean;            // Has been edited after submission
  editedAt?: Date;

  // Admin-created review fields
  isAdminCreated?: boolean;     // True if created by admin without session
  reviewerName?: string;        // Custom reviewer name for admin-created reviews
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
