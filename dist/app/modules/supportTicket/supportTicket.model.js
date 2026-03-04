"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicket = void 0;
const mongoose_1 = require("mongoose");
const supportTicket_interface_1 = require("./supportTicket.interface");
const supportTicketSchema = new mongoose_1.Schema({
    ticketNumber: {
        type: String,
        required: true,
        unique: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
    },
    userRole: {
        type: String,
        enum: ['STUDENT', 'TUTOR'],
        required: [true, 'User role is required'],
    },
    category: {
        type: String,
        enum: Object.values(supportTicket_interface_1.TICKET_CATEGORY),
        required: [true, 'Category is required'],
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true,
        maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    attachments: {
        type: [String],
        default: [],
    },
    status: {
        type: String,
        enum: Object.values(supportTicket_interface_1.TICKET_STATUS),
        default: supportTicket_interface_1.TICKET_STATUS.OPEN,
    },
    priority: {
        type: String,
        enum: Object.values(supportTicket_interface_1.TICKET_PRIORITY),
        default: supportTicket_interface_1.TICKET_PRIORITY.MEDIUM,
    },
    adminNotes: {
        type: String,
        trim: true,
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    resolvedAt: {
        type: Date,
    },
    closedAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes for faster queries
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ createdAt: -1 });
exports.SupportTicket = (0, mongoose_1.model)('SupportTicket', supportTicketSchema);
