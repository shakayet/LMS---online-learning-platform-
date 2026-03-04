import { Model, Types } from 'mongoose';

export type CallType = 'video' | 'voice';

export type CallStatus =
  | 'pending'
  | 'active'
  | 'ended'
  | 'missed'
  | 'rejected'
  | 'cancelled';

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'unknown';

export type ICallParticipant = {
  userId: Types.ObjectId;
  agoraUid: number;
  joinedAt: Date;
  leftAt?: Date;
  duration?: number;
  connectionQuality?: ConnectionQuality;
};

export type ICall = {
  _id: Types.ObjectId;
  channelName: string;
  callType: CallType;
  participants: Types.ObjectId[];
  initiator: Types.ObjectId;
  receiver: Types.ObjectId;
  status: CallStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  chatId?: Types.ObjectId;
  sessionId?: Types.ObjectId;
  whiteboardRoomUuid?: string;
  hasWhiteboard: boolean;
  participantSessions: ICallParticipant[];
  maxConcurrentParticipants: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CallModel = Model<ICall>;
