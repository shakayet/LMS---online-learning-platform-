"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentSubscription = void 0;
const mongoose_1 = require("mongoose");
const studentSubscription_interface_1 = require("./studentSubscription.interface");
const studentSubscriptionSchema = new mongoose_1.Schema({
    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
    },
    tier: {
        type: String,
        enum: Object.values(studentSubscription_interface_1.SUBSCRIPTION_TIER),
        required: [true, 'Subscription tier is required'],
    },
    pricePerHour: {
        type: Number,
        required: [true, 'Price per hour is required'],
    },
    commitmentMonths: {
        type: Number,
        required: [true, 'Commitment months is required'],
        default: 0,
    },
    minimumHours: {
        type: Number,
        required: [true, 'Minimum hours is required'],
        default: 0,
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
    },
    status: {
        type: String,
        enum: Object.values(studentSubscription_interface_1.SUBSCRIPTION_STATUS),
        default: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    },
    totalHoursTaken: {
        type: Number,
        default: 0,
    },
    prepaidHoursUsed: {
        type: Number,
        default: 0, // Hours already covered by upfront payment
    },
    stripeCustomerId: {
        type: String,
    },
    stripeSubscriptionId: {
        type: String,
    },
    stripePaymentIntentId: {
        type: String,
    },
    paidAt: {
        type: Date,
    },
    cancellationReason: {
        type: String,
        trim: true,
    },
    cancelledAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes
studentSubscriptionSchema.index({ studentId: 1, status: 1 });
studentSubscriptionSchema.index({ status: 1, endDate: 1 });
studentSubscriptionSchema.index({ tier: 1 });
// Pre-save: Calculate endDate based on tier
studentSubscriptionSchema.pre('save', function (next) {
    if (this.isNew && !this.endDate) {
        const endDate = new Date(this.startDate);
        if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE) {
            // Flexible: No end date (set to 100 years from now)
            endDate.setFullYear(endDate.getFullYear() + 100);
        }
        else if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.REGULAR) {
            // Regular: 1 month
            endDate.setMonth(endDate.getMonth() + 1);
        }
        else if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.LONG_TERM) {
            // Long-term: 3 months
            endDate.setMonth(endDate.getMonth() + 3);
        }
        this.endDate = endDate;
    }
    next();
});
// Pre-save: Set price based on tier
studentSubscriptionSchema.pre('save', function (next) {
    if (this.isNew && !this.pricePerHour) {
        if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.FLEXIBLE) {
            this.pricePerHour = 30;
            this.commitmentMonths = 0;
            this.minimumHours = 0;
        }
        else if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.REGULAR) {
            this.pricePerHour = 28;
            this.commitmentMonths = 1;
            this.minimumHours = 4;
        }
        else if (this.tier === studentSubscription_interface_1.SUBSCRIPTION_TIER.LONG_TERM) {
            this.pricePerHour = 25;
            this.commitmentMonths = 3;
            this.minimumHours = 4;
        }
    }
    next();
});
exports.StudentSubscription = (0, mongoose_1.model)('StudentSubscription', studentSubscriptionSchema);
