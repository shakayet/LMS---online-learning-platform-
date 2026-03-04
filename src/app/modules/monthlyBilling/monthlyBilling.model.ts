import { model, Schema } from 'mongoose';
import {
  IMonthlyBilling,
  MonthlyBillingModel,
  BILLING_STATUS,
} from './monthlyBilling.interface';

// Line Item Schema
const BillingLineItemSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    tutorName: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true, // minutes
    },
    pricePerHour: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const monthlyBillingSchema = new Schema<IMonthlyBilling>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentSubscription',
      required: [true, 'Subscription ID is required'],
    },
    billingMonth: {
      type: Number,
      required: [true, 'Billing month is required'],
      min: 1,
      max: 12,
    },
    billingYear: {
      type: Number,
      required: [true, 'Billing year is required'],
    },
    periodStart: {
      type: Date,
      required: [true, 'Period start is required'],
    },
    periodEnd: {
      type: Date,
      required: [true, 'Period end is required'],
    },
    lineItems: {
      type: [BillingLineItemSchema],
      default: [],
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    subscriptionTier: {
      type: String,
      required: [true, 'Subscription tier is required'],
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
    },
    subtotal: {
      type: Number,
      default: 0,
      // Auto-calculated in pre-save hook
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
      // Auto-calculated in pre-save hook
    },
    status: {
      type: String,
      enum: Object.values(BILLING_STATUS),
      default: BILLING_STATUS.PENDING,
    },
    stripeInvoiceId: {
      type: String,
    },
    stripePaymentIntentId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
    },
    invoiceUrl: {
      type: String,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      // Not required - auto-generated in pre-save hook
    },
    notes: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
monthlyBillingSchema.index({ studentId: 1, billingYear: -1, billingMonth: -1 });
monthlyBillingSchema.index({ status: 1 });
monthlyBillingSchema.index({ invoiceNumber: 1 });
monthlyBillingSchema.index({ stripeInvoiceId: 1 });

// Compound unique index to prevent duplicate billings
monthlyBillingSchema.index(
  { studentId: 1, billingYear: 1, billingMonth: 1 },
  { unique: true }
);

// Pre-save: Generate invoice number
monthlyBillingSchema.pre('save', function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = this.billingYear.toString().slice(-2); // Last 2 digits
    const month = this.billingMonth.toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  next();
});

// Pre-save: Calculate totals
monthlyBillingSchema.pre('save', function (next) {
  if (this.lineItems && this.lineItems.length > 0) {
    this.totalSessions = this.lineItems.length;
    this.totalHours = this.lineItems.reduce((sum, item) => sum + item.duration / 60, 0);
    this.subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
    this.total = this.subtotal + this.tax;
  }
  next();
});

export const MonthlyBilling = model<IMonthlyBilling, MonthlyBillingModel>(
  'MonthlyBilling',
  monthlyBillingSchema
);
