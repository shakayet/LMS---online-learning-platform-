import { model, Schema } from 'mongoose';
import {
  ITutorSessionFeedback,
  TutorSessionFeedbackModel,
  FEEDBACK_TYPE,
  FEEDBACK_STATUS,
} from './tutorSessionFeedback.interface';

const tutorSessionFeedbackSchema = new Schema<ITutorSessionFeedback>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session ID is required'],
      unique: true, // One feedback per session
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tutor ID is required'],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    feedbackType: {
      type: String,
      enum: Object.values(FEEDBACK_TYPE),
      required: [true, 'Feedback type is required'],
    },
    feedbackText: {
      type: String,
      trim: true,
      minlength: [10, 'Feedback text must be at least 10 characters'],
      maxlength: [2000, 'Feedback text cannot exceed 2000 characters'],
    },
    feedbackAudioUrl: {
      type: String,
      trim: true,
    },
    audioDuration: {
      type: Number,
      max: [60, 'Audio duration cannot exceed 60 seconds'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    submittedAt: {
      type: Date,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(FEEDBACK_STATUS),
      default: FEEDBACK_STATUS.PENDING,
    },

    // Payment forfeit tracking
    paymentForfeited: {
      type: Boolean,
      default: false,
    },
    forfeitedAmount: {
      type: Number,
    },
    forfeitedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
tutorSessionFeedbackSchema.index({ tutorId: 1, status: 1 });
tutorSessionFeedbackSchema.index({ studentId: 1, createdAt: -1 });
tutorSessionFeedbackSchema.index({ sessionId: 1 }, { unique: true });
tutorSessionFeedbackSchema.index({ status: 1, dueDate: 1 }); // For finding pending feedbacks due soon
tutorSessionFeedbackSchema.index({ tutorId: 1, dueDate: 1 }); // For tutor's pending feedbacks
tutorSessionFeedbackSchema.index({ paymentForfeited: 1, forfeitedAt: 1 }); // For forfeit queries

// Pre-save validation for feedback type
tutorSessionFeedbackSchema.pre('save', function (next) {
  if (this.feedbackType === FEEDBACK_TYPE.TEXT && !this.feedbackText) {
    next(new Error('Feedback text is required for TEXT feedback type'));
  } else if (this.feedbackType === FEEDBACK_TYPE.AUDIO && !this.feedbackAudioUrl) {
    next(new Error('Audio URL is required for AUDIO feedback type'));
  } else {
    next();
  }
});

// Check if late when submitting
tutorSessionFeedbackSchema.pre('save', function (next) {
  if (this.status === FEEDBACK_STATUS.SUBMITTED && this.submittedAt && this.dueDate) {
    this.isLate = this.submittedAt > this.dueDate;
  }
  next();
});

export const TutorSessionFeedback = model<ITutorSessionFeedback, TutorSessionFeedbackModel>(
  'TutorSessionFeedback',
  tutorSessionFeedbackSchema
);