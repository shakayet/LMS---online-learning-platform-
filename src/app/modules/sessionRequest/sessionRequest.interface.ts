import { Model, Types } from 'mongoose';

export enum SESSION_REQUEST_STATUS {
  PENDING = 'PENDING', // Student sent request, waiting for tutor
  ACCEPTED = 'ACCEPTED', // Tutor accepted, chat opened
  EXPIRED = 'EXPIRED', // No tutor accepted within time limit
  CANCELLED = 'CANCELLED', // Student cancelled before acceptance
}

// Reuse REQUEST_TYPE from trialRequest for consistency
// Note: SCHOOL_TYPE and GRADE_LEVEL are now dynamic strings (no longer enums)
export { REQUEST_TYPE } from '../trialRequest/trialRequest.interface';

export type ISessionRequest = {
  // Request type (for unified view)
  requestType: 'TRIAL' | 'SESSION';

  // Student reference (Required - must be logged in)
  studentId: Types.ObjectId;

  // Academic Information (Required)
  subject: Types.ObjectId; // Reference to Subject collection
  gradeLevel: string; // Using string to match GRADE_LEVEL enum values
  schoolType: string; // Using string to match SCHOOL_TYPE enum values

  // Learning Details (simplified - no description or preferredDateTime for session requests)
  description?: string; // Optional: What student needs help with
  learningGoals?: string; // Optional: Specific learning goals

  // Documents (Optional)
  documents?: string[]; // Array of document URLs (uploaded files)

  // Request Status
  status: SESSION_REQUEST_STATUS;

  // Matching details
  acceptedTutorId?: Types.ObjectId; // Tutor who accepted
  chatId?: Types.ObjectId; // Created chat when accepted

  // Timestamps & Expiration
  expiresAt: Date; // Auto-expire after 7 days
  acceptedAt?: Date;
  cancelledAt?: Date;

  // Extension tracking
  isExtended?: boolean;
  extensionCount?: number;
  reminderSentAt?: Date;
  finalExpiresAt?: Date;

  // Metadata
  cancellationReason?: string;
};

export type SessionRequestModel = Model<ISessionRequest>;
