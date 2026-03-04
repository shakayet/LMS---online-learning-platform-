"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewSlotValidation = void 0;
const zod_1 = require("zod");
// Create interview slot validation (Admin)
const createInterviewSlotZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        startTime: zod_1.z
            .string({
            required_error: 'Start time is required',
        })
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid start time format',
        })
            .refine(date => new Date(date) > new Date(), {
            message: 'Start time must be in the future',
        }),
        endTime: zod_1.z
            .string({
            required_error: 'End time is required',
        })
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid end time format',
        }),
    }).refine(data => new Date(data.endTime) > new Date(data.startTime), {
        message: 'End time must be after start time',
        path: ['endTime'],
    }),
});
// Book interview slot validation (Applicant)
const bookInterviewSlotZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        applicationId: zod_1.z
            .string({
            required_error: 'Application ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID format'),
    }),
});
// Cancel interview slot validation
const cancelInterviewSlotZodSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
});
// Reschedule interview slot validation (Applicant)
const rescheduleInterviewSlotZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        newSlotId: zod_1.z
            .string({
            required_error: 'New slot ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid new slot ID format'),
    }),
});
// Update interview slot validation (Admin)
const updateInterviewSlotZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        startTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid start time format',
        })
            .optional(),
        endTime: zod_1.z
            .string()
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid end time format',
        })
            .optional(),
        status: zod_1.z
            .enum(['AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED'])
            .optional(),
    }),
});
exports.InterviewSlotValidation = {
    createInterviewSlotZodSchema,
    bookInterviewSlotZodSchema,
    cancelInterviewSlotZodSchema,
    rescheduleInterviewSlotZodSchema,
    updateInterviewSlotZodSchema,
};
