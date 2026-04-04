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
exports.SessionService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const chat_model_1 = require("../chat/chat.model");
const message_model_1 = require("../message/message.model");
const message_service_1 = require("../message/message.service");
const user_1 = require("../../../enums/user");
const session_interface_1 = require("./session.interface");
const session_model_1 = require("./session.model");
const call_model_1 = require("../call/call.model");
const tutorSessionFeedback_service_1 = require("../tutorSessionFeedback/tutorSessionFeedback.service");
const user_service_1 = require("../user/user.service");
const activityLog_service_1 = require("../activityLog/activityLog.service");
const logger_1 = require("../../../shared/logger");
const studentSubscription_service_1 = require("../studentSubscription/studentSubscription.service");

const TEST_MODE = true;

const TEST_SESSION_DURATION_MINUTES = 5;
const MINIMUM_ATTENDANCE_PERCENTAGE = 80;

const proposeSession = (tutorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can propose sessions');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can propose sessions');
    }

    const chat = yield chat_model_1.Chat.findById(payload.chatId);
    if (!chat) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Chat not found');
    }
    const isTutorParticipant = chat.participants.some((p) => p.toString() === tutorId);
    if (!isTutorParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }

    const otherParticipantId = chat.participants.find((p) => p.toString() !== tutorId);
    if (!otherParticipantId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No other participant found in chat');
    }
    const student = yield user_model_1.User.findById(otherParticipantId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Other participant not found');
    }

    if (student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session proposals can only be sent to students');
    }

    const pendingProposal = yield message_model_1.Message.findOne({
        chatId: chat._id,
        type: 'session_proposal',
        'sessionProposal.status': 'PROPOSED',
    });
    if (pendingProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'There is already a pending session proposal. Please wait for a response before creating a new one.');
    }

    const activeSession = yield session_model_1.Session.findOne({
        chatId: chat._id,
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.SCHEDULED,
                session_interface_1.SESSION_STATUS.STARTING_SOON,
                session_interface_1.SESSION_STATUS.IN_PROGRESS,
            ],
        },
    });
    if (activeSession) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'There is already an active session in this chat. Please wait for it to complete before scheduling a new one.');
    }
    const studentId = otherParticipantId;

    const startTime = new Date(payload.startTime);
    const endTime = new Date(payload.endTime);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    let pricePerHour = 30;
    if (((_b = student.studentProfile) === null || _b === void 0 ? void 0 : _b.currentPlan) === 'REGULAR') {
        pricePerHour = 28;
    }
    else if (((_c = student.studentProfile) === null || _c === void 0 ? void 0 : _c.currentPlan) === 'LONG_TERM') {
        pricePerHour = 25;
    }

    const totalPrice = pricePerHour;

    const message = yield message_service_1.MessageService.sendMessageToDB({
        chatId: payload.chatId,
        sender: tutorId,
        type: 'session_proposal',
        text: `Session proposal: ${payload.subject}`,
        sessionProposal: {
            subject: payload.subject,
            startTime,
            endTime,
            duration,
            price: totalPrice,
            description: payload.description,
            status: 'PROPOSED',
            expiresAt: startTime,
        },
    });
    return message;
});

const acceptSessionProposal = (messageId, userId) => __awaiter(void 0, void 0, void 0, function* () {

    const message = yield message_model_1.Message.findById(messageId).populate('chatId');
    if (!message) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session proposal not found');
    }
    if (message.type !== 'session_proposal' || !message.sessionProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This is not a session proposal');
    }

    const chat = message.chatId;
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }

    if (message.sender.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot accept your own proposal');
    }

    if (message.sessionProposal.status !== 'PROPOSED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`);
    }

    if (new Date() > message.sessionProposal.expiresAt) {
        message.sessionProposal.status = 'EXPIRED';
        yield message.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session proposal has expired');
    }

    const proposalSender = yield user_model_1.User.findById(message.sender);
    const accepter = yield user_model_1.User.findById(userId);
    if (!proposalSender || !accepter) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    let studentId;
    let tutorId;
    if (proposalSender.role === user_1.USER_ROLES.TUTOR) {

        tutorId = message.sender;
        studentId = new mongoose_1.Types.ObjectId(userId);
    }
    else if (proposalSender.role === user_1.USER_ROLES.STUDENT) {

        studentId = message.sender;
        tutorId = new mongoose_1.Types.ObjectId(userId);
    }
    else {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid proposal sender role');
    }

    const trialRequestId = chat.trialRequestId;
    const isTrial = !!trialRequestId;

    const chatIdForSession = typeof chat._id !== 'undefined' ? chat._id : message.chatId;
    const session = yield session_model_1.Session.create({
        studentId,
        tutorId,
        subject: message.sessionProposal.subject,
        description: message.sessionProposal.description,
        startTime: message.sessionProposal.startTime,
        endTime: message.sessionProposal.endTime,
        duration: message.sessionProposal.duration,
        pricePerHour: message.sessionProposal.price / (message.sessionProposal.duration / 60),
        totalPrice: message.sessionProposal.price,
        status: session_interface_1.SESSION_STATUS.SCHEDULED,
        messageId: message._id,
        chatId: chatIdForSession,
        isTrial,
        trialRequestId,
    });

    message.sessionProposal.status = 'ACCEPTED';
    message.sessionProposal.sessionId = session._id;
    yield message.save();

    const io = global.io;
    if (io) {
        const chatIdStr = String(chat._id);
        const proposalPayload = {
            messageId: String(message._id),
            chatId: chatIdStr,
            status: 'ACCEPTED',
            sessionId: String(session._id),
        };

        io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

        for (const participant of chat.participants) {
            io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
        }
    }

    const student = yield user_model_1.User.findById(studentId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: studentId,
        actionType: 'SESSION_SCHEDULED',
        title: 'Session Scheduled',
        description: `${(student === null || student === void 0 ? void 0 : student.name) || 'Student'} scheduled a ${session.subject} session`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'success',
    });

    return session;
});

