"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Call = void 0;
const mongoose_1 = require("mongoose");
const callParticipantSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { _id: false });
const callSchema = new mongoose_1.Schema({
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    initiator: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, { timestamps: true });
// Indexes for faster queries
callSchema.index({ participants: 1 });
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ chatId: 1 });
exports.Call = (0, mongoose_1.model)('Call', callSchema);
