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
exports.StudentSubscriptionController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const studentSubscription_service_1 = require("./studentSubscription.service");

const subscribeToPlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { tier } = req.body;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.subscribeToPlan(studentId, tier);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Subscription created successfully',
        data: result,
    });
}));

const getMySubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.getMySubscription(studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Subscription retrieved successfully',
        data: result,
    });
}));

const getAllSubscriptions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield studentSubscription_service_1.StudentSubscriptionService.getAllSubscriptions(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Subscriptions retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getSingleSubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.getSingleSubscription(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Subscription retrieved successfully',
        data: result,
    });
}));

const cancelSubscription = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const studentId = req.user.id;
    const { cancellationReason } = req.body;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.cancelSubscription(id, studentId, cancellationReason);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Subscription cancelled successfully',
        data: result,
    });
}));

const expireOldSubscriptions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const count = yield studentSubscription_service_1.StudentSubscriptionService.expireOldSubscriptions();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `${count} subscriptions expired successfully`,
        data: { expiredCount: count },
    });
}));

const getMyPlanUsage = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.getMyPlanUsage(studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Plan usage retrieved successfully',
        data: result,
    });
}));

const createPaymentIntent = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { tier } = req.body;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.createSubscriptionPaymentIntent(studentId, tier);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payment intent created successfully',
        data: result,
    });
}));

const confirmPayment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const { subscriptionId, paymentIntentId } = req.body;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.confirmSubscriptionPayment(subscriptionId, paymentIntentId, studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Subscription activated successfully',
        data: result,
    });
}));

const getPaymentHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = yield studentSubscription_service_1.StudentSubscriptionService.getPaymentHistory(studentId, page, limit);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Payment history retrieved successfully',
        data: result.data,
        pagination: {
            page: result.meta.page,
            limit: result.meta.limit,
            total: result.meta.total,
            totalPage: result.meta.totalPages,
        },
    });
}));
exports.StudentSubscriptionController = {
    subscribeToPlan,
    getMySubscription,
    getAllSubscriptions,
    getSingleSubscription,
    cancelSubscription,
    expireOldSubscriptions,
    getMyPlanUsage,
    createPaymentIntent,
    confirmPayment,
    getPaymentHistory,
};
