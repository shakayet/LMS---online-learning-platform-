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
exports.TutorApplicationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tutorApplication_service_1 = require("./tutorApplication.service");
// Submit application (PUBLIC - creates user + application)
const submitApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorApplication_service_1.TutorApplicationService.submitApplication(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Application submitted successfully',
        data: result,
    });
}));
// Get my application (applicant view - requires auth)
const getMyApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
    const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
    const result = yield tutorApplication_service_1.TutorApplicationService.getMyApplication(userEmail, userRole);
    (0, sendResponse_1.default)(res, Object.assign({ success: true, statusCode: http_status_codes_1.StatusCodes.OK, message: 'Application retrieved successfully', data: result.application }, (result.newAccessToken && { accessToken: result.newAccessToken })));
}));
// Get all applications (admin view) With filtering, searching, pagination
const getAllApplications = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorApplication_service_1.TutorApplicationService.getAllApplications(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Applications retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
// Get single application (admin view)
const getSingleApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.getSingleApplication(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application retrieved successfully',
        data: result,
    });
}));
// Select for interview (Admin only) - after initial review
const selectForInterview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.selectForInterview(id, adminNotes);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application selected for interview',
        data: result,
    });
}));
// Approve application (Admin only) - after interview
const approveApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.approveApplication(id, adminNotes);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application approved successfully. User is now a TUTOR.',
        data: result,
    });
}));
// Reject application (Admin only)
const rejectApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.rejectApplication(id, rejectionReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application rejected',
        data: result,
    });
}));
// Send for revision (Admin only)
const sendForRevision = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { revisionNote } = req.body;
    const result = yield tutorApplication_service_1.TutorApplicationService.sendForRevision(id, revisionNote);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application sent for revision',
        data: result,
    });
}));
// Delete application (Admin only)
const deleteApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorApplication_service_1.TutorApplicationService.deleteApplication(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application deleted successfully',
        data: result,
    });
}));
// Update my application (Applicant only - when in REVISION status)
const updateMyApplication = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userEmail = (_a = req.user) === null || _a === void 0 ? void 0 : _a.email;
    const result = yield tutorApplication_service_1.TutorApplicationService.updateMyApplication(userEmail, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application updated and resubmitted successfully',
        data: result,
    });
}));
exports.TutorApplicationController = {
    submitApplication,
    getMyApplication,
    getAllApplications,
    getSingleApplication,
    selectForInterview,
    approveApplication,
    rejectApplication,
    sendForRevision,
    deleteApplication,
    updateMyApplication,
};
