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
exports.SessionRequestService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const chat_model_1 = require("../chat/chat.model");
const message_model_1 = require("../message/message.model");
const subject_model_1 = require("../subject/subject.model");
const trialRequest_model_1 = require("../trialRequest/trialRequest.model");
const trialRequest_interface_1 = require("../trialRequest/trialRequest.interface");
const sessionRequest_interface_1 = require("./sessionRequest.interface");
const sessionRequest_model_1 = require("./sessionRequest.model");
/**
 * Create session request (Returning Student only)
 * Must be logged in and have completed trial
 */
const createSessionRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validate subject exists
    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // Verify student exists and has completed trial
    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }
    if (student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create session requests');
    }
    // Must have completed trial to create session request
    if (!((_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.hasCompletedTrial)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You must complete a trial session before requesting more sessions. Please create a trial request first.');
    }
    // Check if student has pending session request
    const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
    });
    if (pendingSessionRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending session request. Please wait for a tutor to accept or cancel it.');
    }
    // Also check for pending trial request (can't have both)
    const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
    });
    if (pendingTrialRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending trial request. Please wait for it to be accepted or cancel it first.');
    }
    // Create session request
    const sessionRequest = yield sessionRequest_model_1.SessionRequest.create(Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(studentId), status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING }));
    // Increment student session request count
    yield user_model_1.User.findByIdAndUpdate(studentId, {
        $inc: { 'studentProfile.sessionRequestsCount': 1 },
    });
    // TODO: Send real-time notification to matching tutors
    // TODO: Send confirmation email to student
    return sessionRequest;
});
/**
 * Get matching requests for tutor (UNIFIED: Trial + Session)
 * Shows PENDING requests in tutor's subjects from both collections
 */
const getMatchingSessionRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Get tutor's subjects
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
    }
    const tutorSubjects = ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) || [];
    const now = new Date();
    // Pagination params
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Filter by requestType if provided
    const requestTypeFilter = query.requestType;
    // Base match conditions for session requests
    const sessionMatchConditions = {
        subject: { $in: tutorSubjects.map(s => new mongoose_1.Types.ObjectId(String(s))) },
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: now },
    };
    // Base match conditions for trial requests
    const trialMatchConditions = {
        subject: { $in: tutorSubjects.map(s => new mongoose_1.Types.ObjectId(String(s))) },
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: now },
    };
    // Build aggregation pipeline
    const pipeline = [];
    // If filtering by specific type, skip the $unionWith
    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {
        // Query only trial requests
        const trialResults = yield trialRequest_model_1.TrialRequest.aggregate([
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'studentId',
                    pipeline: [{ $project: { name: 1, profilePicture: 1, studentProfile: 1 } }],
                },
            },
            { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subject',
                    foreignField: '_id',
                    as: 'subject',
                    pipeline: [{ $project: { name: 1, icon: 1 } }],
                },
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
        ]);
        const totalTrialCount = yield trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions);
        return {
            meta: {
                total: totalTrialCount,
                limit,
                page,
                totalPage: Math.ceil(totalTrialCount / limit),
            },
            data: trialResults,
        };
    }
    else {
        // Unified query: both session and trial requests
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } }, {
            $unionWith: {
                coll: 'trialrequests',
                pipeline: [
                    { $match: trialMatchConditions },
                    { $addFields: { requestType: 'TRIAL' } },
                ],
            },
        });
    }
    // Add sorting, pagination, and lookups for non-TRIAL-only queries
    if (requestTypeFilter !== 'TRIAL') {
        pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }, {
            $lookup: {
                from: 'users',
                localField: 'studentId',
                foreignField: '_id',
                as: 'studentId',
                pipeline: [{ $project: { name: 1, profilePicture: 1, studentProfile: 1 } }],
            },
        }, { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subject',
                pipeline: [{ $project: { name: 1, icon: 1 } }],
            },
        }, { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } });
    }
    const result = yield sessionRequest_model_1.SessionRequest.aggregate(pipeline);
    // Get total count for pagination
    let totalCount = 0;
    if (requestTypeFilter === 'SESSION') {
        totalCount = yield sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions);
    }
    else {
        const [sessionCount, trialCount] = yield Promise.all([
            sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions),
            trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions),
        ]);
        totalCount = sessionCount + trialCount;
    }
    return {
        meta: {
            total: totalCount,
            limit,
            page,
            totalPage: Math.ceil(totalCount / limit),
        },
        data: result,
    };
});
/**
 * Get student's own requests (UNIFIED: Trial + Session)
 * Returns both trial and session requests for the student
 */
