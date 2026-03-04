import { model, Schema } from 'mongoose';
import {
  APPLICATION_STATUS,
  ITutorApplication,
  TutorApplicationModel,
} from './tutorApplication.interface';

const tutorApplicationSchema = new Schema<ITutorApplication>(
  {
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
      },
    ],

    // Personal Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required'],
    },

    // Address (structured fields)
    street: {
      type: String,
      required: [true, 'Street is required'],
      trim: true,
    },
    houseNumber: {
      type: String,
      required: [true, 'House number is required'],
      trim: true,
    },
    zip: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },

    // Documents (all mandatory)
    cv: {
      type: String,
      required: [true, 'CV is required'],
    },
    abiturCertificate: {
      type: String,
      required: [true, 'Abitur certificate is required'],
    },
    officialId: {
      type: String,
      required: [true, 'Official ID document is required'],
    },

    // Status Tracking (simple - no phases)
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.SUBMITTED,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    revisionNote: {
      type: String,
      trim: true,
    },

    // Interview cancellation (by admin)
    interviewCancelledReason: {
      type: String,
      trim: true,
    },
    interviewCancelledAt: {
      type: Date,
    },

    // Admin Notes
    adminNotes: {
      type: String,
      trim: true,
    },

    // Timestamps
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    resubmittedAt: {
      type: Date,
    },
    selectedForInterviewAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    revisionRequestedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for performance
tutorApplicationSchema.index({ email: 1 });
tutorApplicationSchema.index({ status: 1 });
tutorApplicationSchema.index({ submittedAt: -1 });

export const TutorApplication = model<ITutorApplication, TutorApplicationModel>(
  'TutorApplication',
  tutorApplicationSchema
);
