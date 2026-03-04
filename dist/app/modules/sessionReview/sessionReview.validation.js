"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReviewValidation = void 0;
const zod_1 = require("zod");
const createReviewZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        sessionId: zod_1.z
            .string({
            required_error: 'Session ID is required',
        })
            .min(1, 'Session ID cannot be empty'),
        overallRating: zod_1.z
            .number({
            required_error: 'Overall rating is required',
            invalid_type_error: 'Overall rating must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        teachingQuality: zod_1.z
            .number({
            required_error: 'Teaching quality rating is required',
            invalid_type_error: 'Teaching quality must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        communication: zod_1.z
            .number({
            required_error: 'Communication rating is required',
            invalid_type_error: 'Communication must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        punctuality: zod_1.z
            .number({
            required_error: 'Punctuality rating is required',
            invalid_type_error: 'Punctuality must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        preparedness: zod_1.z
            .number({
            required_error: 'Preparedness rating is required',
            invalid_type_error: 'Preparedness must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        comment: zod_1.z
            .string()
            .max(1000, 'Comment cannot exceed 1000 characters')
            .optional(),
        wouldRecommend: zod_1.z
            .boolean({
            required_error: 'Would recommend field is required',
        }),
        isPublic: zod_1.z.boolean().optional().default(true),
    }),
});
const updateReviewZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        overallRating: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        teachingQuality: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        communication: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        punctuality: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        preparedness: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        comment: zod_1.z
            .string()
            .max(1000, 'Comment cannot exceed 1000 characters')
            .optional(),
        wouldRecommend: zod_1.z.boolean().optional(),
        isPublic: zod_1.z.boolean().optional(),
    }),
});
// Admin: Create review (without session)
const adminCreateReviewZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        tutorId: zod_1.z
            .string({
            required_error: 'Tutor ID is required',
        })
            .min(1, 'Tutor ID cannot be empty'),
        overallRating: zod_1.z
            .number({
            required_error: 'Overall rating is required',
            invalid_type_error: 'Overall rating must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        teachingQuality: zod_1.z
            .number({
            required_error: 'Teaching quality rating is required',
            invalid_type_error: 'Teaching quality must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        communication: zod_1.z
            .number({
            required_error: 'Communication rating is required',
            invalid_type_error: 'Communication must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        punctuality: zod_1.z
            .number({
            required_error: 'Punctuality rating is required',
            invalid_type_error: 'Punctuality must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        preparedness: zod_1.z
            .number({
            required_error: 'Preparedness rating is required',
            invalid_type_error: 'Preparedness must be a number',
        })
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5'),
        comment: zod_1.z
            .string()
            .max(1000, 'Comment cannot exceed 1000 characters')
            .optional(),
        wouldRecommend: zod_1.z
            .boolean({
            required_error: 'Would recommend field is required',
        }),
        isPublic: zod_1.z.boolean().optional().default(true),
        reviewerName: zod_1.z
            .string()
            .max(100, 'Reviewer name cannot exceed 100 characters')
            .optional(),
    }),
});
// Admin: Update any review
const adminUpdateReviewZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        overallRating: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        teachingQuality: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        communication: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        punctuality: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        preparedness: zod_1.z
            .number()
            .min(1, 'Rating must be between 1-5')
            .max(5, 'Rating must be between 1-5')
            .optional(),
        comment: zod_1.z
            .string()
            .max(1000, 'Comment cannot exceed 1000 characters')
            .optional(),
        wouldRecommend: zod_1.z.boolean().optional(),
        isPublic: zod_1.z.boolean().optional(),
        reviewerName: zod_1.z
            .string()
            .max(100, 'Reviewer name cannot exceed 100 characters')
            .optional(),
    }),
});
exports.SessionReviewValidation = {
    createReviewZodSchema,
    updateReviewZodSchema,
    adminCreateReviewZodSchema,
    adminUpdateReviewZodSchema,
};