const getMySessionRequests = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const studentObjectId = new mongoose_1.Types.ObjectId(studentId);
    // Pagination params
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Filter by requestType if provided
    const requestTypeFilter = query.requestType;
    // Filter by status if provided
    const statusFilter = query.status;
    // Base match conditions
    const sessionMatchConditions = { studentId: studentObjectId };
    const trialMatchConditions = { studentId: studentObjectId };
    if (statusFilter) {
        sessionMatchConditions.status = statusFilter;
        trialMatchConditions.status = statusFilter;
    }
    // Build aggregation pipeline
    const pipeline = [];
    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {
        // Query only trial requests
        const trialResults = yield trialRequest_model_1.TrialRequest.aggregate([
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'acceptedTutorId',
                    foreignField: '_id',
                    as: 'acceptedTutorId',
                    pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
                },
            },
            { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subject',
                    foreignField: '_id',
                    as: 'subject',
                    pipeline: [{ $project: { name: 1, icon: 1 } }],
                },
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'chats',
                    localField: 'chatId',
                    foreignField: '_id',
                    as: 'chatId',
                },
            },
            { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } },
        ]);
        const totalTrialCount = yield trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions);
        return {
            meta: {
                total: totalTrialCount,
                limit,
                page,
                totalPage: Math.ceil(totalTrialCount / limit),
            },
            data: trialResults,
        };
    }
    else {
        // Unified query: both session and trial requests
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } }, {
            $unionWith: {
                coll: 'trialrequests',
                pipeline: [
                    { $match: trialMatchConditions },
                    { $addFields: { requestType: 'TRIAL' } },
                ],
            },
        });
    }
    // Add sorting, pagination, and lookups for non-TRIAL-only queries
    if (requestTypeFilter !== 'TRIAL') {
        pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }, {
            $lookup: {
                from: 'users',
                localField: 'acceptedTutorId',
                foreignField: '_id',
                as: 'acceptedTutorId',
                pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
            },
        }, { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subject',
                pipeline: [{ $project: { name: 1, icon: 1 } }],
            },
        }, { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'chats',
                localField: 'chatId',
                foreignField: '_id',
                as: 'chatId',
            },
        }, { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } });
    }
    const result = yield sessionRequest_model_1.SessionRequest.aggregate(pipeline);
    // Get total count for pagination
    let totalCount = 0;
    if (requestTypeFilter === 'SESSION') {
        totalCount = yield sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions);
    }
    else {
        const [sessionCount, trialCount] = yield Promise.all([
            sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions),
            trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions),
        ]);
        totalCount = sessionCount + trialCount;
    }
    return {
        meta: {
            total: totalCount,
            limit,
            page,
            totalPage: Math.ceil(totalCount / limit),
        },
        data: result,
    };
});
/**
 * Get all requests (Admin) - UNIFIED: Trial + Session
 * Returns all trial and session requests for admin dashboard
 */
