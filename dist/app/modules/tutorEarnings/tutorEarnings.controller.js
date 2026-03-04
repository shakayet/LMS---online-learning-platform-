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
exports.TutorEarningsController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tutorEarnings_service_1 = require("./tutorEarnings.service");
/**
 * Generate tutor earnings (Cron job or manual trigger)
 */
const generateTutorEarnings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year, commissionRate } = req.body;
    const result = yield tutorEarnings_service_1.TutorEarningsService.generateTutorEarnings(month, year, commissionRate);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: `${result.length} tutor earnings generated successfully`,
        data: { count: result.length, earnings: result },
    });
}));
/**
 * Get tutor's earnings history
 */
const getMyEarnings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorEarnings_service_1.TutorEarningsService.getMyEarnings(tutorId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Earnings history retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get all earnings (Admin)
 */
const getAllEarnings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorEarnings_service_1.TutorEarningsService.getAllEarnings(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Earnings retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get single earnings record
 */
const getSingleEarning = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorEarnings_service_1.TutorEarningsService.getSingleEarning(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Earnings record retrieved successfully',
        data: result,
    });
}));
/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorEarnings_service_1.TutorEarningsService.initiatePayout(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payout initiated successfully',
        data: result,
    });
}));
/**
 * Mark payout as paid (Manual or webhook)
 */
const markAsPaid = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield tutorEarnings_service_1.TutorEarningsService.markAsPaid(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payout marked as paid',
        data: result,
    });
}));
/**
 * Mark payout as failed
 */
const markAsFailed = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { failureReason } = req.body;
    const result = yield tutorEarnings_service_1.TutorEarningsService.markAsFailed(id, failureReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payout marked as failed',
        data: result,
    });
}));
// ============ PAYOUT SETTINGS ============
/**
 * Get tutor's payout settings
 */
const getPayoutSettings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorEarnings_service_1.TutorEarningsService.getPayoutSettings(tutorId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payout settings retrieved successfully',
        data: result,
    });
}));
/**
 * Update tutor's payout settings
 */
const updatePayoutSettings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorEarnings_service_1.TutorEarningsService.updatePayoutSettings(tutorId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payout settings updated successfully',
        data: result,
    });
}));
// ============ TUTOR STATS ============
/**
 * Get tutor's comprehensive stats including level progress
 */
const getMyStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const result = yield tutorEarnings_service_1.TutorEarningsService.getMyStats(tutorId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Tutor stats retrieved successfully',
        data: result,
    });
}));
/**
 * Get formatted earnings history for frontend
 */
const getEarningsHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tutorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = yield tutorEarnings_service_1.TutorEarningsService.getEarningsHistory(tutorId, page, limit);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Earnings history retrieved successfully',
        data: result.data,
        pagination: {
            total: result.meta.total,
            page: result.meta.page,
            limit: result.meta.limit,
            totalPage: result.meta.totalPages,
        },
    });
}));
exports.TutorEarningsController = {
    generateTutorEarnings,
    getMyEarnings,
    getAllEarnings,
    getSingleEarning,
    initiatePayout,
    markAsPaid,
    markAsFailed,
    // New methods
    getPayoutSettings,
    updatePayoutSettings,
    getMyStats,
    getEarningsHistory,
};
