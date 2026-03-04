import { model, Schema } from 'mongoose';
import { ISubject, SubjectModel } from './subject.interface';

const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
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
subjectSchema.index({ isActive: 1 });

export const Subject = model<ISubject, SubjectModel>('Subject', subjectSchema);
