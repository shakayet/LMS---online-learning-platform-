"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.TrialRequestService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importStar(require("mongoose"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const chat_model_1 = require("../chat/chat.model");
const subject_model_1 = require("../subject/subject.model");
const trialRequest_interface_1 = require("./trialRequest.interface");
const trialRequest_model_1 = require("./trialRequest.model");
const sessionRequest_model_1 = require("../sessionRequest/sessionRequest.model");
const sessionRequest_interface_1 = require("../sessionRequest/sessionRequest.interface");
const message_model_1 = require("../message/message.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const jwtHelper_1 = require("../../../helpers/jwtHelper");
const config_1 = __importDefault(require("../../../config"));

const createTrialRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;

    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }

    if ((_a = payload.studentInfo) === null || _a === void 0 ? void 0 : _a.isUnder18) {
        if (!((_b = payload.studentInfo) === null || _b === void 0 ? void 0 : _b.guardianInfo)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Guardian information is required for students under 18');
        }
    }
    else {
        if (!((_c = payload.studentInfo) === null || _c === void 0 ? void 0 : _c.email)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Email is required for students 18 and above');
        }
        if (!((_d = payload.studentInfo) === null || _d === void 0 ? void 0 : _d.password)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Password is required for students 18 and above');
        }
    }

    if (studentId) {
        const student = yield user_model_1.User.findById(studentId);
        if (!student) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
        }
        if (student.role !== user_1.USER_ROLES.STUDENT) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create trial requests');
        }

        if ((_e = student.studentProfile) === null || _e === void 0 ? void 0 : _e.hasCompletedTrial) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already completed a trial. Please use the session request feature for additional tutoring sessions.');
        }

        const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        });
        if (pendingTrialRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending trial request. Please wait for a tutor to accept or cancel it.');
        }

        const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        });
        if (pendingSessionRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending session request. Please wait for it to be accepted or cancel it first.');
        }
    }
    else {

        const emailToCheck = ((_f = payload.studentInfo) === null || _f === void 0 ? void 0 : _f.isUnder18)
            ? (_h = (_g = payload.studentInfo) === null || _g === void 0 ? void 0 : _g.guardianInfo) === null || _h === void 0 ? void 0 : _h.email
            : (_j = payload.studentInfo) === null || _j === void 0 ? void 0 : _j.email;
        if (emailToCheck) {

            const existingUser = yield user_model_1.User.findOne({ email: emailToCheck.toLowerCase() });
            if (existingUser) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'An account with this email already exists. Please log in to create a trial request.');
            }

            const previousAcceptedTrial = yield trialRequest_model_1.TrialRequest.findOne({
                $or: [
                    { 'studentInfo.email': emailToCheck },
                    { 'studentInfo.guardianInfo.email': emailToCheck },
                ],
                status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED,
            });
            if (previousAcceptedTrial) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already completed a trial with this email. Please log in to request more sessions.');
            }

            const pendingRequest = yield trialRequest_model_1.TrialRequest.findOne({
                $or: [
                    { 'studentInfo.email': emailToCheck },
                    { 'studentInfo.guardianInfo.email': emailToCheck },
                ],
                status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
            });
            if (pendingRequest) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'A pending trial request already exists for this email. Please wait for a tutor to accept or cancel it.');
            }
        }
    }

    let createdStudentId = studentId;
    let accessToken;
    let refreshToken;
    let userInfo;
    let trialRequest;
    if (!studentId && payload.studentInfo) {

        const isUnder18 = payload.studentInfo.isUnder18;
        const email = isUnder18
            ? (_k = payload.studentInfo.guardianInfo) === null || _k === void 0 ? void 0 : _k.email
            : payload.studentInfo.email;
        const password = isUnder18
            ? (_l = payload.studentInfo.guardianInfo) === null || _l === void 0 ? void 0 : _l.password
            : payload.studentInfo.password;
        const name = isUnder18
            ? ((_m = payload.studentInfo.guardianInfo) === null || _m === void 0 ? void 0 : _m.name) || payload.studentInfo.name
            : payload.studentInfo.name;
        const phone = isUnder18
            ? (_o = payload.studentInfo.guardianInfo) === null || _o === void 0 ? void 0 : _o.phone
            : undefined;
        if (email && password) {

            const dbSession = yield mongoose_1.default.startSession();
            dbSession.startTransaction();
            try {

                const [newUser] = yield user_model_1.User.create([{
                        name: name,
                        email: email.toLowerCase(),
                        password: password,
                        phone: phone,
                        role: user_1.USER_ROLES.STUDENT,
                        studentProfile: {
                            hasCompletedTrial: false,
                            trialRequestsCount: 1,
                            sessionRequestsCount: 0,
                        },
                    }], { session: dbSession });
                createdStudentId = newUser._id.toString();

                accessToken = jwtHelper_1.jwtHelper.createToken({ id: newUser._id, role: newUser.role, email: newUser.email }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
                refreshToken = jwtHelper_1.jwtHelper.createToken({ id: newUser._id, role: newUser.role, email: newUser.email }, config_1.default.jwt.jwt_refresh_secret, config_1.default.jwt.jwt_refresh_expire_in);
                userInfo = {
                    _id: newUser._id.toString(),
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                };

                const [createdRequest] = yield trialRequest_model_1.TrialRequest.create([Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(createdStudentId), status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING })], { session: dbSession });
                trialRequest = createdRequest;
                yield dbSession.commitTransaction();
            }
            catch (error) {
                yield dbSession.abortTransaction();
                throw error;
            }
            finally {
                dbSession.endSession();
            }
        }
        else {

            trialRequest = yield trialRequest_model_1.TrialRequest.create(Object.assign(Object.assign({}, payload), { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }));
        }
    }
    else {

        trialRequest = yield trialRequest_model_1.TrialRequest.create(Object.assign(Object.assign({}, payload), { studentId: createdStudentId ? new mongoose_1.Types.ObjectId(createdStudentId) : undefined, status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }));

        if (studentId) {
            yield user_model_1.User.findByIdAndUpdate(studentId, {
                $inc: { 'studentProfile.trialRequestsCount': 1 },
            });
        }
    }

    const io = global.io;
    if (io) {
        const matchingTutors = yield user_model_1.User.find({
            role: user_1.USER_ROLES.TUTOR,
            'tutorProfile.isVerified': true,
            'tutorProfile.subjects': payload.subject,
        }).select('_id');
        const populatedRequest = yield trialRequest_model_1.TrialRequest.findById(trialRequest._id)
            .populate('subject', 'name icon description')
            .select('-studentInfo.password -studentInfo.guardianInfo.password');
        matchingTutors.forEach(tutor => {
            io.to(`user::${tutor._id.toString()}`).emit('TRIAL_REQUEST_CREATED', {
                trialRequest: populatedRequest,
            });
        });
        console.log(`Trial request notification sent to ${matchingTutors.length} tutors`);
    }

    return {
        trialRequest,
        accessToken,
        refreshToken,
        user: userInfo,
    };
});

