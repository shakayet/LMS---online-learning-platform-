import { z } from 'zod';

const createSessionRequestZodSchema = z.object({
  body: z.object({

    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(1, 'Subject is required'),

    gradeLevel: z
      .string({
        required_error: 'Grade level is required',
      })
      .trim()
      .min(1, 'Grade level is required'),

    schoolType: z
      .string({
        required_error: 'School type is required',
      })
      .trim()
      .min(1, 'School type is required'),

    learningGoals: z
      .string()
      .trim()
      .max(1000, 'Learning goals cannot exceed 1000 characters')
      .optional(),

    documents: z.array(z.string()).optional(),
  }),
});

const cancelSessionRequestZodSchema = z.object({
  body: z.object({}).optional(),
});

const acceptSessionRequestZodSchema = z.object({
  body: z.object({
    introductoryMessage: z
      .string()
      .trim()
      .transform(val => val === '' ? undefined : val)
      .optional()
      .refine(
        val => val === undefined || (val.length >= 10 && val.length <= 500),
        {
          message: 'Introductory message must be between 10 and 500 characters',
        }
      ),
  }),
});

export const SessionRequestValidation = {
  createSessionRequestZodSchema,
  cancelSessionRequestZodSchema,
  acceptSessionRequestZodSchema,
};
