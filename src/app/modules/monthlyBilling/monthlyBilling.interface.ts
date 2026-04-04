import { Model, Types } from 'mongoose';

export enum BILLING_STATUS {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export type IBillingLineItem = {
  sessionId: Types.ObjectId;
  subject: string;
  tutorName: string;
  date: Date;
  duration: number;
  pricePerHour: number;
  amount: number;
};

export type IMonthlyBilling = {
  studentId: Types.ObjectId;
  subscriptionId: Types.ObjectId;

  billingMonth: number;
  billingYear: number;
  periodStart: Date;
  periodEnd: Date;

  lineItems: IBillingLineItem[];
  totalSessions: number;
  totalHours: number;

  subscriptionTier: string;
  pricePerHour: number;
  subtotal: number;
  tax: number;
  total: number;

  status: BILLING_STATUS;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  paymentMethod?: string;

  invoiceUrl?: string;
  invoiceNumber: string;

  notes?: string;
  failureReason?: string;
};

export type MonthlyBillingModel = Model<IMonthlyBilling>;
