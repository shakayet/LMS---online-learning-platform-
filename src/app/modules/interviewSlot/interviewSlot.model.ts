import { model, Schema } from 'mongoose';
import {
  IInterviewSlot,
  InterviewSlotModel,
  INTERVIEW_SLOT_STATUS,
} from './interviewSlot.interface';

const interviewSlotSchema = new Schema<IInterviewSlot>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'TutorApplication',
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: Object.values(INTERVIEW_SLOT_STATUS),
      default: INTERVIEW_SLOT_STATUS.AVAILABLE,
    },
    agoraChannelName: {
      type: String,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    bookedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
interviewSlotSchema.index({ adminId: 1 });
interviewSlotSchema.index({ applicantId: 1 });
interviewSlotSchema.index({ applicationId: 1 });
interviewSlotSchema.index({ status: 1 });
interviewSlotSchema.index({ startTime: 1, endTime: 1 });

// Validate endTime is after startTime
interviewSlotSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Prevent overlapping slots for same admin
interviewSlotSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('startTime') || this.isModified('endTime')) {
    const InterviewSlot = this.constructor as InterviewSlotModel;
    const overlapping = await InterviewSlot.findOne({
      adminId: this.adminId,
      _id: { $ne: this._id },
      status: { $in: [INTERVIEW_SLOT_STATUS.AVAILABLE, INTERVIEW_SLOT_STATUS.BOOKED] },
      $or: [
        {
          startTime: { $lt: this.endTime },
          endTime: { $gt: this.startTime },
        },
      ],
    });

    if (overlapping) {
      next(new Error('Time slot overlaps with existing slot'));
    }
  }
  next();
});

export const InterviewSlot = model<IInterviewSlot, InterviewSlotModel>(
  'InterviewSlot',
  interviewSlotSchema
);