const counterProposeSession = (originalMessageId, studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;

    const originalMessage = yield message_model_1.Message.findById(originalMessageId).populate('chatId');
    if (!originalMessage) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session proposal not found');
    }
    if (originalMessage.type !== 'session_proposal' || !originalMessage.sessionProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This is not a session proposal');
    }

    const chat = originalMessage.chatId;
    const isStudentParticipant = chat.participants.some((p) => p.toString() === studentId);
    if (!isStudentParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }

    if (originalMessage.sessionProposal.status !== 'PROPOSED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Session proposal is already ${originalMessage.sessionProposal.status.toLowerCase()}`);
    }

    if (new Date() > originalMessage.sessionProposal.expiresAt) {
        originalMessage.sessionProposal.status = 'EXPIRED';
        yield originalMessage.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session proposal has expired');
    }

    const newStartTime = new Date(payload.newStartTime);
    const newEndTime = new Date(payload.newEndTime);
    if (newStartTime <= new Date()) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New start time must be in the future');
    }
    if (newEndTime <= newStartTime) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'End time must be after start time');
    }

    const duration = (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60);

    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }

    let pricePerHour = 30;
    if (((_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.currentPlan) === 'REGULAR') {
        pricePerHour = 28;
    }
    else if (((_b = student.studentProfile) === null || _b === void 0 ? void 0 : _b.currentPlan) === 'LONG_TERM') {
        pricePerHour = 25;
    }

    const totalPrice = pricePerHour;

    originalMessage.sessionProposal.status = 'COUNTER_PROPOSED';
    yield originalMessage.save();

    const io = global.io;
    if (io) {
        const chatIdStr = String(chat._id);
        const proposalPayload = {
            messageId: String(originalMessage._id),
            chatId: chatIdStr,
            status: 'COUNTER_PROPOSED',
        };

        io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

        for (const participant of chat.participants) {
            io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
        }
    }

    const counterProposalMessage = yield message_service_1.MessageService.sendMessageToDB({
        chatId: chat._id.toString(),
        sender: studentId,
        type: 'session_proposal',
        text: `Counter-proposal: ${originalMessage.sessionProposal.subject}`,
        sessionProposal: {
            subject: originalMessage.sessionProposal.subject,
            startTime: newStartTime,
            endTime: newEndTime,
            duration,
            price: totalPrice,
            description: originalMessage.sessionProposal.description,
            status: 'PROPOSED',
            expiresAt: newStartTime,
            originalProposalId: originalMessage._id,
            counterProposalReason: payload.reason,
        },
    });
    return counterProposalMessage;
});