const getAllSessionRequests = (query) => __awaiter(void 0, void 0, void 0, function* () {
    // Pagination params
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Filter by requestType if provided
    const requestTypeFilter = query.requestType;
    // Filter by status if provided
    const statusFilter = query.status;
    // Search term
    const searchTerm = query.searchTerm;
    // Base match conditions
    const sessionMatchConditions = {};
    const trialMatchConditions = {};
    if (statusFilter) {
        sessionMatchConditions.status = statusFilter;
        trialMatchConditions.status = statusFilter;
    }
    if (searchTerm) {
        sessionMatchConditions.description = { $regex: searchTerm, $options: 'i' };
        trialMatchConditions.$or = [
            { description: { $regex: searchTerm, $options: 'i' } },
            { 'studentInfo.name': { $regex: searchTerm, $options: 'i' } },
            { 'studentInfo.email': { $regex: searchTerm, $options: 'i' } },
        ];
    }
    // Build aggregation pipeline
    const pipeline = [];
    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {
        // Query only trial requests
        const trialResults = yield trialRequest_model_1.TrialRequest.aggregate([
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentId',
                    foreignField: '_id',
                    as: 'studentId',
                    pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
                },
            },
            { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'acceptedTutorId',
                    foreignField: '_id',
                    as: 'acceptedTutorId',
                    pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
                },
            },
            { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subject',
                    foreignField: '_id',
                    as: 'subject',
                    pipeline: [{ $project: { name: 1, icon: 1 } }],
                },
            },
            { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'chats',
                    localField: 'chatId',
                    foreignField: '_id',
                    as: 'chatId',
                },
            },
            { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } },
        ]);
        const totalTrialCount = yield trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions);
        return {
            meta: {
                total: totalTrialCount,
                limit,
                page,
                totalPage: Math.ceil(totalTrialCount / limit),
            },
            data: trialResults,
        };
    }
    else {
        // Unified query: both session and trial requests
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } }, {
            $unionWith: {
                coll: 'trialrequests',
                pipeline: [
                    { $match: trialMatchConditions },
                    { $addFields: { requestType: 'TRIAL' } },
                ],
            },
        });
    }
    // Add sorting, pagination, and lookups for non-TRIAL-only queries
    if (requestTypeFilter !== 'TRIAL') {
        pipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: limit }, {
            $lookup: {
                from: 'users',
                localField: 'studentId',
                foreignField: '_id',
                as: 'studentId',
                pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
            },
        }, { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'users',
                localField: 'acceptedTutorId',
                foreignField: '_id',
                as: 'acceptedTutorId',
                pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
            },
        }, { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subject',
                pipeline: [{ $project: { name: 1, icon: 1 } }],
            },
        }, { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } }, {
            $lookup: {
                from: 'chats',
                localField: 'chatId',
                foreignField: '_id',
                as: 'chatId',
            },
        }, { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } });
    }
    const result = yield sessionRequest_model_1.SessionRequest.aggregate(pipeline);
    // Get total count for pagination
    let totalCount = 0;
    if (requestTypeFilter === 'SESSION') {
        totalCount = yield sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions);
    }
    else {
        const [sessionCount, trialCount] = yield Promise.all([
            sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions),
            trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions),
        ]);
        totalCount = sessionCount + trialCount;
    }
    return {
        meta: {
            total: totalCount,
            limit,
            page,
            totalPage: Math.ceil(totalCount / limit),
        },
        data: result,
    };
});
/**
 * Get single session request
 */
const getSingleSessionRequest = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(id)
        .populate('studentId', 'name email profilePicture phone studentProfile')
        .populate('acceptedTutorId', 'name email profilePicture phone')
        .populate('subject', 'name icon description')
        .populate('chatId');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    return request;
});
/**
 * Accept session request (Tutor)
 * Creates chat and connects student with tutor
 * Sends introductory message to chat
 */
const acceptSessionRequest = (requestId, tutorId, introductoryMessage) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Verify request exists and is pending
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId).populate('subject', 'name');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request is no longer available');
    }
    // Check if expired
    if (new Date() > request.expiresAt) {
        request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED;
        yield request.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request has expired');
    }
    // Verify tutor
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
    }
    // Verify tutor teaches this subject (compare ObjectId)
    // Handle both populated and non-populated subject field
    const tutorSubjectIds = ((_c = (_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) === null || _c === void 0 ? void 0 : _c.map(s => s.toString())) || [];
    const requestSubjectId = typeof request.subject === 'object' && request.subject._id
        ? request.subject._id.toString()
        : request.subject.toString();
    if (!tutorSubjectIds.includes(requestSubjectId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You do not teach this subject');
    }
    // Check if chat already exists between tutor and student (to avoid duplicate chats)
    const chatParticipants = [request.studentId, new mongoose_1.Types.ObjectId(tutorId)];
    let chat = yield chat_model_1.Chat.findOne({
        participants: { $all: chatParticipants },
    });
    if (chat) {
        // Reuse existing chat, update session request reference
        chat.sessionRequestId = request._id;
        chat.trialRequestId = undefined; // Clear trial reference so new sessions aren't marked as trial
        yield chat.save();
    }
    else {
        // Create new chat only if none exists
        chat = yield chat_model_1.Chat.create({
            participants: chatParticipants,
            sessionRequestId: request._id,
        });
    }
    // Send introductory message if provided
    if (introductoryMessage && introductoryMessage.trim()) {
        yield message_model_1.Message.create({
            chatId: chat._id,
            sender: new mongoose_1.Types.ObjectId(tutorId),
            text: introductoryMessage.trim(),
            type: 'text',
        });
    }
    // Update session request
    request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.ACCEPTED;
    request.acceptedTutorId = new mongoose_1.Types.ObjectId(tutorId);
    request.chatId = chat._id;
    request.acceptedAt = new Date();
    yield request.save();
    // TODO: Send real-time notification to student
    // TODO: Send email to student
    return request;
});
/**
 * Cancel session request (Student) - Permanently deletes the request
 */
