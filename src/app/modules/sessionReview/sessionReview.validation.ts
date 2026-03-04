import { z } from 'zod';

const createReviewZodSchema = z.object({
  body: z.object({
    sessionId: z
      .string({
        required_error: 'Session ID is required',
      })
      .min(1, 'Session ID cannot be empty'),
    overallRating: z
      .number({
        required_error: 'Overall rating is required',
        invalid_type_error: 'Overall rating must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    teachingQuality: z
      .number({
        required_error: 'Teaching quality rating is required',
        invalid_type_error: 'Teaching quality must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    communication: z
      .number({
        required_error: 'Communication rating is required',
        invalid_type_error: 'Communication must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    punctuality: z
      .number({
        required_error: 'Punctuality rating is required',
        invalid_type_error: 'Punctuality must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    preparedness: z
      .number({
        required_error: 'Preparedness rating is required',
        invalid_type_error: 'Preparedness must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    comment: z
      .string()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
    wouldRecommend: z
      .boolean({
        required_error: 'Would recommend field is required',
      }),
    isPublic: z.boolean().optional().default(true),
  }),
});

const updateReviewZodSchema = z.object({
  body: z.object({
    overallRating: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    teachingQuality: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    communication: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    punctuality: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    preparedness: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    comment: z
      .string()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
    wouldRecommend: z.boolean().optional(),
    isPublic: z.boolean().optional(),
  }),
});

// Admin: Create review (without session)
const adminCreateReviewZodSchema = z.object({
  body: z.object({
    tutorId: z
      .string({
        required_error: 'Tutor ID is required',
      })
      .min(1, 'Tutor ID cannot be empty'),
    overallRating: z
      .number({
        required_error: 'Overall rating is required',
        invalid_type_error: 'Overall rating must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    teachingQuality: z
      .number({
        required_error: 'Teaching quality rating is required',
        invalid_type_error: 'Teaching quality must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    communication: z
      .number({
        required_error: 'Communication rating is required',
        invalid_type_error: 'Communication must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    punctuality: z
      .number({
        required_error: 'Punctuality rating is required',
        invalid_type_error: 'Punctuality must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    preparedness: z
      .number({
        required_error: 'Preparedness rating is required',
        invalid_type_error: 'Preparedness must be a number',
      })
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5'),
    comment: z
      .string()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
    wouldRecommend: z
      .boolean({
        required_error: 'Would recommend field is required',
      }),
    isPublic: z.boolean().optional().default(true),
    reviewerName: z
      .string()
      .max(100, 'Reviewer name cannot exceed 100 characters')
      .optional(),
  }),
});

// Admin: Update any review
const adminUpdateReviewZodSchema = z.object({
  body: z.object({
    overallRating: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    teachingQuality: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    communication: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    punctuality: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    preparedness: z
      .number()
      .min(1, 'Rating must be between 1-5')
      .max(5, 'Rating must be between 1-5')
      .optional(),
    comment: z
      .string()
      .max(1000, 'Comment cannot exceed 1000 characters')
      .optional(),
    wouldRecommend: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    reviewerName: z
      .string()
      .max(100, 'Reviewer name cannot exceed 100 characters')
      .optional(),
  }),
});

export const SessionReviewValidation = {
  createReviewZodSchema,
  updateReviewZodSchema,
  adminCreateReviewZodSchema,
  adminUpdateReviewZodSchema,
};
