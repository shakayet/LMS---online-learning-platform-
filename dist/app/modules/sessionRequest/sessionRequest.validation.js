"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRequestValidation = void 0;
const zod_1 = require("zod");

const createSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({

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

        learningGoals: zod_1.z
            .string()
            .trim()
            .max(1000, 'Learning goals cannot exceed 1000 characters')
            .optional(),

        documents: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});

const cancelSessionRequestZodSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
});

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