const rejectSessionProposal = (messageId, userId, rejectionReason) => __awaiter(void 0, void 0, void 0, function* () {
    const message = yield message_model_1.Message.findById(messageId).populate('chatId');
    if (!message) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session proposal not found');
    }
    if (message.type !== 'session_proposal' || !message.sessionProposal) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This is not a session proposal');
    }

    const chat = message.chatId;
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
    }

    if (message.sender.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot reject your own proposal');
    }

    if (message.sessionProposal.status !== 'PROPOSED') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`);
    }

    message.sessionProposal.status = 'REJECTED';
    message.sessionProposal.rejectionReason = rejectionReason;
    yield message.save();

    const io = global.io;
    if (io) {
        const chatIdStr = String(chat._id);
        const proposalPayload = {
            messageId: String(message._id),
            chatId: chatIdStr,
            status: 'REJECTED',
            rejectionReason,
        };

        io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

        for (const participant of chat.participants) {
            io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
        }
    }
    return message;
});

const getAllSessions = (query, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    let filter = {};

    if (userRole === user_1.USER_ROLES.STUDENT) {
        filter = { studentId: new mongoose_1.Types.ObjectId(userId) };
    }
    else if (userRole === user_1.USER_ROLES.TUTOR) {
        filter = { tutorId: new mongoose_1.Types.ObjectId(userId) };
    }

    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find(filter)
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});

const getSingleSession = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('tutorId', 'name email profilePicture phone')
        .populate('chatId')
        .populate('messageId')
        .populate('reviewId');
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    return session;
});

const cancelSession = (sessionId, userId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }

    if (session.studentId.toString() !== userId &&
        session.tutorId.toString() !== userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this session');
    }

    if (session.status !== session_interface_1.SESSION_STATUS.SCHEDULED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot cancel session with status: ${session.status}`);
    }

    session.status = session_interface_1.SESSION_STATUS.CANCELLED;
    session.cancellationReason = cancellationReason;
    session.cancelledBy = new mongoose_1.Types.ObjectId(userId);
    session.cancelledAt = new Date();
    yield session.save();

    if (session.messageId) {
        yield message_model_1.Message.findByIdAndUpdate(session.messageId, {
            'sessionProposal.status': 'CANCELLED',
        });

        const io = global.io;
        if (io && session.chatId) {
            const chatIdStr = String(session.chatId);
            const proposalPayload = {
                messageId: String(session.messageId),
                chatId: chatIdStr,
                status: 'CANCELLED',
            };

            io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

            io.to(`user::${String(session.studentId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(`user::${String(session.tutorId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
        }
    }

    const cancellingUser = yield user_model_1.User.findById(userId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: new mongoose_1.Types.ObjectId(userId),
        actionType: 'SESSION_CANCELLED',
        title: 'Session Cancelled',
        description: `${(cancellingUser === null || cancellingUser === void 0 ? void 0 : cancellingUser.name) || 'User'} cancelled a ${session.subject} session`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'warning',
    });

    return session;
});

const markAsCompleted = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session is already completed');
    }

    session.status = session_interface_1.SESSION_STATUS.COMPLETED;
    session.completedAt = new Date();
    yield session.save();

    return session;
});

const autoCompleteSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();

    const sessionsToComplete = yield session_model_1.Session.find({
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.SCHEDULED,
                session_interface_1.SESSION_STATUS.STARTING_SOON,
                session_interface_1.SESSION_STATUS.IN_PROGRESS,
            ],
        },
        endTime: { $lt: now },
    });
    let completedCount = 0;

    for (const session of sessionsToComplete) {
        try {
            session.status = session_interface_1.SESSION_STATUS.COMPLETED;
            session.completedAt = now;
            yield session.save();

            try {
                yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.createPendingFeedback(session._id.toString(), session.tutorId.toString(), session.studentId.toString(), now);
            }
            catch (_a) {

            }

            try {
                yield user_service_1.UserService.updateTutorLevelAfterSession(session.tutorId.toString());
            }
            catch (_b) {

            }
            completedCount++;
        }
        catch (_c) {

        }
    }
    return completedCount;
});

const getUpcomingSessions = (userId, userRole, query) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const filterField = userRole === user_1.USER_ROLES.STUDENT ? 'studentId' : 'tutorId';
    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find({
        [filterField]: new mongoose_1.Types.ObjectId(userId),
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.SCHEDULED,
                session_interface_1.SESSION_STATUS.STARTING_SOON,
                session_interface_1.SESSION_STATUS.IN_PROGRESS,
                session_interface_1.SESSION_STATUS.AWAITING_RESPONSE,
                session_interface_1.SESSION_STATUS.RESCHEDULE_REQUESTED,
            ],
        },
        startTime: { $gte: now },
    })
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture averageRating')
        .populate('reviewId')
        .populate('tutorFeedbackId'), query)
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();
    return { data: result, meta };
});

const getCompletedSessions = (userId, userRole, query) => __awaiter(void 0, void 0, void 0, function* () {
    const filterField = userRole === user_1.USER_ROLES.STUDENT ? 'studentId' : 'tutorId';
    const sessionQuery = new QueryBuilder_1.default(session_model_1.Session.find({
        [filterField]: new mongoose_1.Types.ObjectId(userId),
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.COMPLETED,
                session_interface_1.SESSION_STATUS.CANCELLED,
                session_interface_1.SESSION_STATUS.EXPIRED,
                session_interface_1.SESSION_STATUS.NO_SHOW,
            ],
        },
    })
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture averageRating')
        .populate('reviewId')
        .populate('tutorFeedbackId'), query)
        .sort()
        .paginate()
        .fields();
    const result = yield sessionQuery.modelQuery;
    const meta = yield sessionQuery.getPaginationInfo();

    const sessionsWithReviewStatus = result.map((session) => {
        const sessionObj = session.toObject();
        return Object.assign(Object.assign({}, sessionObj), { studentReviewStatus: session.reviewId ? 'COMPLETED' : 'PENDING', tutorFeedbackStatus: session.tutorFeedbackId ? 'COMPLETED' : 'PENDING' });
    });
    return { data: sessionsWithReviewStatus, meta };
});

