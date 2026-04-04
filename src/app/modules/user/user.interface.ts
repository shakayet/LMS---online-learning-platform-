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

export enum TUTOR_LEVEL {
  STARTER = 'STARTER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
}

export type StudentProfile = {
  schoolType?: string;
  grade?: string;
  subjects?: string[];
  preferredGender?: string;
  preferredAgeRange?: string;
  hasUsedFreeTrial: boolean;
  hasCompletedTrial: boolean;
  trialRequestsCount: number;
  sessionRequestsCount: number;
  currentPlan?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | null;
  totalHoursTaken: number;
  totalSpent: number;
  stripeCustomerId?: string;
};

export type TutorProfile = {

  address?: string;
  birthDate?: Date;

  subjects?: string[];
  bio?: string;
  languages?: string[];
  teachingExperience?: string;
  education?: string;

  cvUrl?: string;
  abiturCertificateUrl?: string;
  educationProofUrls?: string[];

  totalSessions: number;
  completedSessions: number;
  totalHoursTaught: number;
  totalStudents: number;

  level: TUTOR_LEVEL;
  levelUpdatedAt?: Date;

  totalEarnings: number;
  pendingFeedbackCount: number;

  payoutRecipient?: string;
  payoutIban?: string;

  isVerified: boolean;
  verificationStatus: VERIFICATION_STATUS;
  onboardingPhase: 1 | 2 | 3;

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

  studentProfile?: StudentProfile;
  tutorProfile?: TutorProfile;

  authentication?: {
    isResetPassword: boolean;
    oneTimeCode: number;
    expireAt: Date;
  };

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
