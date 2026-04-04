import { Model } from 'mongoose';

export type ISubject = {
  name: string;
  isActive: boolean;
};

export type SubjectModel = Model<ISubject>;