const requestReschedule = (sessionId, userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }

    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reschedule this session');
    }

    if (session.status !== session_interface_1.SESSION_STATUS.SCHEDULED &&
        session.status !== session_interface_1.SESSION_STATUS.STARTING_SOON) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot reschedule session with status: ${session.status}`);
    }

    if (session.rescheduleRequest &&
        session.rescheduleRequest.status === session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session already has a pending reschedule request');
    }

    const now = new Date();
    const tenMinutesBefore = new Date(session.startTime.getTime() - 10 * 60 * 1000);
    if (now >= tenMinutesBefore) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reschedule within 10 minutes of session start');
    }

    const newStartTime = new Date(payload.newStartTime);
    const newEndTime = new Date(newStartTime.getTime() + session.duration * 60 * 1000);

    if (newStartTime <= now) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New start time must be in the future');
    }

    session.previousStartTime = session.startTime;
    session.previousEndTime = session.endTime;

    session.rescheduleRequest = {
        requestedBy: new mongoose_1.Types.ObjectId(userId),
        requestedAt: now,
        newStartTime,
        newEndTime,
        reason: payload.reason,
        status: session_interface_1.RESCHEDULE_STATUS.PENDING,
    };
    session.status = session_interface_1.SESSION_STATUS.RESCHEDULE_REQUESTED;
    yield session.save();

    return session;
});

const approveReschedule = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }

    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to approve this reschedule');
    }
    if (!session.rescheduleRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No reschedule request found');
    }
    if (session.rescheduleRequest.status !== session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`);
    }

    if (session.rescheduleRequest.requestedBy.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot approve your own reschedule request');
    }

    session.startTime = session.rescheduleRequest.newStartTime;
    session.endTime = session.rescheduleRequest.newEndTime;

    session.rescheduleRequest.status = session_interface_1.RESCHEDULE_STATUS.APPROVED;
    session.rescheduleRequest.respondedAt = new Date();
    session.rescheduleRequest.respondedBy = new mongoose_1.Types.ObjectId(userId);

    session.status = session_interface_1.SESSION_STATUS.SCHEDULED;
    yield session.save();

    return session;
});

