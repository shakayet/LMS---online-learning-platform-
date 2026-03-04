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
/**
 * Create trial request (First-time Student or Guest ONLY)
 * For returning students, use SessionRequest module instead
 * Automatically creates User account when trial request is created
 */
const createTrialRequest = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    // Validate subject exists
    const subjectExists = yield subject_model_1.Subject.findById(payload.subject);
    if (!subjectExists) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    // Validate based on age
    // Under 18: guardian info required
    // 18+: student email/password required
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
    // If logged-in student, verify and check eligibility
    if (studentId) {
        const student = yield user_model_1.User.findById(studentId);
        if (!student) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Student not found');
        }
        if (student.role !== user_1.USER_ROLES.STUDENT) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only students can create trial requests');
        }
        // Returning students should use SessionRequest, not TrialRequest
        if ((_e = student.studentProfile) === null || _e === void 0 ? void 0 : _e.hasCompletedTrial) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already completed a trial. Please use the session request feature for additional tutoring sessions.');
        }
        // Check if student has pending trial request
        const pendingTrialRequest = yield trialRequest_model_1.TrialRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        });
        if (pendingTrialRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a pending trial request. Please wait for a tutor to accept or cancel it.');
        }
        // Also check for pending session request
        const pendingSessionRequest = yield sessionRequest_model_1.SessionRequest.findOne({
            studentId: new mongoose_1.Types.ObjectId(studentId),
            status: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
        });
        if (pendingSessionRequest) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have a pending session request. Please wait for it to be accepted or cancel it first.');
        }
    }
    else {
        // Guest user - check by email for previous trials and pending requests
        const emailToCheck = ((_f = payload.studentInfo) === null || _f === void 0 ? void 0 : _f.isUnder18)
            ? (_h = (_g = payload.studentInfo) === null || _g === void 0 ? void 0 : _g.guardianInfo) === null || _h === void 0 ? void 0 : _h.email
            : (_j = payload.studentInfo) === null || _j === void 0 ? void 0 : _j.email;
        if (emailToCheck) {
            // Check if user already exists with this email
            const existingUser = yield user_model_1.User.findOne({ email: emailToCheck.toLowerCase() });
            if (existingUser) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'An account with this email already exists. Please log in to create a trial request.');
            }
            // Check if guest has already completed a trial
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
            // Check for pending requests
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
    // Auto-create User account for guest users when trial request is created
    // Uses MongoDB transaction to prevent orphaned users if any step fails
    let createdStudentId = studentId;
    let accessToken;
    let refreshToken;
    let userInfo;
    let trialRequest;
    if (!studentId && payload.studentInfo) {
        // Determine email and password based on age
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
            // Transaction: User + TrialRequest created together or not at all
            const dbSession = yield mongoose_1.default.startSession();
            dbSession.startTransaction();
            try {
                // Create new User account within transaction
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
                // Generate JWT tokens for auto-login (pure computation, won't fail DB)
                accessToken = jwtHelper_1.jwtHelper.createToken({ id: newUser._id, role: newUser.role, email: newUser.email }, config_1.default.jwt.jwt_secret, config_1.default.jwt.jwt_expire_in);
                refreshToken = jwtHelper_1.jwtHelper.createToken({ id: newUser._id, role: newUser.role, email: newUser.email }, config_1.default.jwt.jwt_refresh_secret, config_1.default.jwt.jwt_refresh_expire_in);
                userInfo = {
                    _id: newUser._id.toString(),
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                };
                // Create trial request within same transaction
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
            // No email/password - create trial request without user account
            trialRequest = yield trialRequest_model_1.TrialRequest.create(Object.assign(Object.assign({}, payload), { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }));
        }
    }
    else {
        // Logged-in student - create trial request directly (user already exists)
        trialRequest = yield trialRequest_model_1.TrialRequest.create(Object.assign(Object.assign({}, payload), { studentId: createdStudentId ? new mongoose_1.Types.ObjectId(createdStudentId) : undefined, status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }));
        // Increment student trial request count
        if (studentId) {
            yield user_model_1.User.findByIdAndUpdate(studentId, {
                $inc: { 'studentProfile.trialRequestsCount': 1 },
            });
        }
    }
    // Send real-time notification to matching tutors via socket (AFTER transaction committed)
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
    // TODO: Send email notification to admin
    // TODO: Send confirmation email to student
    return {
        trialRequest,
        accessToken,
        refreshToken,
        user: userInfo,
    };
});
/**
 * Get single trial request
 */
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
/**
 * Get available trial requests matching tutor's subjects (Tutor)
 * Returns PENDING requests where:
 * - Tutor teaches the requested subject
 * - Request is not expired
 * - Request was not created by the tutor's own students (future consideration)
 */
const getAvailableTrialRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Verify tutor exists and is verified
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can view available requests');
    }
    // Get tutor's subjects
    const tutorSubjectIds = ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.subjects) || [];
    if (tutorSubjectIds.length === 0) {
        return {
            pagination: { page: 1, limit: 10, total: 0, totalPage: 0 },
            data: [],
        };
    }
    const now = new Date();
    // Build query for pending requests matching tutor's subjects
    const requestQuery = new QueryBuilder_1.default(trialRequest_model_1.TrialRequest.find({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        subject: { $in: tutorSubjectIds },
        expiresAt: { $gt: now }, // Not expired
    })
        .populate('subject', 'name icon description')
        .select('-studentInfo.password -studentInfo.guardianInfo.password'), query)
        .filter()
        .sort()
        .paginate();
    const requests = yield requestQuery.modelQuery;
    const paginationInfo = yield requestQuery.getPaginationInfo();
    // Calculate student age from DOB for each request
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
/**
 * Get tutor's accepted trial requests (Tutor)
 * Returns requests the tutor has accepted with their status
 */
const getMyAcceptedTrialRequests = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify tutor exists
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
    }
    // Build query for accepted requests by this tutor
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
/**
 * Accept trial request (Tutor)
 * Creates chat and connects student with tutor
 * Sends introductory message to chat
 * Marks student as having completed trial
 */
const acceptTrialRequest = (requestId, tutorId, introductoryMessage) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    // Verify tutor FIRST (before atomic update, so we don't accept then fail)
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
    }
    if (!((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.isVerified)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
    }
    // Verify tutor teaches this subject - need to check request first
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
    // Atomic update: only one teacher can accept (prevents race condition)
    // All validations passed, now atomically claim the request
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
        // Another teacher accepted between our check and update, or it expired
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
    // Prepare chat participants
    // If studentId exists (logged-in user), use it; otherwise, create chat with tutor only for now
    const chatParticipants = request.studentId
        ? [request.studentId, new mongoose_1.Types.ObjectId(tutorId)]
        : [new mongoose_1.Types.ObjectId(tutorId)];
    // Check if chat already exists between tutor and student (to avoid duplicate chats)
    let chat = yield chat_model_1.Chat.findOne({
        participants: { $all: chatParticipants },
    });
    if (chat) {
        // Reuse existing chat, update trial request reference
        chat.trialRequestId = request._id;
        chat.sessionRequestId = undefined; // Clear session reference for trial
        yield chat.save();
    }
    else {
        // Create new chat only if none exists
        chat = yield chat_model_1.Chat.create({
            participants: chatParticipants,
            trialRequestId: request._id,
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
    // Update chatId on the request (status/tutor/acceptedAt already set atomically above)
    yield trialRequest_model_1.TrialRequest.findByIdAndUpdate(requestId, { chatId: chat._id });
    // Mark student as having completed trial (so they use SessionRequest next time)
    if (request.studentId) {
        yield user_model_1.User.findByIdAndUpdate(request.studentId, {
            $set: { 'studentProfile.hasCompletedTrial': true },
        });
    }
    // Send real-time notification to student via socket
    const io = global.io;
    if (io) {
        // Populate the request with tutor info for the notification
        const populatedRequest = yield trialRequest_model_1.TrialRequest.findById(request._id)
            .populate('acceptedTutorId', 'name email profilePicture')
            .populate('subject', 'name icon description')
            .populate('chatId');
        // Emit to student's personal room
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
        // Also notify other tutors that this request is no longer available
        const otherTutors = yield user_model_1.User.find({
            role: user_1.USER_ROLES.TUTOR,
            'tutorProfile.isVerified': true,
            'tutorProfile.subjects': request.subject,
            _id: { $ne: tutorId }, // Exclude the accepting tutor
        }).select('_id');
        otherTutors.forEach(otherTutor => {
            io.to(`user::${otherTutor._id.toString()}`).emit('TRIAL_REQUEST_TAKEN', {
                trialRequestId: request._id,
            });
        });
    }
    // TODO: Send email to student
    return request;
});
/**
 * Cancel trial request (Student)
 * Can be cancelled by studentId (logged-in) or by email (guest)
 */
const cancelTrialRequest = (requestId, studentIdOrEmail, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    // Verify ownership - check both studentId and studentInfo.email
    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only cancel your own trial requests');
    }
    // Can only cancel PENDING requests
    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be cancelled');
    }
    // Update request
    request.status = trialRequest_interface_1.TRIAL_REQUEST_STATUS.CANCELLED;
    request.cancellationReason = cancellationReason;
    request.cancelledAt = new Date();
    yield request.save();
    return request;
});
/**
 * Extend trial request (Student)
 * Adds 7 more days to expiration (max 1 extension)
 */
