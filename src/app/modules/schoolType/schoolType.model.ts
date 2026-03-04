import { model, Schema } from 'mongoose';
import { ISchoolType, SchoolTypeModel } from './schoolType.interface';

const schoolTypeSchema = new Schema<ISchoolType>(
  {
    name: {
      type: String,
      required: [true, 'School type name is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
schoolTypeSchema.index({ isActive: 1 });

export const SchoolType = model<ISchoolType, SchoolTypeModel>('SchoolType', schoolTypeSchema);
