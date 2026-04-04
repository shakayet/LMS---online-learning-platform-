import { Model } from 'mongoose';

export type ISchoolType = {
  name: string;
  isActive: boolean;
};

export type SchoolTypeModel = Model<ISchoolType>;
