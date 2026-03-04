import { Schema, model } from 'mongoose';
import { ICall, CallModel } from './call.interface';

const callParticipantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agoraUid: {
      type: Number,
      required: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leftAt: Date,
    duration: Number,
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'poor', 'unknown'],
    },
  },
  { _id: false }
);

const callSchema = new Schema<ICall, CallModel>(
  {
    channelName: {
      type: String,
      required: true,
      unique: true,
    },
    callType: {
      type: String,
      enum: ['video', 'voice'],
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    initiator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'ended', 'missed', 'rejected', 'cancelled'],
      default: 'pending',
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
    },
    whiteboardRoomUuid: String,
    hasWhiteboard: {
      type: Boolean,
      default: false,
    },
    participantSessions: [callParticipantSchema],
    maxConcurrentParticipants: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
callSchema.index({ participants: 1 });
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ chatId: 1 });

export const Call = model<ICall, CallModel>('Call', callSchema);
