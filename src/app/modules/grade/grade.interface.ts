import { Model } from 'mongoose';

export type IGrade = {
  name: string;
  isActive: boolean;
};

export type GradeModel = Model<IGrade>;
