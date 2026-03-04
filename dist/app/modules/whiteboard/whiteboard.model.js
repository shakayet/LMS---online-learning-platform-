"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardRoom = void 0;
const mongoose_1 = require("mongoose");
const whiteboardSnapshotSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { _id: false });
const whiteboardRoomSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    callId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Call',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    snapshots: [whiteboardSnapshotSchema],
    exportedState: String,
    lastSavedAt: Date,
}, { timestamps: true });
// Indexes
whiteboardRoomSchema.index({ createdBy: 1 });
whiteboardRoomSchema.index({ callId: 1 });
whiteboardRoomSchema.index({ isActive: 1 });
exports.WhiteboardRoom = (0, mongoose_1.model)('WhiteboardRoom', whiteboardRoomSchema);
