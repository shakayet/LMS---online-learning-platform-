import { Model, Types } from 'mongoose';

export enum PAYOUT_STATUS {
  PENDING = 'PENDING',           // Earnings calculated, not yet paid
  PROCESSING = 'PROCESSING',     // Payout initiated in Stripe
  PAID = 'PAID',                 // Successfully transferred to tutor
  FAILED = 'FAILED',             // Payout failed
  REFUNDED = 'REFUNDED',         // Payment was refunded
}

export type IEarningLineItem = {
  sessionId: Types.ObjectId;
  studentName: string;
  subject: string;
  completedAt: Date;
  duration: number;              // minutes
  sessionPrice: number;          // EUR (full session price)
  tutorEarning: number;          // EUR (after platform commission)
};

export type ITutorEarnings = {
  tutorId: Types.ObjectId;

  // Payout period
  payoutMonth: number;           // 1-12
  payoutYear: number;            // 2024
  periodStart: Date;             // First day of month
  periodEnd: Date;               // Last day of month

  // Sessions included
  lineItems: IEarningLineItem[];
  totalSessions: number;
  totalHours: number;            // Total hours taught

  // Earnings breakdown
  grossEarnings: number;         // Total session prices
  platformCommission: number;    // Platform's cut (e.g., 20%)
  commissionRate: number;        // 0.20 (20%)
  netEarnings: number;           // Amount tutor receives

  // Payout details
  status: PAYOUT_STATUS;
  stripeTransferId?: string;     // Stripe Connect transfer ID
  stripePayoutId?: string;       // Stripe payout ID
  paidAt?: Date;
  paymentMethod?: string;        // bank_account, etc.

  // Metadata
  notes?: string;
  failureReason?: string;
  payoutReference: string;       // Unique payout reference
};

export type TutorEarningsModel = Model<ITutorEarnings>;
