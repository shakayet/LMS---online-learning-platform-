import { Model } from 'mongoose';

export enum USER_ROLES {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  APPLICANT = 'APPLICANT',
  GUEST = 'GUEST',
}

export enum USER_STATUS {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RESTRICTED = 'RESTRICTED',
  DELETE = 'DELETE',
}

export type AchievementType =
  | 'Founder Titne'
  | 'Fast 100 Titten'
  | 'Top Rated Tittens'
  | '100 plus Tasks Completed'
  | 'Founder Poster'
  | 'Top Rated Poster';

export enum VERIFICATION_STATUS {
  PENDING = 'PENDING',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Tutor level system based on completed sessions
export enum TUTOR_LEVEL {
  STARTER = 'STARTER',           // 0-20 completed sessions
  INTERMEDIATE = 'INTERMEDIATE', // 21-50 completed sessions
  EXPERT = 'EXPERT',             // 51+ completed sessions
}

export type StudentProfile = {
  schoolType?: string; // German school types
  grade?: string; // Which class/grade
  subjects?: string[]; // Interested subjects
  preferredGender?: string; // Male/Female/No preference
  preferredAgeRange?: string; // e.g., "20-30"
  hasUsedFreeTrial: boolean; // Track free trial usage
  hasCompletedTrial: boolean; // True after first accepted trial
  trialRequestsCount: number; // Total trial requests made
  sessionRequestsCount: number; // Total session requests made (after trial)
  currentPlan?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  totalHoursTaken: number;
  totalSpent: number;
  stripeCustomerId?: string; // Stripe customer ID for payments
};

export type TutorProfile = {
  // Basic Info
  address?: string;
  birthDate?: Date;

  // Professional
  subjects?: string[]; // Teaching subjects
  bio?: string;
  languages?: string[];
  teachingExperience?: string;
  education?: string;

  // Documents (URLs from Cloudinary/S3)
  cvUrl?: string;
  abiturCertificateUrl?: string; // MANDATORY for approval
  educationProofUrls?: string[];

  // Stats
  totalSessions: number;
  completedSessions: number;
  totalHoursTaught: number;
  totalStudents: number; // Unique students taught

  // Level System
  level: TUTOR_LEVEL;
  levelUpdatedAt?: Date;

  // Earnings (cached for quick access)
  totalEarnings: number; // Net earnings after commission
  pendingFeedbackCount: number; // Number of pending session feedbacks

  // Payout Settings
  payoutRecipient?: string; // Bank account holder name
  payoutIban?: string; // IBAN for payouts

  // Verification
  isVerified: boolean;
  verificationStatus: VERIFICATION_STATUS;
  onboardingPhase: 1 | 2 | 3; // 1=Applied, 2=Interview, 3=Approved

  // Stripe Connect
  stripeConnectAccountId?: string;
  stripeOnboardingCompleted: boolean;
};

export type IUser = {
  name: string;
  role: USER_ROLES;
  email: string;
  password: string;
  location?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  phone: string;
  profilePicture?: string;
  status: USER_STATUS;
  deviceTokens?: string[];
  averageRating: number;
  ratingsCount: number;
  about?: string;
  achievements?: AchievementType[];

  // Role-specific profiles
  studentProfile?: StudentProfile;
  tutorProfile?: TutorProfile;

  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserModal = {
  isExistUserById(id: string): any;
  isExistUserByEmail(email: string): any;
  isMatchPassword(password: string, hashPassword: string): boolean;

  addDeviceToken(userId: string, token: string): Promise<IUser | null>;
  removeDeviceToken(userId: string, token: string): Promise<IUser | null>;
} & Model<IUser>;
