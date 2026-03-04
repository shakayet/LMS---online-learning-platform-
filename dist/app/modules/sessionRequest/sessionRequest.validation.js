"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRequestValidation = void 0;
const zod_1 = require("zod");
// Create session request validation (Student only - must be logged in)
// Simplified form: only subject, gradeLevel, schoolType, learningGoals, documents
// No description or preferredDateTime needed (unlike trial request)
const createSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Academic Information (Required)
        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(1, 'Subject is required'),
        gradeLevel: zod_1.z
            .string({
            required_error: 'Grade level is required',
        })
            .trim()
            .min(1, 'Grade level is required'),
        schoolType: zod_1.z
            .string({
            required_error: 'School type is required',
        })
            .trim()
            .min(1, 'School type is required'),
        // Learning Goals (Optional)
        learningGoals: zod_1.z
            .string()
            .trim()
            .max(1000, 'Learning goals cannot exceed 1000 characters')
            .optional(),
        // Documents (Optional)
        documents: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
// Cancel session request validation (Student) - no reason required
const cancelSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
});
// Accept session request validation (Tutor)
const acceptSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        introductoryMessage: zod_1.z
            .string()
            .trim()
            .transform(val => val === '' ? undefined : val)
            .optional()
            .refine(val => val === undefined || (val.length >= 10 && val.length <= 500), {
            message: 'Introductory message must be between 10 and 500 characters',
        }),
    }),
});
exports.SessionRequestValidation = {
    createSessionRequestZodSchema,
    cancelSessionRequestZodSchema,
    acceptSessionRequestZodSchema,
};
