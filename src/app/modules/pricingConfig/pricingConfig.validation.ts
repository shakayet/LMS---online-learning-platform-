import { z } from 'zod';

const pricingPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  tier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']),
  pricePerHour: z.number().positive('Price must be positive'),
  courseDuration: z.string().min(1, 'Course duration is required'),
  commitmentMonths: z.number().min(0, 'Commitment months cannot be negative'),
  minimumHours: z.number().min(0, 'Minimum hours cannot be negative'),
  selectedHours: z.string().min(1, 'Selected hours text is required'),
  selectedHoursDetails: z.string().min(1, 'Selected hours details is required'),
  termType: z.string().min(1, 'Term type is required'),
  inclusions: z.array(z.string()),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(1, 'Sort order must be at least 1'),
});

const updatePricingConfigZodSchema = z.object({
  body: z.object({
    plans: z.array(pricingPlanSchema).min(1, 'At least one plan is required'),
  }),
});

const updateSinglePlanZodSchema = z.object({
  params: z.object({
    tier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']),
  }),
  body: pricingPlanSchema.partial().omit({ tier: true }),
});

export const PricingConfigValidation = {
  updatePricingConfigZodSchema,
  updateSinglePlanZodSchema,
};
