import { z } from 'zod';

// Propose session validation (Tutor sends in chat)
const proposeSessionZodSchema = z.object({
  body: z.object({
    chatId: z
      .string({
        required_error: 'Chat ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid chat ID format'),

    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(2, 'Subject must be at least 2 characters'),

    startTime: z
      .string({
        required_error: 'Start time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid start time format',
      })
      .refine(
        date => new Date(date) > new Date(),
        {
          message: 'Start time must be in the future',
        }
      ),

    endTime: z
      .string({
        required_error: 'End time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid end time format',
      }),

    description: z.string().trim().optional(),
  }).refine(
    data => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  ),
});

// Accept session proposal validation (Student accepts)
const acceptSessionProposalZodSchema = z.object({
  params: z.object({
    messageId: z
      .string({
        required_error: 'Message ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  }),
});

// Counter-propose session validation (Student suggests alternative time)
const counterProposeSessionZodSchema = z.object({
  params: z.object({
    messageId: z
      .string({
        required_error: 'Message ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  }),
  body: z.object({
    newStartTime: z
      .string({
        required_error: 'New start time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid start time format',
      })
      .refine(
        date => new Date(date) > new Date(),
        {
          message: 'New start time must be in the future',
        }
      ),

    newEndTime: z
      .string({
        required_error: 'New end time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid end time format',
      }),

    reason: z
      .string()
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .optional(),
  }).refine(
    data => new Date(data.newEndTime) > new Date(data.newStartTime),
    {
      message: 'End time must be after start time',
      path: ['newEndTime'],
    }
  ),
});

// Reject session proposal validation (Student rejects)
const rejectSessionProposalZodSchema = z.object({
  params: z.object({
    messageId: z
      .string({
        required_error: 'Message ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format'),
  }),
  body: z.object({
    rejectionReason: z
      .string()
      .trim()
      .min(10, 'Rejection reason must be at least 10 characters')
      .optional()
      .default('Declined by user'),
  }),
});

// Cancel session validation
const cancelSessionZodSchema = z.object({
  body: z.object({
    cancellationReason: z
      .string({
        required_error: 'Cancellation reason is required',
      })
      .trim()
      .min(10, 'Cancellation reason must be at least 10 characters'),
  }),
});

// Mark session as completed validation (Manual completion)
const completeSessionZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Session ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format'),
  }),
});

// Reschedule session validation
const rescheduleSessionZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Session ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format'),
  }),
  body: z.object({
    newStartTime: z
      .string({
        required_error: 'New start time is required',
      })
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid start time format',
      })
      .refine(
        date => new Date(date) > new Date(),
        {
          message: 'New start time must be in the future',
        }
      ),
    reason: z
      .string()
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .optional(),
  }),
});

export const SessionValidation = {
  proposeSessionZodSchema,
  acceptSessionProposalZodSchema,
  counterProposeSessionZodSchema,
  rejectSessionProposalZodSchema,
  cancelSessionZodSchema,
  completeSessionZodSchema,
  rescheduleSessionZodSchema,
};