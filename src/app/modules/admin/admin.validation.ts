import { z } from 'zod';

const overviewStatsQuerySchema = z.object({
  query: z.object({
    period: z
      .enum(['day', 'week', 'month', 'quarter', 'year'])
      .optional()
      .default('month'),
  }),
});

const monthlyRevenueQuerySchema = z.object({
  query: z.object({
    year: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val) : new Date().getFullYear())),
    months: z.string().optional(), // comma-separated e.g. "1,2,3"
    tutorId: z.string().optional(),
    studentId: z.string().optional(),
    subscriptionTier: z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']).optional(),
    subject: z.string().optional(),
  }),
});

const userDistributionQuerySchema = z.object({
  query: z.object({
    groupBy: z.enum(['role', 'status', 'both']).optional().default('role'),
  }),
});

export const AdminValidation = {
  overviewStatsQuerySchema,
  monthlyRevenueQuerySchema,
  userDistributionQuerySchema,
};
