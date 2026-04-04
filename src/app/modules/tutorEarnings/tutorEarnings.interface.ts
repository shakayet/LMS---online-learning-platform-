import { Model, Types } from 'mongoose';

export enum PAYOUT_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export type IEarningLineItem = {
  sessionId: Types.ObjectId;
  studentName: string;
  subject: string;
  completedAt: Date;
  duration: number;
  sessionPrice: number;
  tutorEarning: number;
};

export type ITutorEarnings = {
  tutorId: Types.ObjectId;

  payoutMonth: number;
  payoutYear: number;
  periodStart: Date;
  periodEnd: Date;

  lineItems: IEarningLineItem[];
  totalSessions: number;
  totalHours: number;

  grossEarnings: number;
  platformCommission: number;
  commissionRate: number;
  netEarnings: number;

  status: PAYOUT_STATUS;
  stripeTransferId?: string;
  stripePayoutId?: string;
  paidAt?: Date;
  paymentMethod?: string;

  notes?: string;
  failureReason?: string;
  payoutReference: string;
};

export type TutorEarningsModel = Model<ITutorEarnings>;
