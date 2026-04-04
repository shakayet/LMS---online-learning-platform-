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
exports.SessionRequestController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const sessionRequest_service_1 = require("./sessionRequest.service");

const createSessionRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!studentId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'You must be logged in to create a session request',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.createSessionRequest(studentId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Session request created successfully. Matching tutors will be notified.',
        data: result,
    });
}));

const getMatchingSessionRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tutorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!tutorId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'Unauthorized',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.getMatchingSessionRequests(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Matching session requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getMySessionRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!studentId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'Unauthorized',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.getMySessionRequests(studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Your session requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getAllSessionRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionRequest_service_1.SessionRequestService.getAllSessionRequests(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'All session requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getSingleSessionRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield sessionRequest_service_1.SessionRequestService.getSingleSessionRequest(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session request retrieved successfully',
        data: result,
    });
}));

const acceptSessionRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const tutorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { introductoryMessage } = req.body;
    if (!tutorId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'Unauthorized',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.acceptSessionRequest(id, tutorId, introductoryMessage);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session request accepted successfully. Chat has been created.',
        data: result,
    });
}));

const cancelSessionRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!studentId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'Unauthorized',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.cancelSessionRequest(id, studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session request cancelled successfully',
        data: result,
    });
}));

const extendSessionRequest = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!studentId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'You must be logged in to extend a session request',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.extendSessionRequest(id, studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session request extended by 7 days successfully',
        data: result,
    });
}));

const sendExpirationReminders = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield sessionRequest_service_1.SessionRequestService.sendExpirationReminders();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} reminder emails sent successfully`,
        data: { reminderCount: count },
    });
}));

const autoDeleteExpiredRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield sessionRequest_service_1.SessionRequestService.autoDeleteExpiredRequests();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} expired session requests deleted successfully`,
        data: { deletedCount: count },
    });
}));

const expireOldRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const expiredCount = yield sessionRequest_service_1.SessionRequestService.expireOldRequests();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${expiredCount} session requests expired`,
        data: { expiredCount },
    });
}));

const getMyAcceptedRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tutorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!tutorId) {
        return (0, sendResponse_1.default)(res, {
            success: false,
            statusCode: http_status_codes_1.StatusCodes.UNAUTHORIZED,
            message: 'Unauthorized',
        });
    }
    const result = yield sessionRequest_service_1.SessionRequestService.getMyAcceptedRequests(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Accepted requests retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
exports.SessionRequestController = {
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
