import { model, Schema } from 'mongoose';
import {
  ISession,
  SessionModel,
  SESSION_STATUS,
  RESCHEDULE_STATUS,
  PAYMENT_STATUS,
  COMPLETION_STATUS,
} from './session.interface';

// Attendance tracking sub-schema
const attendanceSchema = new Schema(
  {
    odId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    firstJoinedAt: {
      type: Date,
    },
    lastLeftAt: {
      type: Date,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    joinCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// Reschedule request sub-schema
const rescheduleRequestSchema = new Schema(
  {
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: {
      type: Date,
      required: true,
    },
    newStartTime: {
      type: Date,
      required: true,
    },
    newEndTime: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(RESCHEDULE_STATUS),
      default: RESCHEDULE_STATUS.PENDING,
    },
    respondedAt: {
      type: Date,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: false }
);

const sessionSchema = new Schema<ISession>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tutor ID is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      default: 60, // Fixed 60 minutes
    },
    bufferMinutes: {
      type: Number,
      default: 10, // 10 minutes extra buffer
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'], // EUR
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'], // EUR
    },
    bufferPrice: {
      type: Number,
      default: 0, // Price for buffer time
    },
    googleMeetLink: {
      type: String,
    },
    googleCalendarEventId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'SessionReview',
    },
    tutorFeedbackId: {
      type: Schema.Types.ObjectId,
      ref: 'TutorSessionFeedback',
    },
    trialRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'TrialRequest',
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    // Reschedule fields
    rescheduleRequest: rescheduleRequestSchema,
    previousStartTime: {
      type: Date,
    },
    previousEndTime: {
      type: Date,
    },
    // Cancellation fields
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Timestamp fields
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    expiredAt: {
      type: Date,
    },
    // Attendance tracking fields
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
    },
    tutorAttendance: attendanceSchema,
    studentAttendance: attendanceSchema,
    noShowBy: {
      type: String,
      enum: ['tutor', 'student'],
    },

    // Student completion tracking
    studentCompletionStatus: {
      type: String,
      enum: Object.values(COMPLETION_STATUS),
      default: COMPLETION_STATUS.NOT_APPLICABLE,
    },
    studentCompletedAt: {
      type: Date,
    },
    studentJoined: {
      type: Boolean,
      default: false,
    },

    // Teacher completion tracking
    teacherCompletionStatus: {
      type: String,
      enum: Object.values(COMPLETION_STATUS),
      default: COMPLETION_STATUS.NOT_APPLICABLE,
    },
    teacherCompletedAt: {
      type: Date,
    },
    teacherJoined: {
      type: Boolean,
      default: false,
    },
    teacherFeedbackRequired: {
      type: Boolean,
      default: false,
    },

    // Billing tracking (for monthly invoicing)
    isPaidUpfront: {
      type: Boolean,
      default: false,  // True if covered by subscription upfront payment
    },
    billingId: {
      type: Schema.Types.ObjectId,
      ref: 'MonthlyBilling',
    },
    billedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
sessionSchema.index({ studentId: 1, createdAt: -1 });
sessionSchema.index({ tutorId: 1, createdAt: -1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ startTime: 1, endTime: 1 });
sessionSchema.index({ chatId: 1 });
sessionSchema.index({ trialRequestId: 1 });

// Compound index for upcoming sessions
sessionSchema.index({ status: 1, startTime: 1 });

// Index for status transitions (cron jobs)
sessionSchema.index({ status: 1, endTime: 1 });

// Index for call-based lookups
sessionSchema.index({ callId: 1 });

// Indexes for completion status queries (billing/earnings)
sessionSchema.index({ studentCompletionStatus: 1, studentCompletedAt: 1 });
sessionSchema.index({ teacherCompletionStatus: 1, teacherCompletedAt: 1 });

// Index for billing queries (sessions not yet billed)
sessionSchema.index({ isPaidUpfront: 1, billingId: 1, studentCompletionStatus: 1 });

// Validate endTime is after startTime
sessionSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Calculate total price if not provided
// Fixed price per session (not based on duration)
// 1 session = 1 session price, regardless of duration
sessionSchema.pre('save', function (next) {
  if (!this.totalPrice && this.pricePerHour && this.duration) {
    this.totalPrice = this.pricePerHour;
  }
  // Calculate buffer price
  if (!this.bufferPrice && this.pricePerHour && this.bufferMinutes) {
    this.bufferPrice = (this.pricePerHour * this.bufferMinutes) / 60;
  }
  next();
});

export const Session = model<ISession, SessionModel>('Session', sessionSchema);