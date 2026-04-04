import { z } from 'zod';

const createInterviewSlotZodSchema = z.object({
  body: z.object({
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
  }).refine(
    data => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  ),
});

const bookInterviewSlotZodSchema = z.object({
  body: z.object({
    applicationId: z
      .string({
        required_error: 'Application ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID format'),
  }),
});

const cancelInterviewSlotZodSchema = z.object({
  body: z.object({}).optional(),
});

const rescheduleInterviewSlotZodSchema = z.object({
  body: z.object({
    newSlotId: z
      .string({
        required_error: 'New slot ID is required',
      })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid new slot ID format'),
  }),
});

const updateInterviewSlotZodSchema = z.object({
  body: z.object({
    startTime: z
      .string()
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid start time format',
      })
      .optional(),

    endTime: z
      .string()
      .refine(date => !isNaN(Date.parse(date)), {
        message: 'Invalid end time format',
      })
      .optional(),

    status: z
      .enum(['AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED'])
      .optional(),
  }),
});

export const InterviewSlotValidation = {
  createInterviewSlotZodSchema,
  bookInterviewSlotZodSchema,
  cancelInterviewSlotZodSchema,
  rescheduleInterviewSlotZodSchema,
  updateInterviewSlotZodSchema,
};