const cancelSessionRequest = (requestId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    // Verify ownership
    if (request.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own session requests');
    }
    // Can only cancel PENDING requests
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending session requests can be cancelled');
    }
    // Permanently delete the request
    yield sessionRequest_model_1.SessionRequest.findByIdAndDelete(requestId);
    return { deleted: true };
});
/**
 * Extend session request (Student)
 * Adds 7 more days to expiration (max 1 extension)
 * Can only extend when 1 day or less remaining (6+ days passed)
 */
const extendSessionRequest = (requestId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    // Verify ownership
    if (request.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only extend your own session requests');
    }
    // Can only extend PENDING requests
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending session requests can be extended');
    }
    // Check extension limit (max 1)
    if (request.extensionCount && request.extensionCount >= 1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session request can only be extended once');
    }
    // Can only extend when 1 day or less remaining (6+ days passed)
    const timeRemaining = request.expiresAt.getTime() - Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    if (timeRemaining > oneDayInMs) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You can only extend when 1 day or less is remaining');
    }
    // Extend by 7 days from now
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    request.expiresAt = newExpiresAt;
    request.isExtended = true;
    request.extensionCount = (request.extensionCount || 0) + 1;
    request.finalExpiresAt = undefined;
    request.reminderSentAt = undefined;
    yield request.save();
    return request;
});
/**
 * Send reminders for expiring requests (Cron job)
 */
const sendExpirationReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const expiredRequests = yield sessionRequest_model_1.SessionRequest.find({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        expiresAt: { $lt: now },
        reminderSentAt: { $exists: false },
    }).populate('studentId', 'email name');
    let reminderCount = 0;
    for (const request of expiredRequests) {
        const finalDeadline = new Date();
        finalDeadline.setDate(finalDeadline.getDate() + 3);
        request.reminderSentAt = now;
        request.finalExpiresAt = finalDeadline;
        yield request.save();
        // TODO: Send email notification to student
        reminderCount++;
    }
    return reminderCount;
});
/**
 * Auto-delete requests after final deadline (Cron job)
 */
const autoDeleteExpiredRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_model_1.SessionRequest.deleteMany({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
});
/**
 * Auto-expire session requests (Cron job)
 */
const expireOldRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_model_1.SessionRequest.updateMany({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    }, {
        $set: { status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED },
    });
    return result.modifiedCount;
});
/**
 * Get tutor's accepted requests (UNIFIED: Trial + Session)
 * Returns both trial and session requests accepted by this tutor
 */
const getMyAcceptedRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorObjectId = new mongoose_1.Types.ObjectId(tutorId);
    // Verify tutor exists
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }
    // Pagination params
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    // Match conditions
    const sessionMatchConditions = { acceptedTutorId: tutorObjectId };
    const trialMatchConditions = { acceptedTutorId: tutorObjectId };
    // Unified query: both session and trial requests
    const pipeline = [
        { $match: sessionMatchConditions },
        { $addFields: { requestType: 'SESSION' } },
        {
            $unionWith: {
                coll: 'trialrequests',
                pipeline: [
                    { $match: trialMatchConditions },
                    { $addFields: { requestType: 'TRIAL' } },
                ],
            },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'users',
                localField: 'studentId',
                foreignField: '_id',
                as: 'studentId',
                pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
            },
        },
        { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'subjects',
                localField: 'subject',
                foreignField: '_id',
                as: 'subject',
                pipeline: [{ $project: { name: 1, icon: 1 } }],
            },
        },
        { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    ];
    const result = yield sessionRequest_model_1.SessionRequest.aggregate(pipeline);
    // Get total count for pagination
    const [sessionCount, trialCount] = yield Promise.all([
        sessionRequest_model_1.SessionRequest.countDocuments(sessionMatchConditions),
        trialRequest_model_1.TrialRequest.countDocuments(trialMatchConditions),
    ]);
    const totalCount = sessionCount + trialCount;
    return {
        meta: {
            total: totalCount,
            limit,
            page,
            totalPage: Math.ceil(totalCount / limit),
        },
        data: result,
    };
});
exports.SessionRequestService = {
    createSessionRequest,
    getMatchingSessionRequests,
    getMySessionRequests,
    getMyAcceptedRequests,
    getAllSessionRequests,
    getSingleSessionRequest,
    acceptSessionRequest,
    cancelSessionRequest,
    extendSessionRequest,
    sendExpirationReminders,
    autoDeleteExpiredRequests,
    expireOldRequests,
};
