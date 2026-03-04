import { Model, Types } from 'mongoose';

export type WhiteboardRole = 'admin' | 'writer' | 'reader';

export type IWhiteboardSnapshot = {
  url: string;
  takenAt: Date;
  takenBy: Types.ObjectId;
};

export type IWhiteboardRoom = {
  _id: Types.ObjectId;
  uuid: string;
  name: string;
  createdBy: Types.ObjectId;
  participants: Types.ObjectId[];
  callId?: Types.ObjectId;
  isActive: boolean;
  snapshots: IWhiteboardSnapshot[];
  exportedState?: string;
  lastSavedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type WhiteboardRoomModel = Model<IWhiteboardRoom>;
