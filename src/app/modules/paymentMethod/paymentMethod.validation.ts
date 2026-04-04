import { z } from 'zod';

const attachPaymentMethodZodSchema = z.object({
  body: z.object({
    paymentMethodId: z.string({
      required_error: 'Payment method ID is required',
    }),
    setAsDefault: z.boolean().optional().default(false),
  }),
});

export const PaymentMethodValidation = {
  attachPaymentMethodZodSchema,
};