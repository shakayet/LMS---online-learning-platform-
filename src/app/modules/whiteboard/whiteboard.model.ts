import { Schema, model } from 'mongoose';
import { IWhiteboardRoom, WhiteboardRoomModel } from './whiteboard.interface';

const whiteboardSnapshotSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    takenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    takenBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

const whiteboardRoomSchema = new Schema<IWhiteboardRoom, WhiteboardRoomModel>(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    snapshots: [whiteboardSnapshotSchema],
    exportedState: String,
    lastSavedAt: Date,
  },
  { timestamps: true }
);

// Indexes
whiteboardRoomSchema.index({ createdBy: 1 });
whiteboardRoomSchema.index({ callId: 1 });
whiteboardRoomSchema.index({ isActive: 1 });

export const WhiteboardRoom = model<IWhiteboardRoom, WhiteboardRoomModel>(
  'WhiteboardRoom',
  whiteboardRoomSchema
);
