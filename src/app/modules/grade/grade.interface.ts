import { Model } from 'mongoose';

export type IGrade = {
  name: string; // e.g., "Grade 1", "Grade 2", "Semester 1"
  isActive: boolean;
};

export type GradeModel = Model<IGrade>;