const getSingleTrialRequest = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield trialRequest_model_1.TrialRequest.findById(id)
        .populate('studentId', 'name email profilePicture phone')
        .populate('acceptedTutorId', 'name email profilePicture phone')
        .populate('subject', 'name icon description')
        .populate('chatId');
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    return request;
});

const getAvailableTrialRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can view available requests');
    }

    const tutorSubjectIds = ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) || [];
    if (tutorSubjectIds.length === 0) {
        return {
            pagination: { page: 1, limit: 10, total: 0, totalPage: 0 },
            data: [],
        };
    }
    const now = new Date();

    const requestQuery = new QueryBuilder_1.default(trialRequest_model_1.TrialRequest.find({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        subject: { $in: tutorSubjectIds },
        expiresAt: { $gt: now },
    })
        .populate('subject', 'name icon description')
        .select('-studentInfo.password -studentInfo.guardianInfo.password'), query)
        .filter()
        .sort()
        .paginate();
    const requests = yield requestQuery.modelQuery;
    const paginationInfo = yield requestQuery.getPaginationInfo();

    const requestsWithAge = requests.map(request => {
        var _a;
        const reqObj = request.toObject();
        if ((_a = reqObj.studentInfo) === null || _a === void 0 ? void 0 : _a.dateOfBirth) {
            const dob = new Date(reqObj.studentInfo.dateOfBirth);
            const age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            return Object.assign(Object.assign({}, reqObj), { studentAge: age });
        }
        return reqObj;
    });
    return {
        pagination: paginationInfo,
        data: requestsWithAge,
    };
});

const getMyAcceptedTrialRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }

    const requestQuery = new QueryBuilder_1.default(trialRequest_model_1.TrialRequest.find({
        acceptedTutorId: new mongoose_1.Types.ObjectId(tutorId),
    })
        .populate('studentId', 'name email profilePicture phone')
        .populate('subject', 'name icon description')
        .populate('chatId')
        .select('-studentInfo.password -studentInfo.guardianInfo.password'), query)
        .filter()
        .sort()
        .paginate();
    const requests = yield requestQuery.modelQuery;
    const paginationInfo = yield requestQuery.getPaginationInfo();
    return {
        pagination: paginationInfo,
        data: requests,
    };
});

