import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { IUser, UserModal, USER_ROLES, USER_STATUS } from './user.interface';

const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // hide password by default
    },
    location: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
    },
    dateOfBirth: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: 'https://i.ibb.co/z5YHLV9/profile.png',
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    deviceTokens: {
      type: [String],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    about: {
      type: String,
    },
    achievements: {
      type: [String],
      default: [],
    },

    // Student Profile (for STUDENT role)
    studentProfile: {
      type: {
        schoolType: String,
        grade: String,
        subjects: [String],
        preferredGender: String,
        preferredAgeRange: String,
        hasUsedFreeTrial: {
          type: Boolean,
          default: false,
        },
        hasCompletedTrial: {
          type: Boolean,
          default: false,
        },
        trialRequestsCount: {
          type: Number,
          default: 0,
        },
        sessionRequestsCount: {
          type: Number,
          default: 0,
        },
        currentPlan: {
          type: String,
          enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM', null],
          default: null,
        },
        totalHoursTaken: {
          type: Number,
          default: 0,
        },
        totalSpent: {
          type: Number,
          default: 0,
        },
        stripeCustomerId: {
          type: String,
        },
        subscriptionTier: {
          type: String,
          enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM', null],
          default: null,
        },
      },
      default: undefined, // Only set for STUDENT role
    },

    // Tutor Profile (for TUTOR/APPLICANT role)
    tutorProfile: {
      type: {
        address: String,
        birthDate: Date,
        subjects: [
          {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
          },
        ],
        bio: String,
        languages: [String],
        teachingExperience: String,
        education: String,
        cvUrl: String,
        abiturCertificateUrl: String,
        educationProofUrls: [String],
        totalSessions: {
          type: Number,
          default: 0,
        },
        completedSessions: {
          type: Number,
          default: 0,
        },
        totalHoursTaught: {
          type: Number,
          default: 0,
        },
        totalStudents: {
          type: Number,
          default: 0,
        },
        // Level System
        level: {
          type: String,
          enum: ['STARTER', 'INTERMEDIATE', 'EXPERT'],
          default: 'STARTER',
        },
        levelUpdatedAt: {
          type: Date,
        },
        // Earnings
        totalEarnings: {
          type: Number,
          default: 0,
        },
        pendingFeedbackCount: {
          type: Number,
          default: 0,
        },
        // Payout Settings
        payoutRecipient: {
          type: String,
        },
        payoutIban: {
          type: String,
        },
        isVerified: {
          type: Boolean,
          default: false,
        },
        verificationStatus: {
          type: String,
          enum: ['PENDING', 'DOCUMENT_APPROVED', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED'],
          default: 'PENDING',
        },
        onboardingPhase: {
          type: Number,
          enum: [1, 2, 3],
          default: 1,
        },
        stripeConnectAccountId: String,
        stripeOnboardingCompleted: {
          type: Boolean,
          default: false,
        },
      },
      default: undefined, // Only set for TUTOR/APPLICANT role
    },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: false, // hide auth info by default
    },
  },
  { timestamps: true }
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  //check user - exclude current user from email uniqueness check
  const isExist = await User.findOne({ 
    email: this.email,
    _id: { $ne: this._id } // exclude current user
  });
  if (isExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
  }

  //password hash
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds)
  );
  next();
});

// ✅ add device token
userSchema.statics.addDeviceToken = async (userId: string, token: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { $addToSet: { deviceTokens: token } }, // prevent duplicates
    { new: true }
  );
};

// ✅ remove device token
userSchema.statics.removeDeviceToken = async (
  userId: string,
  token: string
) => {
  return await User.findByIdAndUpdate(
    userId,
    { $pull: { deviceTokens: token } },
    { new: true }
  );
};

export const User = model<IUser, UserModal>('User', userSchema);
