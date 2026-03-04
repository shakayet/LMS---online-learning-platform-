import { z } from 'zod';

// Generate monthly billing validation (Admin - Manual trigger)
const generateMonthlyBillingZodSchema = z.object({
  body: z.object({
    month: z
      .number({
        required_error: 'Month is required',
      })
      .min(1, 'Month must be between 1 and 12')
      .max(12, 'Month must be between 1 and 12'),

    year: z
      .number({
        required_error: 'Year is required',
      })
      .min(2020, 'Year must be 2020 or later'),
  }),
});

export const MonthlyBillingValidation = {
  generateMonthlyBillingZodSchema,
};
