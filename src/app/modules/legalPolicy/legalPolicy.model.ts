import { model, Schema } from 'mongoose';
import { ILegalPolicy, LegalPolicyModel, POLICY_TYPE } from './legalPolicy.interface';

const legalPolicySchema = new Schema<ILegalPolicy>(
  {
    type: {
      type: String,
      enum: Object.values(POLICY_TYPE),
      required: [true, 'Policy type is required'],
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Policy title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Policy content is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: String,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for faster queries
legalPolicySchema.index({ type: 1 });
legalPolicySchema.index({ isActive: 1 });

export const LegalPolicy = model<ILegalPolicy, LegalPolicyModel>('LegalPolicy', legalPolicySchema);