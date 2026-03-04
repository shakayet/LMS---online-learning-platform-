import { z } from 'zod';

const searchOERResourcesZodSchema = z.object({
  query: z.object({
    query: z.string().optional(),
    subject: z.string().optional(),
    grade: z.string().optional(),
    type: z.string().optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
  }),
});

export const OERResourceValidation = {
  searchOERResourcesZodSchema,
};
