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
exports.InterviewSlotController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const interviewSlot_service_1 = require("./interviewSlot.service");

const createInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield interviewSlot_service_1.InterviewSlotService.createInterviewSlot(adminId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Interview slot created successfully',
        data: result,
    });
}));

const getAllInterviewSlots = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    const result = yield interviewSlot_service_1.InterviewSlotService.getAllInterviewSlots(req.query, userId, userRole);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slots retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getSingleInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield interviewSlot_service_1.InterviewSlotService.getSingleInterviewSlot(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slot retrieved successfully',
        data: result,
    });
}));

const bookInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const applicantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { applicationId } = req.body;
    const result = yield interviewSlot_service_1.InterviewSlotService.bookInterviewSlot(id, applicantId, applicationId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slot booked successfully',
        data: result,
    });
}));

const cancelInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { cancellationReason } = req.body;
    const result = yield interviewSlot_service_1.InterviewSlotService.cancelInterviewSlot(id, userId, cancellationReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slot cancelled successfully',
        data: result,
    });
}));

const rescheduleInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const applicantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const { newSlotId } = req.body;
    const result = yield interviewSlot_service_1.InterviewSlotService.rescheduleInterviewSlot(id, newSlotId, applicantId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview rescheduled successfully',
        data: result,
    });
}));

const markAsCompleted = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield interviewSlot_service_1.InterviewSlotService.markAsCompleted(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview marked as completed successfully',
        data: result,
    });
}));

const updateInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield interviewSlot_service_1.InterviewSlotService.updateInterviewSlot(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slot updated successfully',
        data: result,
    });
}));

const deleteInterviewSlot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield interviewSlot_service_1.InterviewSlotService.deleteInterviewSlot(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Interview slot deleted successfully',
        data: result,
    });
}));

const getMyBookedInterview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const applicantId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield interviewSlot_service_1.InterviewSlotService.getMyBookedInterview(applicantId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: result
            ? 'Booked interview slot retrieved successfully'
            : 'No booked interview slot found',
        data: result,
    });
}));

const getScheduledMeetings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield interviewSlot_service_1.InterviewSlotService.getScheduledMeetings(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Scheduled meetings retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getMeetingToken = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield interviewSlot_service_1.InterviewSlotService.getInterviewMeetingToken(id, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Meeting token generated successfully',
        data: result,
    });
}));
exports.InterviewSlotController = {
    createInterviewSlot,
    getAllInterviewSlots,
    getSingleInterviewSlot,
    bookInterviewSlot,
    cancelInterviewSlot,
    rescheduleInterviewSlot,
    markAsCompleted,
    updateInterviewSlot,
    deleteInterviewSlot,
    getMyBookedInterview,
    getScheduledMeetings,
    getMeetingToken,
};
