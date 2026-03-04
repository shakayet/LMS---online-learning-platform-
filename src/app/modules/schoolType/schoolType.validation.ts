import { z } from 'zod';

const createSchoolTypeZodSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'School type name is required',
      })
      .trim()
      .min(1, 'School type name must be at least 1 character'),
    isActive: z.boolean().optional().default(true),
  }),
});

const updateSchoolTypeZodSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'School type name must be at least 1 character')
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

export const SchoolTypeValidation = {
  createSchoolTypeZodSchema,
  updateSchoolTypeZodSchema,
};
