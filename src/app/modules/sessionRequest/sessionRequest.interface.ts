import { Model, Types } from 'mongoose';

export enum SESSION_REQUEST_STATUS {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export { REQUEST_TYPE } from '../trialRequest/trialRequest.interface';

export type ISessionRequest = {

  requestType: 'TRIAL' | 'SESSION';

  studentId: Types.ObjectId;

  subject: Types.ObjectId;
  gradeLevel: string;
  schoolType: string;

  description?: string;
  learningGoals?: string;

  documents?: string[];

  status: SESSION_REQUEST_STATUS;

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

export type SessionRequestModel = Model<ISessionRequest>;
