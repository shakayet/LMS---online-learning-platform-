import { z } from 'zod';

// Create session request validation (Student only - must be logged in)
// Simplified form: only subject, gradeLevel, schoolType, learningGoals, documents
// No description or preferredDateTime needed (unlike trial request)
const createSessionRequestZodSchema = z.object({
  body: z.object({
    // Academic Information (Required)
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

    // Learning Goals (Optional)
    learningGoals: z
      .string()
      .trim()
      .max(1000, 'Learning goals cannot exceed 1000 characters')
      .optional(),

    // Documents (Optional)
    documents: z.array(z.string()).optional(),
  }),
});

// Cancel session request validation (Student) - no reason required
const cancelSessionRequestZodSchema = z.object({
  body: z.object({}).optional(),
});

// Accept session request validation (Tutor)
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
