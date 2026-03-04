"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketValidation = void 0;
const zod_1 = require("zod");
const supportTicket_interface_1 = require("./supportTicket.interface");
const createSupportTicketZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        category: zod_1.z.enum(Object.values(supportTicket_interface_1.TICKET_CATEGORY), {
            required_error: 'Category is required',
        }),
        subject: zod_1.z
            .string({
            required_error: 'Subject is required',
        })
            .trim()
            .min(5, 'Subject must be at least 5 characters')
            .max(200, 'Subject cannot exceed 200 characters'),
        message: zod_1.z
            .string({
            required_error: 'Message is required',
        })
            .trim()
            .min(10, 'Message must be at least 10 characters')
            .max(2000, 'Message cannot exceed 2000 characters'),
        attachments: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
const updateTicketStatusZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(Object.values(supportTicket_interface_1.TICKET_STATUS), {
            required_error: 'Status is required',
        }),
        adminNotes: zod_1.z.string().trim().optional(),
    }),
});
const updateTicketPriorityZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        priority: zod_1.z.enum(Object.values(supportTicket_interface_1.TICKET_PRIORITY), {
            required_error: 'Priority is required',
        }),
    }),
});
const assignTicketZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        assignedTo: zod_1.z.string({
            required_error: 'Admin ID is required',
        }),
    }),
});
const addAdminNoteZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        adminNotes: zod_1.z
            .string({
            required_error: 'Admin notes are required',
        })
            .trim()
            .min(1, 'Admin notes cannot be empty'),
    }),
});
exports.SupportTicketValidation = {
    createSupportTicketZodSchema,
    updateTicketStatusZodSchema,
    updateTicketPriorityZodSchema,
    assignTicketZodSchema,
    addAdminNoteZodSchema,
};
