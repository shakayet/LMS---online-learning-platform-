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
exports.TrialRequestController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const trialRequest_service_1 = require("./trialRequest.service");
/**
 * Create trial request (Student or Guest)
 * Can be used by:
 * - Logged-in students (auth token required)
 * - Guest users (no auth required, studentInfo must be complete)
 */
const createTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // studentId will be null for guest users
    const studentId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
    const result = yield trialRequest_service_1.TrialRequestService.createTrialRequest(studentId, req.body);
    // Set refresh token in cookie if new user was created (auto-login)
    if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Trial request created successfully. Matching tutors will be notified.',
        data: {
            trialRequest: result.trialRequest,
            accessToken: result.accessToken,
            user: result.user,
        },
    });
}));
// NOTE: getMatchingTrialRequests, getMyTrialRequests, getAllTrialRequests removed
// Use /session-requests endpoints instead (unified view with requestType filter)
/**
 * Get available trial requests matching tutor's subjects (Tutor)
 * Shows requests tutor can accept based on their teaching subjects
 */
const getAvailableTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield trialRequest_service_1.TrialRequestService.getAvailableTrialRequests(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Available trial requests retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
/**
 * Get tutor's accepted trial requests (Tutor)
 * Shows requests the tutor has already accepted
 */
const getMyAcceptedTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield trialRequest_service_1.TrialRequestService.getMyAcceptedTrialRequests(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Accepted trial requests retrieved successfully',
        pagination: result.pagination,
        data: result.data,
    });
}));
/**
 * Get single trial request
 */
const getSingleTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield trialRequest_service_1.TrialRequestService.getSingleTrialRequest(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request retrieved successfully',
        data: result,
    });
}));
/**
 * Accept trial request (Tutor)
 * Creates chat with student and sends introductory message
 */
const acceptTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const tutorId = req.user.id;
    const { introductoryMessage } = req.body;
    const result = yield trialRequest_service_1.TrialRequestService.acceptTrialRequest(id, tutorId, introductoryMessage);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request accepted successfully. Chat created with student.',
        data: result,
    });
}));
/**
 * Cancel trial request (Student)
 */
const cancelTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const studentId = req.user.id;
    const { cancellationReason } = req.body;
    const result = yield trialRequest_service_1.TrialRequestService.cancelTrialRequest(id, studentId, cancellationReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request cancelled successfully',
        data: result,
    });
}));
/**
 * Extend trial request (Student)
 * Can be called by logged-in student or via email link (guest)
 */
const extendTrialRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    // Support both logged-in users and email-based extension
    const studentIdOrEmail = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || req.body.email || '';
    const result = yield trialRequest_service_1.TrialRequestService.extendTrialRequest(id, studentIdOrEmail);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Trial request extended by 7 days successfully',
        data: result,
    });
}));
/**
 * Send expiration reminders (Cron job endpoint)
 */
const sendExpirationReminders = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield trialRequest_service_1.TrialRequestService.sendExpirationReminders();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} reminder emails sent successfully`,
        data: { reminderCount: count },
    });
}));
/**
 * Auto-delete expired requests (Cron job endpoint)
 */
const autoDeleteExpiredRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield trialRequest_service_1.TrialRequestService.autoDeleteExpiredRequests();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} expired trial requests deleted successfully`,
        data: { deletedCount: count },
    });
}));
/**
 * Expire old trial requests (Cron job endpoint - marks as EXPIRED)
 */
const expireOldRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield trialRequest_service_1.TrialRequestService.expireOldRequests();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} trial requests expired successfully`,
        data: { expiredCount: count },
    });
}));
exports.TrialRequestController = {
    createTrialRequest,
    getAvailableTrialRequests,
    getMyAcceptedTrialRequests,
    getSingleTrialRequest,
    acceptTrialRequest,
    cancelTrialRequest,
    extendTrialRequest,
    sendExpirationReminders,
    autoDeleteExpiredRequests,
    expireOldRequests,
};