const acceptTrialRequest = (requestId, tutorId, introductoryMessage) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;

    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
    }

    const requestCheck = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!requestCheck) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    const tutorSubjectIds = ((_c = (_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) === null || _c === void 0 ? void 0 : _c.map(s => s.toString())) || [];
    const requestSubjectId = typeof requestCheck.subject === 'object' && requestCheck.subject._id
        ? requestCheck.subject._id.toString()
        : requestCheck.subject.toString();
    if (!tutorSubjectIds.includes(requestSubjectId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You do not teach this subject');
    }

    const request = yield trialRequest_model_1.TrialRequest.findOneAndUpdate({
        _id: requestId,
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $gt: new Date() },
    }, {
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED,
        acceptedTutorId: new mongoose_1.Types.ObjectId(tutorId),
        acceptedAt: new Date(),
    }, { new: true }).populate('subject', 'name');
    if (!request) {

        const existing = yield trialRequest_model_1.TrialRequest.findById(requestId);
        if ((existing === null || existing === void 0 ? void 0 : existing.status) === trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This trial request has already been accepted by another tutor');
        }
        if (existing && new Date() > existing.expiresAt) {
            existing.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED;
            yield existing.save();
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This trial request has expired');
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This trial request is no longer available');
    }

    const chatParticipants = request.studentId
        ? [request.studentId, new mongoose_1.Types.ObjectId(tutorId)]
        : [new mongoose_1.Types.ObjectId(tutorId)];

    let chat = yield chat_model_1.Chat.findOne({
        participants: { $all: chatParticipants },
    });
    if (chat) {

        chat.trialRequestId = request._id;
        chat.sessionRequestId = undefined;
        yield chat.save();
    }
    else {

        chat = yield chat_model_1.Chat.create({
            participants: chatParticipants,
            trialRequestId: request._id,
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

    yield trialRequest_model_1.TrialRequest.findByIdAndUpdate(requestId, { chatId: chat._id });

    if (request.studentId) {
        yield user_model_1.User.findByIdAndUpdate(request.studentId, {
            $set: { 'studentProfile.hasCompletedTrial': true },
        });
    }

    const io = global.io;
    if (io) {

        const populatedRequest = yield trialRequest_model_1.TrialRequest.findById(request._id)
            .populate('acceptedTutorId', 'name email profilePicture')
            .populate('subject', 'name icon description')
            .populate('chatId');

        if (request.studentId) {
            io.to(`user::${request.studentId.toString()}`).emit('TRIAL_REQUEST_ACCEPTED', {
                trialRequest: populatedRequest,
                tutor: {
                    _id: tutor._id,
                    name: tutor.name,
                    profilePicture: tutor.profilePicture,
                },
                chatId: chat._id,
            });
            console.log(`Trial acceptance notification sent to student ${request.studentId}`);
        }

        const otherTutors = yield user_model_1.User.find({
            role: user_1.USER_ROLES.TUTOR,
            'tutorProfile.isVerified': true,
            'tutorProfile.subjects': request.subject,
            _id: { $ne: tutorId },
        }).select('_id');
        otherTutors.forEach(otherTutor => {
            io.to(`user::${otherTutor._id.toString()}`).emit('TRIAL_REQUEST_TAKEN', {
                trialRequestId: request._id,
            });
        });
    }

    return request;
});

const cancelTrialRequest = (requestId, studentIdOrEmail, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }

    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own trial requests');
    }

    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be cancelled');
    }

    request.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.CANCELLED;
    request.cancellationReason = cancellationReason;
    request.cancelledAt = new Date();
    yield request.save();
    return request;
});

const extendTrialRequest = (requestId, studentIdOrEmail) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }

    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    const isOwnerByGuardianEmail = ((_e = (_d = (_c = request.studentInfo) === null || _c === void 0 ? void 0 : _c.guardianInfo) === null || _d === void 0 ? void 0 : _d.email) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail && !isOwnerByGuardianEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only extend your own trial requests');
    }

    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be extended');
    }

    if (request.extensionCount && request.extensionCount >= 1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Trial request can only be extended once');
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

    const expiredRequests = yield trialRequest_model_1.TrialRequest.find({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $lt: now },
        reminderSentAt: { $exists: false },
    });
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
    const now = new Date();
    const result = yield trialRequest_model_1.TrialRequest.deleteMany({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: now },
    });
    return result.deletedCount;
});

const expireOldRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield trialRequest_model_1.TrialRequest.updateMany({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: new Date() },
    }, {
        $set: { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED },
    });
    return result.modifiedCount;
});
exports.TrialRequestService = {
    createTrialRequest,
    getSingleTrialRequest,
    getAvailableTrialRequests,
    getMyAcceptedTrialRequests,
    acceptTrialRequest,
    cancelTrialRequest,
    extendTrialRequest,
    sendExpirationReminders,
    autoDeleteExpiredRequests,
    expireOldRequests,
};
