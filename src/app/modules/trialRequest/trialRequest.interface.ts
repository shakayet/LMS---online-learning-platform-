import { Model, Types } from 'mongoose';

export enum TRIAL_REQUEST_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED', // Tutor accepted, chat opened
  EXPIRED = 'EXPIRED', // No tutor accepted within time limit
  CANCELLED = 'CANCELLED', // Student cancelled before acceptance
}

// Request type to distinguish between trial and session requests in unified view
export enum REQUEST_TYPE {
  TRIAL = 'TRIAL',
  SESSION = 'SESSION',
}

// School types - now dynamic, managed from admin dashboard
// Values come from SchoolType collection

// Grade levels - now dynamic, managed from admin dashboard
// Values come from Grade collection

// Guardian info for students under 18 (nested inside studentInfo)
export type IGuardianInfo = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

// Student info collected during trial request
// If under 18: only name required, email/password comes from guardian
// If 18+: email and password required for the student
export type IStudentInfo = {
  name: string; // Full name (always required)
  email?: string; // Required only if 18+ (student's own email)
  password?: string; // Required only if 18+ (student's own password)
  isUnder18: boolean;
  dateOfBirth?: Date;
  // Guardian info nested inside studentInfo (required if under 18)
  guardianInfo?: IGuardianInfo;
};

export type ITrialRequest = {
  // Request type (for unified view)
  requestType: REQUEST_TYPE;

  // Student reference (if already registered user)
  studentId?: Types.ObjectId;

  // Student Information (Required) - collected during trial request
  studentInfo: IStudentInfo;

  // Academic Information (Required)
  subject: Types.ObjectId; // Reference to Subject collection
  gradeLevel: string; // Dynamic - from Grade collection
  schoolType: string; // Dynamic - from SchoolType collection

  // Learning Details
  description: string; // What student needs help with
  learningGoals?: string; // Optional: Specific learning goals
  preferredLanguage: 'ENGLISH' | 'GERMAN';
  preferredDateTime?: Date; // Optional: When student wants trial

  // Documents (Optional)
  documents?: string[]; // Array of document URLs (uploaded files)

  // Request Status
  status: TRIAL_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: Types.ObjectId; // Tutor who accepted
  chatId?: Types.ObjectId; // Created chat when accepted

  // Timestamps & Expiration
  expiresAt: Date; // Auto-expire after 7 days
  acceptedAt?: Date;
  cancelledAt?: Date;

  // Extension tracking
  isExtended?: boolean; // Whether student requested extension
  extensionCount?: number; // How many times extended (max 1)
  reminderSentAt?: Date; // When 7-day reminder was sent
  finalExpiresAt?: Date; // 2-3 days after reminder, auto-delete if no response

  // Metadata
  cancellationReason?: string;
};

export type TrialRequestModel = Model<ITrialRequest>;
