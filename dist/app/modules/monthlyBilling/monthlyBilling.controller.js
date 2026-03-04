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
exports.MonthlyBillingController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const monthlyBilling_service_1 = require("./monthlyBilling.service");
/**
 * Generate monthly billings (Cron job or manual trigger)
 */
const generateMonthlyBillings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year } = req.body;
    const result = yield monthlyBilling_service_1.MonthlyBillingService.generateMonthlyBillings(month, year);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: `${result.length} monthly billings generated successfully`,
        data: { count: result.length, billings: result },
    });
}));
/**
 * Get student's billing history
 */
const getMyBillings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield monthlyBilling_service_1.MonthlyBillingService.getMyBillings(studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Billing history retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get all billings (Admin)
 */
const getAllBillings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield monthlyBilling_service_1.MonthlyBillingService.getAllBillings(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Billings retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));
/**
 * Get single billing
 */
const getSingleBilling = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield monthlyBilling_service_1.MonthlyBillingService.getSingleBilling(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Billing retrieved successfully',
        data: result,
    });
}));
/**
 * Mark billing as paid (Manual or webhook)
 */
const markAsPaid = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield monthlyBilling_service_1.MonthlyBillingService.markAsPaid(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Billing marked as paid',
        data: result,
    });
}));
/**
 * Mark billing as failed
 */
const markAsFailed = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { failureReason } = req.body;
    const result = yield monthlyBilling_service_1.MonthlyBillingService.markAsFailed(id, failureReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Billing marked as failed',
        data: result,
    });
}));
exports.MonthlyBillingController = {
    generateMonthlyBillings,
    getMyBillings,
    getAllBillings,
    getSingleBilling,
    markAsPaid,
    markAsFailed,
};
