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
exports.PaymentMethodController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const paymentMethod_service_1 = require("./paymentMethod.service");
/**
 * Get all saved payment methods
 */
const getPaymentMethods = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield paymentMethod_service_1.PaymentMethodService.getPaymentMethods(studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payment methods retrieved successfully',
        data: result,
    });
}));
/**
 * Create SetupIntent for adding new payment method
 */
const createSetupIntent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield paymentMethod_service_1.PaymentMethodService.createSetupIntent(studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Setup intent created successfully',
        data: result,
    });
}));
/**
 * Attach payment method after successful setup
 */
const attachPaymentMethod = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { paymentMethodId, setAsDefault } = req.body;
    const result = yield paymentMethod_service_1.PaymentMethodService.attachPaymentMethod(studentId, paymentMethodId, setAsDefault);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Payment method added successfully',
        data: result,
    });
}));
/**
 * Set a payment method as default
 */
const setDefaultPaymentMethod = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { paymentMethodId } = req.params;
    const result = yield paymentMethod_service_1.PaymentMethodService.setDefaultPaymentMethod(studentId, paymentMethodId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Default payment method updated successfully',
        data: result,
    });
}));
/**
 * Delete a payment method
 */
const deletePaymentMethod = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { paymentMethodId } = req.params;
    const result = yield paymentMethod_service_1.PaymentMethodService.deletePaymentMethod(studentId, paymentMethodId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payment method deleted successfully',
        data: result,
    });
}));
exports.PaymentMethodController = {
    getPaymentMethods,
    createSetupIntent,
    attachPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
};
