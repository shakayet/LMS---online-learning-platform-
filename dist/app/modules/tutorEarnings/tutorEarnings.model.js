"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorEarnings = void 0;
const mongoose_1 = require("mongoose");
const tutorEarnings_interface_1 = require("./tutorEarnings.interface");

const EarningLineItemSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
    },
    studentName: {
        type: String,
        required: true,
    },
    subject: {
        type: String,
        required: true,
    },
    completedAt: {
        type: Date,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    sessionPrice: {
        type: Number,
        required: true,
    },
    tutorEarning: {
        type: Number,
        required: true,
    },
}, { _id: false });
const tutorEarningsSchema = new mongoose_1.Schema({
    tutorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Tutor ID is required'],
    },
    payoutMonth: {
        type: Number,
        required: [true, 'Payout month is required'],
        min: 1,
        max: 12,
    },
    payoutYear: {
        type: Number,
        required: [true, 'Payout year is required'],
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
        type: [EarningLineItemSchema],
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
    grossEarnings: {
        type: Number,
        required: [true, 'Gross earnings is required'],
        default: 0,
    },
    platformCommission: {
        type: Number,
        required: [true, 'Platform commission is required'],
        default: 0,
    },
    commissionRate: {
        type: Number,
        required: [true, 'Commission rate is required'],
        default: 0,
    },
    netEarnings: {
        type: Number,
        required: [true, 'Net earnings is required'],
        default: 0,
    },
    status: {
        type: String,
        enum: Object.values(tutorEarnings_interface_1.PAYOUT_STATUS),
        default: tutorEarnings_interface_1.PAYOUT_STATUS.PENDING,
    },
    stripeTransferId: {
        type: String,
    },
    stripePayoutId: {
        type: String,
    },
    paidAt: {
        type: Date,
    },
    paymentMethod: {
        type: String,
    },
    notes: {
        type: String,
        trim: true,
    },
    failureReason: {
        type: String,
        trim: true,
    },
    payoutReference: {
        type: String,
        unique: true,

    },
}, { timestamps: true });

tutorEarningsSchema.index({ tutorId: 1, payoutYear: -1, payoutMonth: -1 });
tutorEarningsSchema.index({ status: 1 });
tutorEarningsSchema.index({ payoutReference: 1 });
tutorEarningsSchema.index({ stripeTransferId: 1 });

tutorEarningsSchema.index({ tutorId: 1, payoutYear: 1, payoutMonth: 1 }, { unique: true });

tutorEarningsSchema.pre('save', function (next) {
    if (this.isNew && !this.payoutReference) {
        const year = this.payoutYear.toString().slice(-2);
        const month = this.payoutMonth.toString().padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.payoutReference = `PAYOUT-${year}${month}-${random}`;
    }
    next();
});

tutorEarningsSchema.pre('save', function (next) {
    if (this.lineItems && this.lineItems.length > 0) {
        this.totalSessions = this.lineItems.length;
        this.totalHours = this.lineItems.reduce((sum, item) => sum + item.duration / 60, 0);
        this.grossEarnings = this.lineItems.reduce((sum, item) => sum + item.sessionPrice, 0);
        this.platformCommission = this.grossEarnings * this.commissionRate;
        this.netEarnings = this.grossEarnings - this.platformCommission;
    }
    next();
});
exports.TutorEarnings = (0, mongoose_1.model)('TutorEarnings', tutorEarningsSchema);
