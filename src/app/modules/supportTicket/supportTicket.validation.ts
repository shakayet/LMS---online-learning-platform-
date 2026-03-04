import { z } from 'zod';
import { TICKET_CATEGORY, TICKET_STATUS, TICKET_PRIORITY } from './supportTicket.interface';

const createSupportTicketZodSchema = z.object({
  body: z.object({
    category: z.enum(Object.values(TICKET_CATEGORY) as [string, ...string[]], {
      required_error: 'Category is required',
    }),
    subject: z
      .string({
        required_error: 'Subject is required',
      })
      .trim()
      .min(5, 'Subject must be at least 5 characters')
      .max(200, 'Subject cannot exceed 200 characters'),
    message: z
      .string({
        required_error: 'Message is required',
      })
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message cannot exceed 2000 characters'),
    attachments: z.array(z.string()).optional(),
  }),
});

const updateTicketStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(TICKET_STATUS) as [string, ...string[]], {
      required_error: 'Status is required',
    }),
    adminNotes: z.string().trim().optional(),
  }),
});

const updateTicketPriorityZodSchema = z.object({
  body: z.object({
    priority: z.enum(Object.values(TICKET_PRIORITY) as [string, ...string[]], {
      required_error: 'Priority is required',
    }),
  }),
});

const assignTicketZodSchema = z.object({
  body: z.object({
    assignedTo: z.string({
      required_error: 'Admin ID is required',
    }),
  }),
});

const addAdminNoteZodSchema = z.object({
  body: z.object({
    adminNotes: z
      .string({
        required_error: 'Admin notes are required',
      })
      .trim()
      .min(1, 'Admin notes cannot be empty'),
  }),
});

export const SupportTicketValidation = {
  createSupportTicketZodSchema,
  updateTicketStatusZodSchema,
  updateTicketPriorityZodSchema,
  assignTicketZodSchema,
  addAdminNoteZodSchema,
};
