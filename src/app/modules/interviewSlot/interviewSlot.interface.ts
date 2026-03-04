import { Model, Types } from 'mongoose';

export enum INTERVIEW_SLOT_STATUS {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type IInterviewSlot = {
  adminId: Types.ObjectId;
  applicantId?: Types.ObjectId;
  applicationId?: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: INTERVIEW_SLOT_STATUS;
  agoraChannelName?: string;
  cancellationReason?: string;
  bookedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
};

export type InterviewSlotModel = Model<IInterviewSlot>;