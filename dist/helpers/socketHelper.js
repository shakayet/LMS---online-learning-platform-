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
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const logger_1 = require("../shared/logger");
const jwtHelper_1 = require("./jwtHelper");
const config_1 = __importDefault(require("../config"));
const message_model_1 = require("../app/modules/message/message.model");
const chat_model_1 = require("../app/modules/chat/chat.model");
const node_cache_1 = __importDefault(require("node-cache"));
const call_service_1 = require("../app/modules/call/call.service");
const whiteboard_service_1 = require("../app/modules/whiteboard/whiteboard.service");
const session_service_1 = require("../app/modules/session/session.service");
const user_model_1 = require("../app/modules/user/user.model");
const presenceHelper_1 = require("../app/helpers/presenceHelper");

const USER_ROOM = (userId) => `user::${userId}`;
const CHAT_ROOM = (chatId) => `chat::${chatId}`;
const TYPING_KEY = (chatId, userId) => `typing:${chatId}:${userId}`;
const TYPING_TTL_SECONDS = 5;
const typingThrottle = new node_cache_1.default({ stdTTL: TYPING_TTL_SECONDS, checkperiod: 10, useClones: false });

const socket = (io) => {
    io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {

            const token = ((_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token) ||
                ((_b = socket.handshake.query) === null || _b === void 0 ? void 0 : _b.token);
            if (!token || typeof token !== 'string') {
                logger_1.logger.warn(colors_1.default.yellow('Socket connection without token. Disconnecting.'));
                return socket.disconnect(true);
            }
            let payload;
            try {
                payload = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
            }
            catch (err) {
                logger_1.logger.warn(colors_1.default.red('Invalid JWT on socket connection. Disconnecting.'));
                return socket.disconnect(true);
            }
            const userId = payload === null || payload === void 0 ? void 0 : payload.id;
            if (!userId) {
                logger_1.logger.warn(colors_1.default.red('JWT payload missing id. Disconnecting.'));
                return socket.disconnect(true);
            }

            yield (0, presenceHelper_1.setOnline)(userId);
            yield (0, presenceHelper_1.incrConnCount)(userId);
            yield (0, presenceHelper_1.updateLastActive)(userId);
            socket.join(USER_ROOM(userId));
            logger_1.logger.info(colors_1.default.blue(`✅ User ${userId} connected & joined ${USER_ROOM(userId)}`));
            logEvent('socket_connected', `for user_id: ${userId}`);

            const handleEventProcessed = (event, extra) => {
                (0, presenceHelper_1.updateLastActive)(userId).catch(() => { });
                logEvent(event, extra);
            };

            socket.on('JOIN_CHAT', (_a) => __awaiter(void 0, [_a], void 0, function* ({ chatId }) {
                if (!chatId)
                    return;

                const allowed = yield chat_model_1.Chat.exists({ _id: chatId, participants: userId });
                if (!allowed) {
                    socket.emit('ACK_ERROR', {
                        message: 'You are not a participant of this chat',
                        chatId: String(chatId),
                    });
                    handleEventProcessed('JOIN_CHAT_DENIED', `for chat_id: ${chatId}`);
                    return;
                }
                socket.join(CHAT_ROOM(chatId));
                yield (0, presenceHelper_1.addUserRoom)(userId, chatId);
                handleEventProcessed('JOIN_CHAT', `for chat_id: ${chatId}`);

                const lastActive = yield (0, presenceHelper_1.getLastActive)(userId);
                io.to(CHAT_ROOM(chatId)).emit('USER_ONLINE', {
                    userId,
                    chatId,
                    lastActive,
                });
                logger_1.logger.info(colors_1.default.green(`User ${userId} joined chat room ${CHAT_ROOM(chatId)}`));

                try {
                    const undelivered = yield message_model_1.Message.find({
                        chatId,
                        sender: { $ne: userId },
                        deliveredTo: { $nin: [userId] },
                    }, { _id: 1 });
                    if (undelivered && undelivered.length > 0) {
                        const ids = undelivered.map(m => m._id);
                        yield message_model_1.Message.updateMany({ _id: { $in: ids } }, { $addToSet: { deliveredTo: userId } });
                        for (const msg of undelivered) {
                            io.to(CHAT_ROOM(String(chatId))).emit('MESSAGE_DELIVERED', {
                                messageId: String(msg._id),
                                chatId: String(chatId),
                                userId,
                            });
                        }
                        logger_1.logger.info(colors_1.default.green(`Auto-delivered ${undelivered.length} pending messages for user ${userId} on join to ${CHAT_ROOM(chatId)}`));
                        handleEventProcessed('AUTO_DELIVERED_ON_JOIN', `count=${undelivered.length} chat_id=${chatId}`);
                    }
                }
                catch (err) {
                    logger_1.logger.error(colors_1.default.red(`JOIN_CHAT auto deliver error: ${String(err)}`));
                }
            }));
            socket.on('LEAVE_CHAT', (_a) => __awaiter(void 0, [_a], void 0, function* ({ chatId }) {
                if (!chatId)
                    return;

                const allowed = yield chat_model_1.Chat.exists({ _id: chatId, participants: userId });
                if (!allowed) {
                    socket.emit('ACK_ERROR', {
                        message: 'You are not a participant of this chat',
                        chatId: String(chatId),
                    });
                    handleEventProcessed('LEAVE_CHAT_DENIED', `for chat_id: ${chatId}`);
                    return;
                }
                socket.leave(CHAT_ROOM(chatId));
                yield (0, presenceHelper_1.removeUserRoom)(userId, chatId);
                handleEventProcessed('LEAVE_CHAT', `for chat_id: ${chatId}`);

                const lastActive = yield (0, presenceHelper_1.getLastActive)(userId);
                io.to(CHAT_ROOM(chatId)).emit('USER_OFFLINE', {
                    userId,
                    chatId,
                    lastActive,
                });
                logger_1.logger.info(colors_1.default.yellow(`User ${userId} left chat room ${CHAT_ROOM(chatId)}`));
            }));

            socket.on('TYPING_START', (_a) => __awaiter(void 0, [_a], void 0, function* ({ chatId }) {
                if (!chatId)
                    return;

                const allowed = yield chat_model_1.Chat.exists({ _id: chatId, participants: userId });
                if (!allowed) {
                    handleEventProcessed('TYPING_START_DENIED', `for chat_id: ${chatId}`);
                    return;
                }

                {
                    const key = TYPING_KEY(chatId, userId);
                    if (typingThrottle.has(key)) {
                        handleEventProcessed('TYPING_START_THROTTLED_SKIP', `for chat_id: ${chatId}`);
                        return;
                    }
                    typingThrottle.set(key, 1, TYPING_TTL_SECONDS);
                }
                io.to(CHAT_ROOM(chatId)).emit('TYPING_START', { userId, chatId });
                handleEventProcessed('TYPING_START', `for chat_id: ${chatId}`);
            }));
            socket.on('TYPING_STOP', (_a) => __awaiter(void 0, [_a], void 0, function* ({ chatId }) {
                if (!chatId)
                    return;

                const allowed = yield chat_model_1.Chat.exists({ _id: chatId, participants: userId });
                if (!allowed) {
                    handleEventProcessed('TYPING_STOP_DENIED', `for chat_id: ${chatId}`);
                    return;
                }

                typingThrottle.del(TYPING_KEY(chatId, userId));
                io.to(CHAT_ROOM(chatId)).emit('TYPING_STOP', { userId, chatId });
                handleEventProcessed('TYPING_STOP', `for chat_id: ${chatId}`);
            }));

            socket.on('DELIVERED_ACK', (_a) => __awaiter(void 0, [_a], void 0, function* ({ messageId }) {
                try {
                    const found = yield message_model_1.Message.findById(messageId).select('_id chatId');
                    if (!found) {
                        socket.emit('ACK_ERROR', {
                            message: 'Message not found',
                            messageId,
                        });
                        return;
                    }
                    const allowed = yield chat_model_1.Chat.exists({ _id: found.chatId, participants: userId });
                    if (!allowed) {
                        socket.emit('ACK_ERROR', {
                            message: 'You are not a participant of this chat',
                            chatId: String(found.chatId),
                            messageId: String(found._id),
                        });
                        handleEventProcessed('DELIVERED_ACK_DENIED', `chat_id: ${String(found.chatId)}`);
                        return;
                    }
                    const msg = yield message_model_1.Message.findByIdAndUpdate(messageId, { $addToSet: { deliveredTo: userId } }, { new: true });
                    if (msg) {
                        io.to(CHAT_ROOM(String(msg.chatId))).emit('MESSAGE_DELIVERED', {
                            messageId: String(msg._id),
                            chatId: String(msg.chatId),
                            userId,
                        });
                        handleEventProcessed('DELIVERED_ACK', `for message_id: ${String(msg._id)}`);
                    }
                }
                catch (err) {
                    logger_1.logger.error(colors_1.default.red(`❌ DELIVERED_ACK error: ${String(err)}`));
                }
            }));
            socket.on('READ_ACK', (_a) => __awaiter(void 0, [_a], void 0, function* ({ messageId }) {
                try {
                    const found = yield message_model_1.Message.findById(messageId).select('_id chatId');
                    if (!found) {
                        socket.emit('ACK_ERROR', {
                            message: 'Message not found',
                            messageId,
                        });
                        return;
                    }
                    const allowed = yield chat_model_1.Chat.exists({ _id: found.chatId, participants: userId });
                    if (!allowed) {
                        socket.emit('ACK_ERROR', {
                            message: 'You are not a participant of this chat',
                            chatId: String(found.chatId),
                            messageId: String(found._id),
                        });
                        handleEventProcessed('READ_ACK_DENIED', `chat_id: ${String(found.chatId)}`);
                        return;
                    }
                    const msg = yield message_model_1.Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: userId } }, { new: true });
                    if (msg) {
                        io.to(CHAT_ROOM(String(msg.chatId))).emit('MESSAGE_READ', {
                            messageId: String(msg._id),
                            chatId: String(msg.chatId),
                            userId,
                        });
                        handleEventProcessed('READ_ACK', `for message_id: ${String(msg._id)}`);
                    }
                }
                catch (err) {
                    logger_1.logger.error(colors_1.default.red(`❌ READ_ACK error: ${String(err)}`));
                }
            }));

            socket.on('CALL_INITIATE', (_a) => __awaiter(void 0, [_a], void 0, function* ({ receiverId, callType, chatId, }) {
                try {
                    const { call, token, channelName, uid } = yield call_service_1.CallService.initiateCall(userId, receiverId, callType, chatId);

                    const caller = yield user_model_1.User.findById(userId).select('name profilePicture');

                    socket.emit('CALL_INITIATED', {
                        callId: call._id,
                        channelName,
                        token,
                        uid,
                        callType,
                    });

                    io.to(USER_ROOM(receiverId)).emit('INCOMING_CALL', {
                        callId: call._id,
                        channelName,
                        callType,
                        caller: {
                            id: userId,
                            name: caller === null || caller === void 0 ? void 0 : caller.name,
                            profilePicture: caller === null || caller === void 0 ? void 0 : caller.profilePicture,
                        },
                    });
                    handleEventProcessed('CALL_INITIATE', `to: ${receiverId}, type: ${callType}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_INITIATE error: ${String(err)}`));
                }
            }));

            socket.on('CALL_ACCEPT', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const { call, token, uid } = yield call_service_1.CallService.acceptCall(callId, userId);

                    socket.emit('CALL_ACCEPTED', {
                        callId,
                        channelName: call.channelName,
                        token,
                        uid,
                    });

                    io.to(USER_ROOM(call.initiator.toString())).emit('CALL_ACCEPTED_BY_RECEIVER', { callId });
                    handleEventProcessed('CALL_ACCEPT', `callId: ${callId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_ACCEPT error: ${String(err)}`));
                }
            }));

            socket.on('CALL_REJECT', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const call = yield call_service_1.CallService.rejectCall(callId, userId);

                    io.to(USER_ROOM(call.initiator.toString())).emit('CALL_REJECTED', {
                        callId,
                    });
                    handleEventProcessed('CALL_REJECT', `callId: ${callId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_REJECT error: ${String(err)}`));
                }
            }));

            socket.on('CALL_END', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const call = yield call_service_1.CallService.endCall(callId, userId);

                    call.participants.forEach(participantId => {
                        if (participantId.toString() !== userId) {
                            io.to(USER_ROOM(participantId.toString())).emit('CALL_ENDED', {
                                callId,
                                duration: call.duration,
                            });
                        }
                    });
                    handleEventProcessed('CALL_END', `callId: ${callId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_END error: ${String(err)}`));
                }
            }));

            socket.on('CALL_CANCEL', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const call = yield call_service_1.CallService.cancelCall(callId, userId);

                    io.to(USER_ROOM(call.receiver.toString())).emit('CALL_CANCELLED', {
                        callId,
                    });
                    handleEventProcessed('CALL_CANCEL', `callId: ${callId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_CANCEL error: ${String(err)}`));
                }
            }));

            socket.on('CALL_JOIN_SESSION', (_a) => __awaiter(void 0, [_a], void 0, function* ({ sessionId, otherUserId, callType = 'video', }) {
                try {
                    const { call, token, channelName, uid, isNew } = yield call_service_1.CallService.joinSessionCall(userId, sessionId, otherUserId, callType);

                    socket.emit('SESSION_CALL_JOINED', {
                        callId: call._id,
                        channelName,
                        token,
                        uid,
                        callType,
                        isNew,
                    });

                    if (isNew) {
                        const caller = yield user_model_1.User.findById(userId).select('name profilePicture');
                        io.to(USER_ROOM(otherUserId)).emit('SESSION_CALL_READY', {
                            callId: call._id,
                            channelName,
                            sessionId,
                            callType,
                            caller: {
                                id: userId,
                                name: caller === null || caller === void 0 ? void 0 : caller.name,
                                profilePicture: caller === null || caller === void 0 ? void 0 : caller.profilePicture,
                            },
                        });
                    }
                    handleEventProcessed('CALL_JOIN_SESSION', `sessionId: ${sessionId}, channelName: ${channelName}, isNew: ${isNew}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_JOIN_SESSION error: ${String(err)}`));
                }
            }));

            socket.on('CALL_USER_JOINED_CHANNEL', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId, agoraUid }) {
                try {
                    const { call, activeCount } = yield call_service_1.CallService.recordParticipantJoin(callId, userId, agoraUid);

                    call.participants.forEach(participantId => {
                        io.to(USER_ROOM(participantId.toString())).emit('CALL_PARTICIPANT_JOINED', {
                            callId,
                            userId,
                            agoraUid,
                            activeParticipants: activeCount,
                        });
                    });

                    if (activeCount >= 2) {
                        call.participants.forEach(participantId => {
                            io.to(USER_ROOM(participantId.toString())).emit('CALL_BOTH_CONNECTED', {
                                callId,
                                message: 'Both participants are now connected',
                            });
                        });
                    }
                    handleEventProcessed('CALL_USER_JOINED_CHANNEL', `callId: ${callId}, userId: ${userId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_USER_JOINED_CHANNEL error: ${String(err)}`));
                }
            }));

            socket.on('CALL_USER_LEFT_CHANNEL', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const { call, activeCount } = yield call_service_1.CallService.recordParticipantLeave(callId, userId);

                    if (call.sessionId) {
                        try {
                            yield session_service_1.SessionService.syncAttendanceFromCall(call.sessionId.toString());
                            logger_1.logger.info(colors_1.default.cyan(`Session attendance synced for session: ${call.sessionId}`));
                        }
                        catch (syncErr) {

                            logger_1.logger.warn(colors_1.default.yellow(`Failed to sync session attendance: ${String(syncErr)}`));
                        }
                    }

                    call.participants.forEach(participantId => {
                        if (participantId.toString() !== userId) {
                            io.to(USER_ROOM(participantId.toString())).emit('CALL_PARTICIPANT_LEFT', {
                                callId,
                                userId,
                                activeParticipants: activeCount,
                            });
                        }
                    });
                    handleEventProcessed('CALL_USER_LEFT_CHANNEL', `callId: ${callId}, userId: ${userId}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_USER_LEFT_CHANNEL error: ${String(err)}`));
                }
            }));

            socket.on('CALL_ENABLE_WHITEBOARD', (_a) => __awaiter(void 0, [_a], void 0, function* ({ callId }) {
                try {
                    const { room, token, isNew } = yield whiteboard_service_1.WhiteboardService.getOrCreateRoomForCall(callId, userId);

                    const call = yield call_service_1.CallService.getCallById(callId, userId);
                    call.participants.forEach((participantId) => {
                        io.to(USER_ROOM(typeof participantId === 'object'
                            ? participantId._id.toString()
                            : participantId.toString())).emit('WHITEBOARD_ENABLED', {
                            callId,
                            roomUuid: room.uuid,
                            roomToken: token,
                            isNew,
                        });
                    });
                    handleEventProcessed('CALL_ENABLE_WHITEBOARD', `callId: ${callId}, roomUuid: ${room.uuid}`);
                }
                catch (err) {
                    socket.emit('CALL_ERROR', { message: String(err) });
                    logger_1.logger.error(colors_1.default.red(`CALL_ENABLE_WHITEBOARD error: ${String(err)}`));
                }
            }));

            socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    yield (0, presenceHelper_1.updateLastActive)(userId);
                    const remaining = yield (0, presenceHelper_1.decrConnCount)(userId);
                    const lastActive = yield (0, presenceHelper_1.getLastActive)(userId);

                    if (!remaining || remaining <= 0) {
                        yield (0, presenceHelper_1.setOffline)(userId);

                        try {
                            const rooms = yield (0, presenceHelper_1.getUserRooms)(userId);
                            for (const chatId of rooms || []) {
                                io.to(CHAT_ROOM(String(chatId))).emit('USER_OFFLINE', {
                                    userId,
                                    chatId: String(chatId),
                                    lastActive,
                                });
                            }
                            yield (0, presenceHelper_1.clearUserRooms)(userId);
                        }
                        catch (_a) { }
                    }
                    else {
                        logger_1.logger.info(colors_1.default.yellow(`User ${userId} disconnected one session; ${remaining} session(s) remain.`));
                    }
                    logger_1.logger.info(colors_1.default.red(`User ${userId} disconnected`));
                    logEvent('socket_disconnected', `for user_id: ${userId}`);
                }
                catch (err) {
                    logger_1.logger.error(colors_1.default.red(`❌ Disconnect handling error: ${String(err)}`));
                }
            }));
        }
        catch (err) {
            logger_1.logger.error(colors_1.default.red(`Socket connection error: ${String(err)}`));
            try {
                socket.disconnect(true);
            }
            catch (_c) { }
        }
    }));
};

const logEvent = (event, extra) => {
    logger_1.logger.info(`🔔 Event processed: ${event} ${extra || ''}`);
};
exports.socketHelper = { socket };
