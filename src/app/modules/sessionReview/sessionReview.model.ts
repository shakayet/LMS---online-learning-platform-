import { model, Schema } from 'mongoose';
import { ISessionReview, SessionReviewModel } from './sessionReview.interface';

const sessionReviewSchema = new Schema<ISessionReview>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: false, // Optional for admin-created reviews
      sparse: true, // Allow multiple null values
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for admin-created reviews
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tutor ID is required'],
    },
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be between 1-5'],
      max: [5, 'Rating must be between 1-5'],
    },
    teachingQuality: {
      type: Number,
      required: [true, 'Teaching quality rating is required'],
      min: [1, 'Rating must be between 1-5'],
      max: [5, 'Rating must be between 1-5'],
    },
    communication: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: [1, 'Rating must be between 1-5'],
      max: [5, 'Rating must be between 1-5'],
    },
    punctuality: {
      type: Number,
      required: [true, 'Punctuality rating is required'],
      min: [1, 'Rating must be between 1-5'],
      max: [5, 'Rating must be between 1-5'],
    },
    preparedness: {
      type: Number,
      required: [true, 'Preparedness rating is required'],
      min: [1, 'Rating must be between 1-5'],
      max: [5, 'Rating must be between 1-5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    wouldRecommend: {
      type: Boolean,
      required: [true, 'Would recommend field is required'],
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    // Admin-created review fields
    isAdminCreated: {
      type: Boolean,
      default: false,
    },
    reviewerName: {
      type: String,
      trim: true,
      maxlength: [100, 'Reviewer name cannot exceed 100 characters'],
    },
  },
  { timestamps: true }
);

// Indexes
sessionReviewSchema.index({ tutorId: 1, createdAt: -1 });
sessionReviewSchema.index({ studentId: 1, createdAt: -1 });
sessionReviewSchema.index({ sessionId: 1 }, { unique: true, sparse: true }); // sparse allows multiple null values
sessionReviewSchema.index({ overallRating: 1 });

// Compound index for public reviews
sessionReviewSchema.index({ tutorId: 1, isPublic: 1 });
// Index for admin-created reviews
sessionReviewSchema.index({ isAdminCreated: 1 });

export const SessionReview = model<ISessionReview, SessionReviewModel>(
  'SessionReview',
  sessionReviewSchema
);
