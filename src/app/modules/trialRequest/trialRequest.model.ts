import { model, Schema } from 'mongoose';
import {
  ITrialRequest,
  REQUEST_TYPE,
  TrialRequestModel,
  TRIAL_REQUEST_STATUS,
} from './trialRequest.interface';

// Guardian info sub-schema (nested inside studentInfo)
const guardianInfoSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Guardian email is required'],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Guardian password is required'],
    },
    phone: {
      type: String,
      required: [true, 'Guardian phone number is required'],
      trim: true,
    },
  },
  { _id: false }
);

// Student info sub-schema (with nested guardianInfo)
// If under 18: only name required, email/password comes from guardian
// If 18+: email and password required for the student
const studentInfoSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      // Required only if 18+ (validated in pre-save hook)
    },
    password: {
      type: String,
      // Required only if 18+ (validated in pre-save hook)
    },
    isUnder18: {
      type: Boolean,
      required: [true, 'Age verification is required'],
      default: false,
    },
    dateOfBirth: {
      type: Date,
    },
    // Guardian info nested inside studentInfo (required if under 18)
    guardianInfo: {
      type: guardianInfoSchema,
    },
  },
  { _id: false }
);

const trialRequestSchema = new Schema<ITrialRequest>(
  {
    // Request type (for unified view)
    requestType: {
      type: String,
      enum: Object.values(REQUEST_TYPE),
      default: REQUEST_TYPE.TRIAL,
    },

    // Student reference (optional - for registered users)
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Student Information (Required)
    studentInfo: {
      type: studentInfoSchema,
      required: [true, 'Student information is required'],
    },

    // Academic Information (Required)
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    gradeLevel: {
      type: String,
      required: [true, 'Grade level is required'],
      trim: true,
    },
    schoolType: {
      type: String,
      required: [true, 'School type is required'],
      trim: true,
    },

    // Learning Details
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    learningGoals: {
      type: String,
      trim: true,
      maxlength: [1000, 'Learning goals cannot exceed 1000 characters'],
    },
    preferredLanguage: {
      type: String,
      enum: ['ENGLISH', 'GERMAN'],
      required: [true, 'Preferred language is required'],
    },
    preferredDateTime: {
      type: Date,
    },

    // Documents (Optional)
    documents: [
      {
        type: String,
        trim: true,
      },
    ],

    // Request Status
    status: {
      type: String,
      enum: Object.values(TRIAL_REQUEST_STATUS),
      default: TRIAL_REQUEST_STATUS.PENDING,
    },

    // Matching details
    acceptedTutorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },

    // Timestamps & Expiration
    expiresAt: {
      type: Date,
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 7); // 7 days from now
        return date;
      },
    },
    acceptedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },

    // Extension tracking
    isExtended: {
      type: Boolean,
      default: false,
    },
    extensionCount: {
      type: Number,
      default: 0,
    },
    reminderSentAt: {
      type: Date, // When reminder email was sent (after 7 days)
    },
    finalExpiresAt: {
      type: Date, // 2-3 days after reminder if no response, auto-delete
    },

    // Metadata
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
trialRequestSchema.index({ studentId: 1 });
trialRequestSchema.index({ 'studentInfo.email': 1 });
trialRequestSchema.index({ subject: 1 });
trialRequestSchema.index({ gradeLevel: 1 });
trialRequestSchema.index({ schoolType: 1 });
trialRequestSchema.index({ status: 1 });
trialRequestSchema.index({ expiresAt: 1 });
trialRequestSchema.index({ acceptedTutorId: 1 });
trialRequestSchema.index({ createdAt: -1 }); // Latest first

// Compound index for tutor matching queries
trialRequestSchema.index({ status: 1, subject: 1, expiresAt: 1 });


// Pre-save: Validate based on age
// Under 18: guardian info required, student email/password not needed
// 18+: student email/password required, guardian info not needed
trialRequestSchema.pre('save', function (next) {
  const studentInfo = this.studentInfo;

  if (studentInfo?.isUnder18) {
    // Under 18: Guardian info is required
    if (!studentInfo?.guardianInfo) {
      const error = new Error(
        'Guardian information is required for students under 18'
      );
      return next(error);
    }
  } else {
    // 18+: Student email and password are required
    if (!studentInfo?.email) {
      const error = new Error('Email is required for students 18 and above');
      return next(error);
    }
    if (!studentInfo?.password) {
      const error = new Error('Password is required for students 18 and above');
      return next(error);
    }
  }
  next();
});

export const TrialRequest = model<ITrialRequest, TrialRequestModel>(
  'TrialRequest',
  trialRequestSchema
);