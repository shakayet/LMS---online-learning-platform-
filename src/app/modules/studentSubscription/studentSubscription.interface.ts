import { Model, Types } from 'mongoose';

export enum SUBSCRIPTION_TIER {
  FLEXIBLE = 'FLEXIBLE',       // €30/hr, no commitment
  REGULAR = 'REGULAR',         // €28/hr, 1 month, min 4 hours
  LONG_TERM = 'LONG_TERM',     // €25/hr, 3 months, min 4 hours
}

export enum SUBSCRIPTION_STATUS {
  PENDING = 'PENDING',           // Payment pending
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export type IStudentSubscription = {
  studentId: Types.ObjectId;
  tier: SUBSCRIPTION_TIER;
  pricePerHour: number;              // EUR (30, 28, or 25)

  // Commitment details
  commitmentMonths: number;          // 0 for FLEXIBLE, 1 for REGULAR, 3 for LONG_TERM
  minimumHours: number;              // 0 for FLEXIBLE, 4 for REGULAR/LONG_TERM

  // Validity
  startDate: Date;
  endDate: Date;                     // Calculated based on commitment
  status: SUBSCRIPTION_STATUS;

  // Usage tracking
  totalHoursTaken: number;           // Total hours used so far
  prepaidHoursUsed: number;          // Hours covered by upfront payment (max = minimumHours)

  // Billing
  stripeCustomerId?: string;         // Stripe customer ID
  stripeSubscriptionId?: string;     // Stripe subscription ID (for recurring)
  stripePaymentIntentId?: string;    // Payment intent ID for initial payment
  paidAt?: Date;                     // When payment was confirmed

  // Cancellation
  cancellationReason?: string;
  cancelledAt?: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

export type StudentSubscriptionModel = Model<IStudentSubscription>;
