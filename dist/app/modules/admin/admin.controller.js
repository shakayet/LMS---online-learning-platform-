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
exports.AdminController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const admin_service_1 = require("./admin.service");

const getDashboardStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getDashboardStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Dashboard statistics retrieved successfully',
        data: result,
    });
}));

const getRevenueByMonth = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, months } = req.query;
    const yearNumber = year ? parseInt(year) : new Date().getFullYear();
    const monthsArray = months
        ? months.split(',').map(m => parseInt(m))
        : undefined;
    const result = yield admin_service_1.AdminService.getRevenueByMonth(yearNumber, monthsArray);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Revenue statistics retrieved successfully',
        data: result,
    });
}));

const getPopularSubjects = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const result = yield admin_service_1.AdminService.getPopularSubjects(limitNumber);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Popular subjects retrieved successfully',
        data: result,
    });
}));

const getTopTutors = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit, sortBy } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const sortByValue = sortBy || 'sessions';
    const result = yield admin_service_1.AdminService.getTopTutors(limitNumber, sortByValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Top tutors retrieved successfully',
        data: result,
    });
}));

const getTopStudents = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { limit, sortBy } = req.query;
    const limitNumber = limit ? parseInt(limit) : 10;
    const sortByValue = sortBy || 'spending';
    const result = yield admin_service_1.AdminService.getTopStudents(limitNumber, sortByValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Top students retrieved successfully',
        data: result,
    });
}));

const getUserGrowth = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, months } = req.query;
    const yearNumber = year ? parseInt(year) : new Date().getFullYear();
    const monthsArray = months
        ? months.split(',').map(m => parseInt(m))
        : undefined;
    const result = yield admin_service_1.AdminService.getUserGrowth(yearNumber, monthsArray);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'User growth statistics retrieved successfully',
        data: result,
    });
}));

const getOverviewStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { period } = req.query;
    const periodValue = period || 'month';
    const result = yield admin_service_1.AdminService.getOverviewStats(periodValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Overview statistics retrieved successfully',
        data: result,
    });
}));

const getMonthlyRevenue = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year, months, tutorId, studentId, subscriptionTier, subject } = req.query;
    const yearNumber = year ? parseInt(year) : new Date().getFullYear();
    const monthsArray = months
        ? months.split(',').map(m => parseInt(m.trim()))
        : undefined;
    const filters = {
        tutorId: tutorId,
        studentId: studentId,
        subscriptionTier: subscriptionTier,
        subject: subject,
    };

    Object.keys(filters).forEach(key => {
        if (filters[key] === undefined) {
            delete filters[key];
        }
    });
    const result = yield admin_service_1.AdminService.getMonthlyRevenue(yearNumber, monthsArray, Object.keys(filters).length > 0 ? filters : undefined);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Monthly revenue statistics retrieved successfully',
        data: result,
    });
}));

const getUserDistribution = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { groupBy } = req.query;
    const groupByValue = groupBy || 'role';
    const result = yield admin_service_1.AdminService.getUserDistribution(groupByValue);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'User distribution retrieved successfully',
        data: result,
    });
}));

const getUnifiedSessions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, status, paymentStatus, isTrial, search, sortBy, sortOrder, } = req.query;
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        status: status,
        paymentStatus: paymentStatus,
        isTrial: isTrial ? isTrial === 'true' : undefined,
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
    };
    const result = yield admin_service_1.AdminService.getUnifiedSessions(query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Unified sessions retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
}));

const getSessionStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getSessionStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session stats retrieved successfully',
        data: result,
    });
}));

const getApplicationStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getApplicationStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application statistics retrieved successfully',
        data: result,
    });
}));

const getTransactions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, type, status, search, sortBy, sortOrder, } = req.query;
    const query = {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        type: type,
        status: status,
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
    };
    const result = yield admin_service_1.AdminService.getTransactions(query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Transactions retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
}));

const getTransactionStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getTransactionStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Transaction statistics retrieved successfully',
        data: result,
    });
}));
exports.AdminController = {
    getDashboardStats,
    getRevenueByMonth,
    getPopularSubjects,
    getTopTutors,
    getTopStudents,
    getUserGrowth,
    getOverviewStats,
    getMonthlyRevenue,
    getUserDistribution,
    getUnifiedSessions,
    getSessionStats,
    getApplicationStats,
    getTransactions,
    getTransactionStats,
};
