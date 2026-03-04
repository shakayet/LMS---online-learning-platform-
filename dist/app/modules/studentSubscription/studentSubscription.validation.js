"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentSubscriptionValidation = void 0;
const zod_1 = require("zod");
// Subscribe to plan validation (Student)
const subscribeToPlanZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        tier: zod_1.z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM'], {
            required_error: 'Subscription tier is required',
        }),
    }),
});
// Cancel subscription validation (Student)
const cancelSubscriptionZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cancellationReason: zod_1.z
            .string({
            required_error: 'Cancellation reason is required',
        })
            .trim()
            .min(10, 'Cancellation reason must be at least 10 characters'),
    }),
});
// Confirm payment validation (Student)
const confirmPaymentZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        subscriptionId: zod_1.z.string({
            required_error: 'Subscription ID is required',
        }),
        paymentIntentId: zod_1.z.string({
            required_error: 'Payment Intent ID is required',
        }),
    }),
});
exports.StudentSubscriptionValidation = {
    subscribeToPlanZodSchema,
    cancelSubscriptionZodSchema,
    confirmPaymentZodSchema,
};
