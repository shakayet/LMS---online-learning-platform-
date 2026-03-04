import { z } from 'zod';

const createGradeZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Grade name is required',
      })
      .trim()
      .min(1, 'Grade name must be at least 1 character'),
    isActive: z.boolean().optional().default(true),
  }),
});

const updateGradeZodSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Grade name must be at least 1 character')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const GradeValidation = {
  createGradeZodSchema,
  updateGradeZodSchema,
};
