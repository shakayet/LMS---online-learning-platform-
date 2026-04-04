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

const createSessionRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;

    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }

    const student = yield user_model_1.User.findById(studentId);
    if (!student) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
    }
    if (student.role !== user_1.USER_ROLES.STUDENT) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create session requests');
    }

    if (!((_a = student.studentProfile) === null || _a === void 0 ? void 0 : _a.hasCompletedTrial)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You must complete a trial session before requesting more sessions. Please create a trial request first.');
    }

    const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
    });
    if (pendingSessionRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending session request. Please wait for a tutor to accept or cancel it.');
    }

    const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
    });
    if (pendingTrialRequest) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending trial request. Please wait for it to be accepted or cancel it first.');
    }

    const sessionRequest = yield sessionRequest_model_1.SessionRequest.create(Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(studentId), status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING }));

    yield user_model_1.User.findByIdAndUpdate(studentId, {
        $inc: { 'studentProfile.sessionRequestsCount': 1 },
    });

    return sessionRequest;
});

const getMatchingSessionRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
    }
    const tutorSubjects = ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) || [];
    const now = new Date();

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const requestTypeFilter = query.requestType;

    const sessionMatchConditions = {
        subject: { $in: tutorSubjects.map(s => new mongoose_1.Types.ObjectId(String(s))) },
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: now },
    };

    const trialMatchConditions = {
        subject: { $in: tutorSubjects.map(s => new mongoose_1.Types.ObjectId(String(s))) },
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: now },
    };

    const pipeline = [];

    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {

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

const getMySessionRequests = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const studentObjectId = new mongoose_1.Types.ObjectId(studentId);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const requestTypeFilter = query.requestType;

    const statusFilter = query.status;

    const sessionMatchConditions = { studentId: studentObjectId };
    const trialMatchConditions = { studentId: studentObjectId };
    if (statusFilter) {
        sessionMatchConditions.status = statusFilter;
        trialMatchConditions.status = statusFilter;
    }

    const pipeline = [];
    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {

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

const getAllSessionRequests = (query) => __awaiter(void 0, void 0, void 0, function* () {

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const requestTypeFilter = query.requestType;

    const statusFilter = query.status;

    const searchTerm = query.searchTerm;

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

    const pipeline = [];
    if (requestTypeFilter === 'SESSION') {
        pipeline.push({ $match: sessionMatchConditions }, { $addFields: { requestType: 'SESSION' } });
    }
    else if (requestTypeFilter === 'TRIAL') {

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

const acceptSessionRequest = (requestId, tutorId, introductoryMessage) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;

    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId).populate('subject', 'name');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }
    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request is no longer available');
    }

    if (new Date() > request.expiresAt) {
        request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED;
        yield request.save();
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This session request has expired');
    }

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
    }

    const tutorSubjectIds = ((_c = (_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) === null || _c === void 0 ? void 0 : _c.map(s => s.toString())) || [];
    const requestSubjectId = typeof request.subject === 'object' && request.subject._id
        ? request.subject._id.toString()
        : request.subject.toString();
    if (!tutorSubjectIds.includes(requestSubjectId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You do not teach this subject');
    }

    const chatParticipants = [request.studentId, new mongoose_1.Types.ObjectId(tutorId)];
    let chat = yield chat_model_1.Chat.findOne({
        participants: { $all: chatParticipants },
    });
    if (chat) {

        chat.sessionRequestId = request._id;
        chat.trialRequestId = undefined;
        yield chat.save();
    }
    else {

        chat = yield chat_model_1.Chat.create({
            participants: chatParticipants,
            sessionRequestId: request._id,
        });
    }

    if (introductoryMessage && introductoryMessage.trim()) {
        yield message_model_1.Message.create({
            chatId: chat._id,
            sender: new mongoose_1.Types.ObjectId(tutorId),
            text: introductoryMessage.trim(),
            type: 'text',
        });
    }

    request.status = sessionRequest_interface_1.SESSION_REQUEST_STATUS.ACCEPTED;
    request.acceptedTutorId = new mongoose_1.Types.ObjectId(tutorId);
    request.chatId = chat._id;
    request.acceptedAt = new Date();
    yield request.save();

    return request;
});

const cancelSessionRequest = (requestId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }

    if (request.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own session requests');
    }

    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending session requests can be cancelled');
    }

    yield sessionRequest_model_1.SessionRequest.findByIdAndDelete(requestId);
    return { deleted: true };
});

const extendSessionRequest = (requestId, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield sessionRequest_model_1.SessionRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session request not found');
    }

    if (request.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only extend your own session requests');
    }

    if (request.status !== sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending session requests can be extended');
    }

    if (request.extensionCount && request.extensionCount >= 1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Session request can only be extended once');
    }

    const timeRemaining = request.expiresAt.getTime() - Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    if (timeRemaining > oneDayInMs) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You can only extend when 1 day or less is remaining');
    }

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

        reminderCount++;
    }
    return reminderCount;
});

const autoDeleteExpiredRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_model_1.SessionRequest.deleteMany({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
});

const expireOldRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_model_1.SessionRequest.updateMany({
        status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    }, {
        $set: { status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.EXPIRED },
    });
    return result.modifiedCount;
});

const getMyAcceptedRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorObjectId = new mongoose_1.Types.ObjectId(tutorId);

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const sessionMatchConditions = { acceptedTutorId: tutorObjectId };
    const trialMatchConditions = { acceptedTutorId: tutorObjectId };

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
