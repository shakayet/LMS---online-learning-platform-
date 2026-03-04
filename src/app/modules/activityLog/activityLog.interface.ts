import { Types } from 'mongoose';

export const ACTION_TYPES = [
  'USER_REGISTERED',
  'TUTOR_VERIFIED',
  'SESSION_COMPLETED',
  'SESSION_SCHEDULED',
  'SESSION_CANCELLED',
  'PAYMENT_COMPLETED',
  'PAYMENT_FAILED',
  'SUBSCRIPTION_CREATED',
  'TRIAL_REQUEST_CREATED',
  'APPLICATION_SUBMITTED',
  'APPLICATION_APPROVED',
  'APPLICATION_REJECTED',
  'APPLICATION_RESUBMITTED',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const ENTITY_TYPES = ['USER', 'SESSION', 'PAYMENT', 'APPLICATION', 'SUBSCRIPTION', 'TRIAL_REQUEST'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ACTIVITY_STATUS = ['success', 'pending', 'warning', 'error'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUS)[number];

export interface IActivityLog {
  userId?: Types.ObjectId;
  actionType: ActionType;
  title: string;
  description: string;
  entityType: EntityType;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  status: ActivityStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IActivityLogCreate {
  userId?: Types.ObjectId | string;
  actionType: ActionType;
  title: string;
  description: string;
  entityType: EntityType;
  entityId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  status?: ActivityStatus;
}

export interface IActivityLogQuery {
  page?: number;
  limit?: number;
  actionType?: string;
  status?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}

export interface IActivityLogResponse {
  _id: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  actionType: ActionType;
  title: string;
  description: string;
  entityType: EntityType;
  entityId?: string;
  status: ActivityStatus;
  createdAt: string;
}
