import { Model } from 'mongoose';

export type ISubject = {
  name: string; // e.g., "Mathematics"
  isActive: boolean;
};

export type SubjectModel = Model<ISubject>;
