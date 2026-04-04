import { Model, Types } from 'mongoose';

export enum SUBSCRIPTION_TIER {
  FLEXIBLE = 'FLEXIBLE',
  REGULAR = 'REGULAR',
  LONG_TERM = 'LONG_TERM',
}

export enum SUBSCRIPTION_STATUS {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export type IStudentSubscription = {
  studentId: Types.ObjectId;
  tier: SUBSCRIPTION_TIER;
  pricePerHour: number;

  commitmentMonths: number;
  minimumHours: number;

  startDate: Date;
  endDate: Date;
  status: SUBSCRIPTION_STATUS;

  totalHoursTaken: number;
  prepaidHoursUsed: number;

  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;

  cancellationReason?: string;
  cancelledAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
};

export type StudentSubscriptionModel = Model<IStudentSubscription>;
