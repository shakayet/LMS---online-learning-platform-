import { model, Schema } from 'mongoose';
import { IGrade, GradeModel } from './grade.interface';

const gradeSchema = new Schema<IGrade>(
  {
    name: {
      type: String,
      required: [true, 'Grade name is required'],
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
gradeSchema.index({ isActive: 1 });

export const Grade = model<IGrade, GradeModel>('Grade', gradeSchema);
