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
/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getDashboardStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Dashboard statistics retrieved successfully',
        data: result,
    });
}));
/**
 * Get revenue statistics by month
 */
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
/**
 * Get popular subjects
 */
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
/**
 * Get top tutors
 */
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
/**
 * Get top students
 */
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
/**
 * Get user growth statistics
 */
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
/**
 * Get overview stats with percentage changes
 * Query: ?period=month (day|week|month|quarter|year)
 */
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
/**
 * Get monthly revenue with filters
 * Query: ?year=2024&months=1,2,3&tutorId=xxx&studentId=xxx&subscriptionTier=FLEXIBLE&subject=Math
 */
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
    // Remove undefined values
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
/**
 * Get user distribution
 * Query: ?groupBy=role (role|status|both)
 */
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
/**
 * Get unified sessions (Sessions + Trial Requests)
 * Query: ?page=1&limit=10&status=SCHEDULED&paymentStatus=FREE_TRIAL&isTrial=true&search=john&sortBy=createdAt&sortOrder=desc
 */
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
/**
 * Get session stats for admin dashboard
 */
const getSessionStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getSessionStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Session stats retrieved successfully',
        data: result,
    });
}));
/**
 * Get application statistics for admin dashboard
 * Returns counts by status
 */
const getApplicationStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield admin_service_1.AdminService.getApplicationStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Application statistics retrieved successfully',
        data: result,
    });
}));
/**
 * Get all transactions (Student Payments + Tutor Payouts)
 * Query: ?page=1&limit=10&type=all&status=PAID&search=john&sortBy=date&sortOrder=desc
 */
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
/**
 * Get transaction statistics
 */
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
