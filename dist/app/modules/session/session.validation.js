"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionValidation = void 0;
const zod_1 = require("zod");

const proposeSessionZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        chatId: zod_1.z
            .string({
            required_error: 'Chat ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid chat ID format'),
        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(2, 'Subject must be at least 2 characters'),
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
        description: zod_1.z.string().trim().optional(),
    }).refine(data => new Date(data.endTime) > new Date(data.startTime), {
        message: 'End time must be after start time',
        path: ['endTime'],
    }),
});

const acceptSessionProposalZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        messageId: zod_1.z
            .string({
            required_error: 'Message ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
    }),
});

const counterProposeSessionZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        messageId: zod_1.z
            .string({
            required_error: 'Message ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
    }),
    body: zod_1.z.object({
        newStartTime: zod_1.z
            .string({
            required_error: 'New start time is required',
        })
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid start time format',
        })
            .refine(date => new Date(date) > new Date(), {
            message: 'New start time must be in the future',
        }),
        newEndTime: zod_1.z
            .string({
            required_error: 'New end time is required',
        })
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid end time format',
        }),
        reason: zod_1.z
            .string()
            .trim()
            .min(10, 'Reason must be at least 10 characters')
            .optional(),
    }).refine(data => new Date(data.newEndTime) > new Date(data.newStartTime), {
        message: 'End time must be after start time',
        path: ['newEndTime'],
    }),
});

const rejectSessionProposalZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        messageId: zod_1.z
            .string({
            required_error: 'Message ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
    }),
    body: zod_1.z.object({
        rejectionReason: zod_1.z
            .string()
            .trim()
            .min(10, 'Rejection reason must be at least 10 characters')
            .optional()
            .default('Declined by user'),
    }),
});

const cancelSessionZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        cancellationReason: zod_1.z
            .string({
            required_error: 'Cancellation reason is required',
        })
            .trim()
            .min(10, 'Cancellation reason must be at least 10 characters'),
    }),
});

const completeSessionZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({
            required_error: 'Session ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format'),
    }),
});

const rescheduleSessionZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({
            required_error: 'Session ID is required',
        })
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format'),
    }),
    body: zod_1.z.object({
        newStartTime: zod_1.z
            .string({
            required_error: 'New start time is required',
        })
            .refine(date => !isNaN(Date.parse(date)), {
            message: 'Invalid start time format',
        })
            .refine(date => new Date(date) > new Date(), {
            message: 'New start time must be in the future',
        }),
        reason: zod_1.z
            .string()
            .trim()
            .min(10, 'Reason must be at least 10 characters')
            .optional(),
    }),
});
exports.SessionValidation = {
    proposeSessionZodSchema,
    acceptSessionProposalZodSchema,
    counterProposeSessionZodSchema,
    rejectSessionProposalZodSchema,
    cancelSessionZodSchema,
    completeSessionZodSchema,
    rescheduleSessionZodSchema,
};
