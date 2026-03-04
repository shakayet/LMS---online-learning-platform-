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
exports.TutorSessionFeedbackController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tutorSessionFeedback_service_1 = require("./tutorSessionFeedback.service");
// Submit feedback for a session (tutor action)
const submitFeedback = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.submitFeedback(tutorId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Feedback submitted successfully',
        data: result,
    });
}));
// Get pending feedbacks for logged-in tutor
const getPendingFeedbacks = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getPendingFeedbacks(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Pending feedbacks retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
// Get all submitted feedbacks for logged-in tutor
const getTutorFeedbacks = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getTutorFeedbacks(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Feedbacks retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
// Get feedback for a specific session
const getFeedbackBySession = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getFeedbackBySession(sessionId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Feedback retrieved successfully',
        data: result,
    });
}));
// Get feedbacks received by logged-in student
const getMyReceivedFeedbacks = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getStudentFeedbacks(studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Received feedbacks retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
// Admin: Get forfeited payments summary
const getForfeitedPaymentsSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year } = req.query;
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getForfeitedPaymentsSummary({
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
    });
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Forfeited payments summary retrieved successfully',
        data: result,
    });
}));
// Admin: Get list of forfeited feedbacks
const getForfeitedFeedbacksList = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.getForfeitedFeedbacksList(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Forfeited feedbacks list retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
exports.TutorSessionFeedbackController = {
    submitFeedback,
    getPendingFeedbacks,
    getTutorFeedbacks,
    getFeedbackBySession,
    getMyReceivedFeedbacks,
    getForfeitedPaymentsSummary,
    getForfeitedFeedbacksList,
};
