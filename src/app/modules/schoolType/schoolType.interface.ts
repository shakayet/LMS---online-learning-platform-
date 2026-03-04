import { Model } from 'mongoose';

export type ISchoolType = {
  name: string; // e.g., "Grundschule", "Gymnasium"
  isActive: boolean;
};

export type SchoolTypeModel = Model<ISchoolType>;
