import { z } from 'zod';

const subscribeToPlanZodSchema = z.object({
  body: z.object({
    tier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM'], {
      required_error: 'Subscription tier is required',
    }),
  }),
});

const cancelSubscriptionZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

const confirmPaymentZodSchema = z.object({
  body: z.object({
    subscriptionId: z.string({
      required_error: 'Subscription ID is required',
    }),
    paymentIntentId: z.string({
      required_error: 'Payment Intent ID is required',
    }),
  }),
});

export const StudentSubscriptionValidation = {
  subscribeToPlanZodSchema,
  cancelSubscriptionZodSchema,
  confirmPaymentZodSchema,
};
