import { Model, Types } from 'mongoose';

export enum BILLING_STATUS {
  PENDING = 'PENDING',         // Generated, not yet paid
  PAID = 'PAID',              // Payment successful
  FAILED = 'FAILED',          // Payment failed
  REFUNDED = 'REFUNDED',      // Payment refunded
}

export type IBillingLineItem = {
  sessionId: Types.ObjectId;
  subject: string;
  tutorName: string;
  date: Date;
  duration: number;            // minutes
  pricePerHour: number;        // EUR
  amount: number;              // EUR (calculated)
};

export type IMonthlyBilling = {
  studentId: Types.ObjectId;
  subscriptionId: Types.ObjectId;

  // Billing period
  billingMonth: number;        // 1-12
  billingYear: number;         // 2024
  periodStart: Date;           // First day of month
  periodEnd: Date;             // Last day of month

  // Sessions included
  lineItems: IBillingLineItem[];
  totalSessions: number;
  totalHours: number;          // Total hours taken

  // Pricing
  subscriptionTier: string;    // FLEXIBLE, REGULAR, LONG_TERM
  pricePerHour: number;        // 30, 28, or 25 EUR
  subtotal: number;            // Total before any adjustments
  tax: number;                 // VAT (if applicable)
  total: number;               // Final amount

  // Payment
  status: BILLING_STATUS;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  paymentMethod?: string;      // card, bank_transfer, etc.

  // Invoice
  invoiceUrl?: string;         // PDF invoice URL
  invoiceNumber: string;       // Unique invoice number

  // Metadata
  notes?: string;
  failureReason?: string;
};

export type MonthlyBillingModel = Model<IMonthlyBilling>;
