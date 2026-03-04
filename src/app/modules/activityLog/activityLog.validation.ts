import { z } from 'zod';
import { ENTITY_TYPES } from './activityLog.interface';

export const recentActivityQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 10)),
    actionType: z.string().optional(),
    status: z.string().optional(),
    entityType: z.enum(ENTITY_TYPES).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export const ActivityLogValidation = {
  recentActivityQuerySchema,
};
