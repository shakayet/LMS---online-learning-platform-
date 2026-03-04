import { Model, Types } from 'mongoose';

// Support ticket categories - predefined options for dropdown
export enum TICKET_CATEGORY {
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  PAYMENT_BILLING = 'PAYMENT_BILLING',
  SESSION_PROBLEM = 'SESSION_PROBLEM',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  SCHEDULING = 'SCHEDULING',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  OTHER = 'OTHER',
}

// Ticket status for admin to track
export enum TICKET_STATUS {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Ticket priority for admin to prioritize
export enum TICKET_PRIORITY {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export type ISupportTicket = {
  _id?: Types.ObjectId;
  ticketNumber: string;
  user: Types.ObjectId;
  userRole: 'STUDENT' | 'TUTOR';
  category: TICKET_CATEGORY;
  subject: string;
  message: string;
  attachments?: string[];
  status: TICKET_STATUS;
  priority: TICKET_PRIORITY;
  adminNotes?: string;
  assignedTo?: Types.ObjectId;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ISupportTicketFilters = {
  searchTerm?: string;
  status?: TICKET_STATUS;
  category?: TICKET_CATEGORY;
  priority?: TICKET_PRIORITY;
  userRole?: 'STUDENT' | 'TUTOR';
  user?: string;
};

export type SupportTicketModel = Model<ISupportTicket>;
