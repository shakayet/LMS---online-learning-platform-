import { Model, Types } from 'mongoose';

export type AttachmentType = 'image' | 'audio' | 'video' | 'file';

export type IMessageAttachment = {
  type: AttachmentType;
  url: string;
  name?: string;
  size?: number;
  mime?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type ISessionProposal = {
  subject: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  price: number;
  description?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COUNTER_PROPOSED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'STARTING_SOON' | 'IN_PROGRESS';
  sessionId?: Types.ObjectId;
  rejectionReason?: string;
  expiresAt: Date;
  originalProposalId?: Types.ObjectId;
  counterProposalReason?: string;
  noShowBy?: 'tutor' | 'student';
};

export type IMessage = {
  chatId: Types.ObjectId;
  sender: Types.ObjectId;
  text?: string;
  content?: string;
  type: 'text' | 'image' | 'media' | 'doc' | 'mixed' | 'session_proposal';
  attachments?: IMessageAttachment[];

  sessionProposal?: ISessionProposal;

  deliveredTo?: Types.ObjectId[];
  readBy?: Types.ObjectId[];
  status?: 'sent' | 'delivered' | 'seen';
  editedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
};

export type MessageModel = Model<IMessage>;
