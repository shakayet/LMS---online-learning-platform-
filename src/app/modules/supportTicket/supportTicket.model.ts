import { model, Schema } from 'mongoose';
import {
  ISupportTicket,
  SupportTicketModel,
  TICKET_CATEGORY,
  TICKET_STATUS,
  TICKET_PRIORITY,
} from './supportTicket.interface';

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
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
      enum: Object.values(TICKET_CATEGORY),
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
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ user: 1 });
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ createdAt: -1 });

export const SupportTicket = model<ISupportTicket, SupportTicketModel>(
  'SupportTicket',
  supportTicketSchema
);
