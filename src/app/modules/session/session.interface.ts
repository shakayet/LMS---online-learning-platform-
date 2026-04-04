import { Model, Types } from 'mongoose';

export enum SESSION_STATUS {
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  SCHEDULED = 'SCHEDULED',
  STARTING_SOON = 'STARTING_SOON',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED',
}

export enum RESCHEDULE_STATUS {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PAYMENT_STATUS {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum COMPLETION_STATUS {
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  COMPLETED = 'COMPLETED',
}

export type IRescheduleRequest = {
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  newStartTime: Date;
  newEndTime: Date;
  reason?: string;
  status: RESCHEDULE_STATUS;
  respondedAt?: Date;
  respondedBy?: Types.ObjectId;
};

export type ISessionAttendance = {
  odId: Types.ObjectId;
  firstJoinedAt?: Date;
  lastLeftAt?: Date;
  totalDurationSeconds: number;
  attendancePercentage: number;
  joinCount: number;
};

export type ISession = {
  studentId: Types.ObjectId;
  tutorId: Types.ObjectId;
  subject: string;
  description?: string;

  startTime: Date;
  endTime: Date;
  duration: number;
  bufferMinutes: number;

  pricePerHour: number;
  totalPrice: number;
  bufferPrice: number;

  googleMeetLink?: string;
  googleCalendarEventId?: string;

  status: SESSION_STATUS;
  paymentStatus: PAYMENT_STATUS;

  isTrial: boolean;

  messageId?: Types.ObjectId;
  chatId?: Types.ObjectId;
  reviewId?: Types.ObjectId;
  tutorFeedbackId?: Types.ObjectId;
  trialRequestId?: Types.ObjectId;

  rescheduleRequest?: IRescheduleRequest;
  previousStartTime?: Date;
  previousEndTime?: Date;

  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;

  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;

  callId?: Types.ObjectId;
  tutorAttendance?: ISessionAttendance;
  studentAttendance?: ISessionAttendance;
  noShowBy?: 'tutor' | 'student';

  studentCompletionStatus?: COMPLETION_STATUS;
  studentCompletedAt?: Date;
  studentJoined?: boolean;

  teacherCompletionStatus?: COMPLETION_STATUS;
  teacherCompletedAt?: Date;
  teacherJoined?: boolean;
  teacherFeedbackRequired?: boolean;

  isPaidUpfront?: boolean;
  billingId?: Types.ObjectId;
  billedAt?: Date;
};

export type SessionModel = Model<ISession>;