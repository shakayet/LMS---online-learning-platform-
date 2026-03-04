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
exports.CallService = void 0;
const mongoose_1 = require("mongoose");
const http_status_codes_1 = require("http-status-codes");
const call_model_1 = require("./call.model");
const agora_helper_1 = require("./agora.helper");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
/**
 * নতুন Call শুরু করে
 */
const initiateCall = (initiatorId, receiverId, callType, chatId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!initiatorId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const channelName = (0, agora_helper_1.generateChannelName)();
    const uid = (0, agora_helper_1.userIdToAgoraUid)(initiatorId);
    const call = yield call_model_1.Call.create({
        channelName,
        callType,
        participants: [initiatorId, receiverId],
        initiator: initiatorId,
        receiver: receiverId,
        status: 'pending',
        chatId: chatId ? new mongoose_1.Types.ObjectId(chatId) : undefined,
    });
    const token = (0, agora_helper_1.generateRtcToken)(channelName, uid);
    return { call: call.toObject(), token, channelName, uid };
});
/**
 * Call Accept করলে token দেয়
 */
const acceptCall = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    if (call.receiver.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot accept this call');
    }
    if (call.status !== 'pending') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Call is no longer pending');
    }
    call.status = 'active';
    call.startTime = new Date();
    yield call.save();
    const uid = (0, agora_helper_1.userIdToAgoraUid)(userId);
    const token = (0, agora_helper_1.generateRtcToken)(call.channelName, uid);
    return { call: call.toObject(), token, uid };
});
/**
 * Call Reject করে
 */
const rejectCall = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    if (call.receiver.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot reject this call');
    }
    if (call.status !== 'pending') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Call is no longer pending');
    }
    call.status = 'rejected';
    call.endTime = new Date();
    yield call.save();
    return call.toObject();
});
/**
 * Call End করে
 */
const endCall = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    const isParticipant = call.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not in this call');
    }
    call.status = 'ended';
    call.endTime = new Date();
    if (call.startTime) {
        call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
    }
    yield call.save();
    return call.toObject();
});
/**
 * Call Cancel করে (Initiator রিং হওয়ার আগে cancel করলে)
 */
const cancelCall = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    if (call.initiator.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only initiator can cancel');
    }
    if (call.status !== 'pending') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Call cannot be cancelled');
    }
    call.status = 'cancelled';
    call.endTime = new Date();
    yield call.save();
    return call.toObject();
});
/**
 * Token Refresh করে (Call চলাকালীন)
 */
const refreshToken = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    const isParticipant = call.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not in this call');
    }
    if (call.status !== 'active') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Call is not active');
    }
    const uid = (0, agora_helper_1.userIdToAgoraUid)(userId);
    const token = (0, agora_helper_1.generateRtcToken)(call.channelName, uid);
    return { token, uid };
});
/**
 * User এর Call History
 */
const getCallHistory = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, page = 1, limit = 20) {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const skip = (page - 1) * limit;
    const [calls, total] = yield Promise.all([
        call_model_1.Call.find({ participants: userId })
            .populate('participants', 'name profilePicture')
            .populate('initiator', 'name profilePicture')
            .populate('receiver', 'name profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        call_model_1.Call.countDocuments({ participants: userId }),
    ]);
    return {
        calls: calls,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    };
});
/**
 * Single Call Details
 */
const getCallById = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    const call = yield call_model_1.Call.findById(callId)
        .populate('participants', 'name profilePicture')
        .populate('initiator', 'name profilePicture')
        .populate('receiver', 'name profilePicture')
        .lean();
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    const isParticipant = call.participants.some((p) => p._id.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot view this call');
    }
    return call;
});
/**
 * Call এর active participants দেখায়
 */
const getActiveParticipants = (callId) => __awaiter(void 0, void 0, void 0, function* () {
    const call = yield call_model_1.Call.findById(callId).populate('participantSessions.userId', 'name profilePicture');
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    const activeParticipants = call.participantSessions
        .filter(p => p.joinedAt && !p.leftAt)
        .map(p => ({
        user: p.userId,
        agoraUid: p.agoraUid,
        joinedAt: p.joinedAt,
    }));
    return {
        count: activeParticipants.length,
        participants: activeParticipants,
    };
});
/**
 * Participant join tracking
 */
