"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardService = void 0;
const mongoose_1 = require("mongoose");
const http_status_codes_1 = require("http-status-codes");
const whiteboard_model_1 = require("./whiteboard.model");
const whiteboard_helper_1 = require("./whiteboard.helper");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
/**
 * নতুন Whiteboard Room তৈরি করে
 */
const createRoom = (userId, name, callId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    // Create room in Agora
    const { uuid } = yield (0, whiteboard_helper_1.createAgoraWhiteboardRoom)(name);
    // Get token for creator
    const token = yield (0, whiteboard_helper_1.generateWhiteboardRoomToken)(uuid, 'admin');
    // Save to database
    const room = yield whiteboard_model_1.WhiteboardRoom.create({
        uuid,
        name,
        createdBy: userId,
        participants: [userId],
        callId: callId ? new mongoose_1.Types.ObjectId(callId) : undefined,
        isActive: true,
    });
    return { room: room.toObject(), token };
});
/**
 * Room Token নেয়
 */
const getRoomToken = (roomId_1, userId_1, ...args_1) => __awaiter(void 0, [roomId_1, userId_1, ...args_1], void 0, function* (roomId, userId, role = 'writer') {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const room = yield whiteboard_model_1.WhiteboardRoom.findById(roomId);
    if (!room) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Whiteboard room not found');
    }
    if (!room.isActive) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Whiteboard room is closed');
    }
    // Add user to participants if not already
    const isParticipant = room.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
        room.participants.push(new mongoose_1.Types.ObjectId(userId));
        yield room.save();
    }
    const token = yield (0, whiteboard_helper_1.generateWhiteboardRoomToken)(room.uuid, role);
    return { token, room: room.toObject() };
});
/**
 * Room Token নেয় by UUID (for Call integration)
 */
const getRoomTokenByUuid = (uuid_1, userId_1, ...args_1) => __awaiter(void 0, [uuid_1, userId_1, ...args_1], void 0, function* (uuid, userId, role = 'writer') {
    const room = yield whiteboard_model_1.WhiteboardRoom.findOne({ uuid });
    if (!room) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Whiteboard room not found');
    }
    if (!room.isActive) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Whiteboard room is closed');
    }
    // Add user to participants if not already
    const isParticipant = room.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
        room.participants.push(new mongoose_1.Types.ObjectId(userId));
        yield room.save();
    }
    const token = yield (0, whiteboard_helper_1.generateWhiteboardRoomToken)(uuid, role);
    return { token, room: room.toObject() };
});
/**
 * User এর rooms দেখায়
 */
const getUserRooms = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, page = 1, limit = 20) {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const skip = (page - 1) * limit;
    const [rooms, total] = yield Promise.all([
        whiteboard_model_1.WhiteboardRoom.find({
            $or: [{ createdBy: userId }, { participants: userId }],
        })
            .populate('createdBy', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        whiteboard_model_1.WhiteboardRoom.countDocuments({
            $or: [{ createdBy: userId }, { participants: userId }],
        }),
    ]);
    return {
        rooms: rooms,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
});
/**
 * Room delete/close করে
 */
const deleteRoom = (roomId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const room = yield whiteboard_model_1.WhiteboardRoom.findById(roomId);
    if (!room) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Whiteboard room not found');
    }
    if (room.createdBy.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only room creator can delete this room');
    }
    // Close in Agora
    yield (0, whiteboard_helper_1.closeWhiteboardRoom)(room.uuid);
    // Update in database
    room.isActive = false;
    yield room.save();
});
/**
 * Snapshot নেয়
 */
const takeSnapshot = (roomId, userId, scenePath) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const room = yield whiteboard_model_1.WhiteboardRoom.findById(roomId);
    if (!room) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Whiteboard room not found');
    }
    const isParticipant = room.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant of this room');
    }
    const snapshotUrl = yield (0, whiteboard_helper_1.takeWhiteboardSnapshot)(room.uuid, scenePath);
    // Save snapshot to room
    room.snapshots.push({
        url: snapshotUrl,
        takenAt: new Date(),
        takenBy: new mongoose_1.Types.ObjectId(userId),
    });
    room.lastSavedAt = new Date();
    yield room.save();
    return { snapshotUrl };
});
/**
 * Room snapshots দেখায়
 */
const getRoomSnapshots = (roomId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const room = yield whiteboard_model_1.WhiteboardRoom.findById(roomId)
        .populate('snapshots.takenBy', 'name profilePicture')
        .lean();
    if (!room) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Whiteboard room not found');
    }
    const isParticipant = room.participants.some((p) => p.toString() === userId);
    if (!isParticipant && room.createdBy.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You do not have access to this room');
    }
    return room.snapshots;
});
/**
 * Call এর জন্য whiteboard তৈরি বা আনা
 */
const getOrCreateRoomForCall = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    // Check if room already exists for this call
    let room = yield whiteboard_model_1.WhiteboardRoom.findOne({ callId });
    if (room) {
        const token = yield (0, whiteboard_helper_1.generateWhiteboardRoomToken)(room.uuid, 'writer');
        // Add user to participants if not already
        const isParticipant = room.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            room.participants.push(new mongoose_1.Types.ObjectId(userId));
            yield room.save();
        }
        return { room: room.toObject(), token, isNew: false };
    }
    // Create new room
    const { room: newRoom, token } = yield createRoom(userId, `Call Whiteboard - ${callId}`, callId);
    return { room: newRoom, token, isNew: true };
});
exports.WhiteboardService = {
    createRoom,
    getRoomToken,
    getRoomTokenByUuid,
    getUserRooms,
    deleteRoom,
    takeSnapshot,
    getRoomSnapshots,
    getOrCreateRoomForCall,
};