const rejectReschedule = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }

    const isStudent = session.studentId.toString() === userId;
    const isTutor = session.tutorId.toString() === userId;
    if (!isStudent && !isTutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reject this reschedule');
    }
    if (!session.rescheduleRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No reschedule request found');
    }
    if (session.rescheduleRequest.status !== session_interface_1.RESCHEDULE_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`);
    }

    if (session.rescheduleRequest.requestedBy.toString() === userId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You cannot reject your own reschedule request');
    }

    session.rescheduleRequest.status = session_interface_1.RESCHEDULE_STATUS.REJECTED;
    session.rescheduleRequest.respondedAt = new Date();
    session.rescheduleRequest.respondedBy = new mongoose_1.Types.ObjectId(userId);

    session.status = session_interface_1.SESSION_STATUS.SCHEDULED;
    yield session.save();

    return session;
});

const autoTransitionSessionStatuses = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const io = global.io;

    logger_1.logger.info(`[Cron] autoTransitionSessionStatuses started - io available: ${!!io}, time: ${now.toISOString()}`);

    const sessionsToStartingSoon = yield session_model_1.Session.find({
        status: session_interface_1.SESSION_STATUS.SCHEDULED,
        startTime: { $lte: tenMinutesFromNow, $gt: now },
    });
    logger_1.logger.info(`[Cron] Found ${sessionsToStartingSoon.length} sessions for STARTING_SOON transition`);
    for (const session of sessionsToStartingSoon) {
        session.status = session_interface_1.SESSION_STATUS.STARTING_SOON;
        yield session.save();

        if (session.messageId) {
            yield message_model_1.Message.findByIdAndUpdate(session.messageId, {
                'sessionProposal.status': session_interface_1.SESSION_STATUS.STARTING_SOON,
            });
            logger_1.logger.info(`[Cron] Message ${session.messageId} status updated to STARTING_SOON`);
        }

        if (io && session.chatId && session.messageId) {
            const chatIdStr = String(session.chatId);
            const studentRoom = `user::${String(session.studentId)}`;
            const tutorRoom = `user::${String(session.tutorId)}`;
            const chatRoom = `chat::${chatIdStr}`;
            const proposalPayload = {
                messageId: String(session.messageId),
                chatId: chatIdStr,
                status: session_interface_1.SESSION_STATUS.STARTING_SOON,
                sessionId: String(session._id),
            };

            const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
            const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
            const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);
            logger_1.logger.info(`[Cron] STARTING_SOON - Room sizes - student(${studentRoom}): ${(studentRoomSockets === null || studentRoomSockets === void 0 ? void 0 : studentRoomSockets.size) || 0}, tutor(${tutorRoom}): ${(tutorRoomSockets === null || tutorRoomSockets === void 0 ? void 0 : tutorRoomSockets.size) || 0}, chat(${chatRoom}): ${(chatRoomSockets === null || chatRoomSockets === void 0 ? void 0 : chatRoomSockets.size) || 0}`);
            io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            logger_1.logger.info(`[Cron] STARTING_SOON socket emitted for session ${session._id}`);
        }
        else {
            logger_1.logger.warn(`[Cron] Cannot emit STARTING_SOON - io: ${!!io}, chatId: ${!!session.chatId}, messageId: ${!!session.messageId}`);
        }
    }

    const allStartingSoonSessions = yield session_model_1.Session.find({
        status: session_interface_1.SESSION_STATUS.STARTING_SOON,
    });
    if (allStartingSoonSessions.length > 0) {
        logger_1.logger.info(`[Cron Debug] All STARTING_SOON sessions:`);
        for (const s of allStartingSoonSessions) {
            logger_1.logger.info(`[Cron Debug] Session ${s._id}: startTime=${(_a = s.startTime) === null || _a === void 0 ? void 0 : _a.toISOString()}, endTime=${(_b = s.endTime) === null || _b === void 0 ? void 0 : _b.toISOString()}, now=${now.toISOString()}, startTime <= now: ${s.startTime <= now}, endTime > now: ${s.endTime > now}`);
        }
    }
    const sessionsToInProgress = yield session_model_1.Session.find({
        status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON] },
        startTime: { $lte: now },
        endTime: { $gt: now },
    });
    logger_1.logger.info(`[Cron] Found ${sessionsToInProgress.length} sessions for IN_PROGRESS transition`);
    for (const session of sessionsToInProgress) {
        session.status = session_interface_1.SESSION_STATUS.IN_PROGRESS;
        session.startedAt = now;
        yield session.save();

        if (session.messageId) {
            yield message_model_1.Message.findByIdAndUpdate(session.messageId, {
                'sessionProposal.status': session_interface_1.SESSION_STATUS.IN_PROGRESS,
            });
            logger_1.logger.info(`[Cron] Message ${session.messageId} status updated to IN_PROGRESS`);
        }

        if (io && session.chatId && session.messageId) {
            const chatIdStr = String(session.chatId);
            const studentRoom = `user::${String(session.studentId)}`;
            const tutorRoom = `user::${String(session.tutorId)}`;
            const chatRoom = `chat::${chatIdStr}`;
            const proposalPayload = {
                messageId: String(session.messageId),
                chatId: chatIdStr,
                status: session_interface_1.SESSION_STATUS.IN_PROGRESS,
                sessionId: String(session._id),
            };

            const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
            const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
            const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);
            logger_1.logger.info(`[Cron] IN_PROGRESS - Room sizes - student(${studentRoom}): ${(studentRoomSockets === null || studentRoomSockets === void 0 ? void 0 : studentRoomSockets.size) || 0}, tutor(${tutorRoom}): ${(tutorRoomSockets === null || tutorRoomSockets === void 0 ? void 0 : tutorRoomSockets.size) || 0}, chat(${chatRoom}): ${(chatRoomSockets === null || chatRoomSockets === void 0 ? void 0 : chatRoomSockets.size) || 0}`);
            io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            logger_1.logger.info(`[Cron] IN_PROGRESS socket emitted for session ${session._id}`);
        }
        else {
            logger_1.logger.warn(`[Cron] Cannot emit IN_PROGRESS - io: ${!!io}, chatId: ${!!session.chatId}, messageId: ${!!session.messageId}`);
        }
    }

    const sessionsToComplete = yield session_model_1.Session.find({
        status: session_interface_1.SESSION_STATUS.IN_PROGRESS,
        endTime: { $lte: now },
    });
    let completedCount = 0;
    let noShowCount = 0;
    let expiredCount = 0;
    for (const session of sessionsToComplete) {
        try {

            const result = yield completeSessionWithAttendanceCheck(session._id.toString());
            if (result.session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
                completedCount++;
            }
            else if (result.session.status === session_interface_1.SESSION_STATUS.NO_SHOW) {
                noShowCount++;
            }
            else if (result.session.status === session_interface_1.SESSION_STATUS.EXPIRED) {
                expiredCount++;
            }
        }
        catch (_c) {

        }
    }

    const missedSessions = yield session_model_1.Session.find({
        status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON] },
        endTime: { $lte: now },
    });
    logger_1.logger.info(`[Cron] Found ${missedSessions.length} missed sessions (SCHEDULED/STARTING_SOON but endTime passed)`);
    for (const session of missedSessions) {
        try {
            const chatIdStr = session.chatId ? String(session.chatId) : '';
            const studentRoom = `user::${String(session.studentId)}`;
            const tutorRoom = `user::${String(session.tutorId)}`;
            const chatRoom = `chat::${chatIdStr}`;

            session.status = session_interface_1.SESSION_STATUS.IN_PROGRESS;
            session.startedAt = session.startTime;
            yield session.save();
            if (session.messageId) {
                yield message_model_1.Message.findByIdAndUpdate(session.messageId, {
                    'sessionProposal.status': session_interface_1.SESSION_STATUS.IN_PROGRESS,
                });
                logger_1.logger.info(`[Cron] Missed session ${session._id} transitioned to IN_PROGRESS first`);
            }

            if (io && session.chatId && session.messageId) {
                const inProgressPayload = {
                    messageId: String(session.messageId),
                    chatId: chatIdStr,
                    status: session_interface_1.SESSION_STATUS.IN_PROGRESS,
                    sessionId: String(session._id),
                };
                io.to(chatRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
                io.to(studentRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
                io.to(tutorRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
                logger_1.logger.info(`[Cron] IN_PROGRESS socket emitted for missed session ${session._id}`);
            }

            const result = yield completeSessionWithAttendanceCheck(session._id.toString());
            if (result.session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
                completedCount++;
            }
            else if (result.session.status === session_interface_1.SESSION_STATUS.NO_SHOW) {
                noShowCount++;
            }
            else if (result.session.status === session_interface_1.SESSION_STATUS.EXPIRED) {
                expiredCount++;
            }
            logger_1.logger.info(`[Cron] Missed session ${session._id} completed with status: ${result.session.status}`);
        }
        catch (error) {
            logger_1.logger.error(`[Cron] Failed to process missed session ${session._id}:`, error);
        }
    }
    return {
        startingSoon: sessionsToStartingSoon.length,
        inProgress: sessionsToInProgress.length,
        completed: completedCount,
        noShow: noShowCount,
        expired: expiredCount,
    };
});

const markAsCompletedEnhanced = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status === session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session is already completed');
    }

    session.status = session_interface_1.SESSION_STATUS.COMPLETED;
    session.completedAt = new Date();
    yield session.save();

    try {
        yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.createPendingFeedback(sessionId, session.tutorId.toString(), session.studentId.toString(), session.completedAt);
    }
    catch (_a) {

    }

    try {
        yield user_service_1.UserService.updateTutorLevelAfterSession(session.tutorId.toString());
    }
    catch (_b) {

    }

    const tutor = yield user_model_1.User.findById(session.tutorId);
    const student = yield user_model_1.User.findById(session.studentId);
    activityLog_service_1.ActivityLogService.logActivity({
        userId: session.studentId,
        actionType: 'SESSION_COMPLETED',
        title: 'Session Completed',
        description: `${(student === null || student === void 0 ? void 0 : student.name) || 'Student'} completed a ${session.subject} session with ${(tutor === null || tutor === void 0 ? void 0 : tutor.name) || 'Tutor'}`,
        entityType: 'SESSION',
        entityId: session._id,
        status: 'success',
    });

    return session;
});

const calculateAttendancePercentage = (totalDurationSeconds, sessionDurationMinutes) => {
    const sessionDurationSeconds = sessionDurationMinutes * 60;
    if (sessionDurationSeconds <= 0)
        return 0;
    const percentage = (totalDurationSeconds / sessionDurationSeconds) * 100;
    return Math.min(100, Math.round(percentage * 100) / 100);
};

const syncAttendanceFromCall = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield session_model_1.Session.findById(sessionId);
    if (!session)
        return null;

    const call = yield call_model_1.Call.findOne({ sessionId: new mongoose_1.Types.ObjectId(sessionId) });
    if (!call) {

        session.tutorAttendance = {
            odId: session.tutorId,
            totalDurationSeconds: 0,
            attendancePercentage: 0,
            joinCount: 0,
        };
        session.studentAttendance = {
            odId: session.studentId,
            totalDurationSeconds: 0,
            attendancePercentage: 0,
            joinCount: 0,
        };
        yield session.save();
        return session;
    }

    if (!session.callId) {
        session.callId = call._id;
    }
    const now = new Date();
    const sessionEndTime = session.endTime;

    const tutorSessions = call.participantSessions.filter(p => p.userId.toString() === session.tutorId.toString());
    let tutorTotalSeconds = 0;
    let tutorFirstJoined;
    let tutorLastLeft;
    tutorSessions.forEach(ps => {

        if (ps.joinedAt && !ps.leftAt) {
            const endPoint = sessionEndTime < now ? sessionEndTime : now;
            const duration = Math.floor((endPoint.getTime() - ps.joinedAt.getTime()) / 1000);
            tutorTotalSeconds += Math.max(0, duration);
        }
        else if (ps.duration) {
            tutorTotalSeconds += ps.duration;
        }
        if (!tutorFirstJoined || (ps.joinedAt && ps.joinedAt < tutorFirstJoined)) {
            tutorFirstJoined = ps.joinedAt;
        }
        if (!tutorLastLeft || (ps.leftAt && ps.leftAt > tutorLastLeft)) {
            tutorLastLeft = ps.leftAt;
        }
    });

    const studentSessions = call.participantSessions.filter(p => p.userId.toString() === session.studentId.toString());
    let studentTotalSeconds = 0;
    let studentFirstJoined;
    let studentLastLeft;
    studentSessions.forEach(ps => {
        if (ps.joinedAt && !ps.leftAt) {
            const endPoint = sessionEndTime < now ? sessionEndTime : now;
            const duration = Math.floor((endPoint.getTime() - ps.joinedAt.getTime()) / 1000);
            studentTotalSeconds += Math.max(0, duration);
        }
        else if (ps.duration) {
            studentTotalSeconds += ps.duration;
        }
        if (!studentFirstJoined || (ps.joinedAt && ps.joinedAt < studentFirstJoined)) {
            studentFirstJoined = ps.joinedAt;
        }
        if (!studentLastLeft || (ps.leftAt && ps.leftAt > studentLastLeft)) {
            studentLastLeft = ps.leftAt;
        }
    });

    const effectiveDuration = TEST_MODE ? TEST_SESSION_DURATION_MINUTES : session.duration;

    session.tutorAttendance = {
        odId: session.tutorId,
        firstJoinedAt: tutorFirstJoined,
        lastLeftAt: tutorLastLeft,
        totalDurationSeconds: tutorTotalSeconds,
        attendancePercentage: calculateAttendancePercentage(tutorTotalSeconds, effectiveDuration),
        joinCount: tutorSessions.length,
    };
    session.studentAttendance = {
        odId: session.studentId,
        firstJoinedAt: studentFirstJoined,
        lastLeftAt: studentLastLeft,
        totalDurationSeconds: studentTotalSeconds,
        attendancePercentage: calculateAttendancePercentage(studentTotalSeconds, effectiveDuration),
        joinCount: studentSessions.length,
    };
    yield session.save();
    return session;
});

const checkAttendanceRequirement = (session) => {
    var _a, _b;

    const MINIMUM_ATTENDANCE = MINIMUM_ATTENDANCE_PERCENTAGE;
    const tutorPercentage = ((_a = session.tutorAttendance) === null || _a === void 0 ? void 0 : _a.attendancePercentage) || 0;
    const studentPercentage = ((_b = session.studentAttendance) === null || _b === void 0 ? void 0 : _b.attendancePercentage) || 0;

    if (tutorPercentage >= MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
        return {
            canComplete: true,
            tutorPercentage,
            studentPercentage,
        };
    }

    if (tutorPercentage < MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
        return {
            canComplete: false,
            tutorPercentage,
            studentPercentage,
            noShowBy: 'tutor',
            reason: `Tutor attendance (${tutorPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
        };
    }

    if (studentPercentage < MINIMUM_ATTENDANCE && tutorPercentage >= MINIMUM_ATTENDANCE) {
        return {
            canComplete: false,
            tutorPercentage,
            studentPercentage,
            noShowBy: 'student',
            reason: `Student attendance (${studentPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
        };
    }

    return {
        canComplete: false,
        tutorPercentage,
        studentPercentage,
        reason: `Both participants have low attendance - Tutor: ${tutorPercentage.toFixed(1)}%, Student: ${studentPercentage.toFixed(1)}%`,
    };
};

const completeSessionWithAttendanceCheck = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;

    yield syncAttendanceFromCall(sessionId);

    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    const now = new Date();

    const tutorJoined = (((_a = session.tutorAttendance) === null || _a === void 0 ? void 0 : _a.joinCount) || 0) > 0;
    const studentJoined = (((_b = session.studentAttendance) === null || _b === void 0 ? void 0 : _b.joinCount) || 0) > 0;

    session.set('tutorJoined', tutorJoined);
    session.set('studentJoined', studentJoined);
    session.completedAt = now;

    const attendanceCheck = checkAttendanceRequirement(session);
    if (!tutorJoined) {

        session.set('studentCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherFeedbackRequired', false);
        session.status = session_interface_1.SESSION_STATUS.NO_SHOW;
        session.noShowBy = 'tutor';
    }
    else {

        session.set('studentCompletionStatus', session_interface_1.COMPLETION_STATUS.COMPLETED);
        session.set('studentCompletedAt', now);
        session.set('teacherCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherFeedbackRequired', true);

        if (studentJoined) {
            session.status = session_interface_1.SESSION_STATUS.COMPLETED;
        }
        else {
            session.status = session_interface_1.SESSION_STATUS.NO_SHOW;
            session.noShowBy = 'student';
        }

        try {
            yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.createPendingFeedback(sessionId, session.tutorId.toString(), session.studentId.toString(), now);
        }
        catch (_d) {

        }

        try {
            yield user_service_1.UserService.updateTutorLevelAfterSession(session.tutorId.toString());
        }
        catch (_e) {

        }

        try {
            const sessionDurationMinutes = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
            const sessionDurationHours = sessionDurationMinutes / 60;
            yield studentSubscription_service_1.StudentSubscriptionService.incrementHoursTaken(session.studentId.toString(), sessionDurationHours);
            logger_1.logger.info(`[Subscription] Deducted ${sessionDurationHours} hours from student ${session.studentId}`);
        }
        catch (err) {
            logger_1.logger.error(`[Subscription] Failed to deduct hours for session ${session._id}:`, err);

        }
    }
    yield session.save();

    logger_1.logger.info(`[Session Complete] sessionId: ${session._id}, status: ${session.status}, messageId: ${session.messageId}, chatId: ${session.chatId}`);

    if (session.messageId) {
        const finalStatus = session.status;

        const updateResult = yield message_model_1.Message.findByIdAndUpdate(session.messageId, {
            'sessionProposal.status': finalStatus,
            'sessionProposal.noShowBy': session.noShowBy,
        }, { new: true });
        logger_1.logger.info(`[Message Update] messageId: ${session.messageId}, newStatus: ${((_c = updateResult === null || updateResult === void 0 ? void 0 : updateResult.sessionProposal) === null || _c === void 0 ? void 0 : _c.status) || 'UPDATE FAILED'}`);

        const io = global.io;
        if (io && session.chatId) {
            const chatIdStr = String(session.chatId);
            const studentRoom = `user::${String(session.studentId)}`;
            const tutorRoom = `user::${String(session.tutorId)}`;
            const chatRoom = `chat::${chatIdStr}`;
            const proposalPayload = {
                messageId: String(session.messageId),
                chatId: chatIdStr,
                status: finalStatus,
                sessionId: String(session._id),
                noShowBy: session.noShowBy,
            };

            const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
            const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
            const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);
            logger_1.logger.info(`[Socket Debug] Room sizes - student(${studentRoom}): ${(studentRoomSockets === null || studentRoomSockets === void 0 ? void 0 : studentRoomSockets.size) || 0}, tutor(${tutorRoom}): ${(tutorRoomSockets === null || tutorRoomSockets === void 0 ? void 0 : tutorRoomSockets.size) || 0}, chat(${chatRoom}): ${(chatRoomSockets === null || chatRoomSockets === void 0 ? void 0 : chatRoomSockets.size) || 0}`);

            io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);

            io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);
            logger_1.logger.info(`[Socket Emit] PROPOSAL_UPDATED (${finalStatus}) sent to ${chatRoom}, ${studentRoom}, ${tutorRoom}`);
            logger_1.logger.info(`[Socket Emit] Payload: ${JSON.stringify(proposalPayload)}`);
        }
        else {
            logger_1.logger.warn(`[Socket Emit] No socket.io instance (io: ${!!io}) or chatId (${session.chatId}) available`);
        }
    }
    else {
        logger_1.logger.warn(`[Session Complete] No messageId found for session ${session._id} - cannot update proposal status`);
    }
    return { session: session.toObject(), attendanceCheck };
});
exports.SessionService = {
    proposeSession,
    acceptSessionProposal,
    counterProposeSession,
    rejectSessionProposal,
    getAllSessions,
    getSingleSession,
    cancelSession,
    markAsCompleted,
    autoCompleteSessions,
    getUpcomingSessions,
    getCompletedSessions,
    requestReschedule,
    approveReschedule,
    rejectReschedule,
    autoTransitionSessionStatuses,
    markAsCompletedEnhanced,

    syncAttendanceFromCall,
    checkAttendanceRequirement,
    completeSessionWithAttendanceCheck,
};
