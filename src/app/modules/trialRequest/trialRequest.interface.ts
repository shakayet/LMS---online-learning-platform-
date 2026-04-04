import { Model, Types } from 'mongoose';

export enum TRIAL_REQUEST_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum REQUEST_TYPE {
  TRIAL = 'TRIAL',
  SESSION = 'SESSION',
}

export type IGuardianInfo = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export type IStudentInfo = {
  name: string;
  email?: string;
  password?: string;
  isUnder18: boolean;
  dateOfBirth?: Date;

  guardianInfo?: IGuardianInfo;
};

export type ITrialRequest = {

  requestType: REQUEST_TYPE;

  studentId?: Types.ObjectId;

  studentInfo: IStudentInfo;

  subject: Types.ObjectId;
  gradeLevel: string;
  schoolType: string;

  description: string;
  learningGoals?: string;
  preferredLanguage: 'ENGLISH' | 'GERMAN';
  preferredDateTime?: Date;

  documents?: string[];

  status: TRIAL_REQUEST_STATUS;

  acceptedTutorId?: Types.ObjectId;
  chatId?: Types.ObjectId;

  expiresAt: Date;
  acceptedAt?: Date;
  cancelledAt?: Date;

  isExtended?: boolean;
  extensionCount?: number;
  reminderSentAt?: Date;
  finalExpiresAt?: Date;

  cancellationReason?: string;
};

export type TrialRequestModel = Model<ITrialRequest>;
