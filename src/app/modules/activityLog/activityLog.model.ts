import { Schema, model, Document } from 'mongoose';
import { IActivityLog, ACTION_TYPES, ENTITY_TYPES, ACTIVITY_STATUS } from './activityLog.interface';

export interface IActivityLogDocument extends IActivityLog, Document {}

const activityLogSchema = new Schema<IActivityLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    actionType: {
      type: String,
      enum: ACTION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ACTIVITY_STATUS,
      default: 'success',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ status: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLogDocument>('ActivityLog', activityLogSchema);