const recordParticipantJoin = (callId, userId, agoraUid) => __awaiter(void 0, void 0, void 0, function* () {
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    call.participantSessions.push({
        userId: new mongoose_1.Types.ObjectId(userId),
        agoraUid,
        joinedAt: new Date(),
    });
    const activeCount = call.participantSessions.filter(p => p.joinedAt && !p.leftAt).length;
    if (activeCount > call.maxConcurrentParticipants) {
        call.maxConcurrentParticipants = activeCount;
    }
    yield call.save();
    return { call: call.toObject(), activeCount };
});
/**
 * Participant leave tracking
 */
const recordParticipantLeave = (callId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const call = yield call_model_1.Call.findById(callId);
    if (!call) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Call not found');
    }
    const session = call.participantSessions.find(p => p.userId.toString() === userId && !p.leftAt);
    if (session) {
        session.leftAt = new Date();
        session.duration = Math.floor((session.leftAt.getTime() - session.joinedAt.getTime()) / 1000);
    }
    yield call.save();
    const activeCount = call.participantSessions.filter(p => p.joinedAt && !p.leftAt).length;
    // Auto-end call if no one left
    if (activeCount === 0 && call.status === 'active') {
        call.status = 'ended';
        call.endTime = new Date();
        if (call.startTime) {
            call.duration = Math.floor((call.endTime.getTime() - call.startTime.getTime()) / 1000);
        }
        yield call.save();
    }
    return { call: call.toObject(), activeCount };
});
/**
 * Session-based Call Join করে
 * Session এর জন্য call থাকলে join করবে, না থাকলে নতুন তৈরি করবে
 * Both participants will join the SAME channel based on sessionId
 */
const joinSessionCall = (userId_1, sessionId_1, otherUserId_1, ...args_1) => __awaiter(void 0, [userId_1, sessionId_1, otherUserId_1, ...args_1], void 0, function* (userId, sessionId, otherUserId, callType = 'video') {
    if (!userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }
    // Generate deterministic channel name from sessionId
    const channelName = (0, agora_helper_1.generateSessionChannelName)(sessionId);
    const uid = (0, agora_helper_1.userIdToAgoraUid)(userId);
    // Check if a call already exists for this session (any status)
    let call = yield call_model_1.Call.findOne({ channelName });
    let isNew = false;
    if (!call) {
        // Create new call for this session
        call = yield call_model_1.Call.create({
            channelName,
            callType,
            participants: [userId, otherUserId],
            initiator: userId,
            receiver: otherUserId,
            status: 'active', // Session calls start as active immediately
            startTime: new Date(),
            sessionId: new mongoose_1.Types.ObjectId(sessionId),
        });
        isNew = true;
    }
    else if (call.status === 'ended' || call.status === 'cancelled' || call.status === 'missed' || call.status === 'rejected') {
        // Re-activate ended/cancelled call for this session (user rejoining)
        call.status = 'active';
        call.startTime = new Date();
        call.endTime = undefined;
        call.duration = undefined;
        // Make sure this user is a participant
        const isParticipant = call.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            call.participants.push(new mongoose_1.Types.ObjectId(userId));
        }
        yield call.save();
    }
    else {
        // Call is pending or active - just make sure user is participant
        const isParticipant = call.participants.some(p => p.toString() === userId);
        if (!isParticipant) {
            call.participants.push(new mongoose_1.Types.ObjectId(userId));
            yield call.save();
        }
    }
    const token = (0, agora_helper_1.generateRtcToken)(channelName, uid);
    return { call: call.toObject(), token, channelName, uid, isNew };
});
exports.CallService = {
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelCall,
    refreshToken,
    getCallHistory,
    getCallById,
    getActiveParticipants,
    recordParticipantJoin,
    recordParticipantLeave,
    joinSessionCall,
};