const extendTrialRequest = (requestId, studentIdOrEmail) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const request = yield trialRequest_model_1.TrialRequest.findById(requestId);
    if (!request) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Trial request not found');
    }
    // Verify ownership
    const isOwnerByStudentId = request.studentId && request.studentId.toString() === studentIdOrEmail;
    const isOwnerByEmail = ((_b = (_a = request.studentInfo) === null || _a === void 0 ? void 0 : _a.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === studentIdOrEmail.toLowerCase();
    const isOwnerByGuardianEmail = ((_e = (_d = (_c = request.studentInfo) === null || _c === void 0 ? void 0 : _c.guardianInfo) === null || _d === void 0 ? void 0 : _d.email) === null || _e === void 0 ? void 0 : _e.toLowerCase()) === studentIdOrEmail.toLowerCase();
    if (!isOwnerByStudentId && !isOwnerByEmail && !isOwnerByGuardianEmail) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only extend your own trial requests');
    }
    // Can only extend PENDING requests
    if (request.status !== trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only pending trial requests can be extended');
    }
    // Check extension limit (max 1)
    if (request.extensionCount && request.extensionCount >= 1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Trial request can only be extended once');
    }
    // Extend by 7 days
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    request.expiresAt = newExpiresAt;
    request.isExtended = true;
    request.extensionCount = (request.extensionCount || 0) + 1;
    request.finalExpiresAt = undefined; // Reset final deadline
    request.reminderSentAt = undefined; // Reset reminder
    yield request.save();
    // TODO: Send confirmation email
    return request;
});
/**
 * Send reminders for expiring requests (Cron job)
 * Finds requests where expiresAt has passed but no reminder sent yet
 * Sets finalExpiresAt to 3 days from now
 */
const sendExpirationReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    // Find expired requests that haven't received reminder
    const expiredRequests = yield trialRequest_model_1.TrialRequest.find({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $lt: now },
        reminderSentAt: { $exists: false },
    });
    let reminderCount = 0;
    for (const request of expiredRequests) {
        // Set reminder sent and final deadline (3 days)
        const finalDeadline = new Date();
        finalDeadline.setDate(finalDeadline.getDate() + 3);
        request.reminderSentAt = now;
        request.finalExpiresAt = finalDeadline;
        yield request.save();
        // TODO: Send email notification
        // const email = request.studentInfo?.isUnder18
        //   ? request.studentInfo?.guardianInfo?.email
        //   : request.studentInfo?.email;
        // await sendEmail({
        //   to: email,
        //   subject: 'Your Trial Request is Expiring',
        //   template: 'trial-request-expiring',
        //   data: {
        //     name: request.studentInfo?.name,
        //     expiresAt: finalDeadline,
        //     extendUrl: `${FRONTEND_URL}/trial-requests/${request._id}/extend`,
        //     cancelUrl: `${FRONTEND_URL}/trial-requests/${request._id}/cancel`,
        //   }
        // });
        reminderCount++;
    }
    return reminderCount;
});
/**
 * Auto-delete requests after final deadline (Cron job)
 * Deletes requests where finalExpiresAt has passed with no response
 */
const autoDeleteExpiredRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const result = yield trialRequest_model_1.TrialRequest.deleteMany({
        status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
        finalExpiresAt: { $lt: now },
    });
    return result.deletedCount;
});
/**
 * Auto-expire trial requests (Cron job - legacy)
 * Marks as EXPIRED instead of delete (for records)
 */
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
