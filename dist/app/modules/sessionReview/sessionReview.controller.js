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
exports.SessionReviewController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const sessionReview_service_1 = require("./sessionReview.service");

const createReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield sessionReview_service_1.SessionReviewService.createReview(studentId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Review created successfully',
        data: result,
    });
}));

const getMyReviews = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const studentId = req.user.id;
    const result = yield sessionReview_service_1.SessionReviewService.getMyReviews(studentId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Reviews retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getTutorReviews = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { tutorId } = req.params;
    const isAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'SUPER_ADMIN';
    const result = yield sessionReview_service_1.SessionReviewService.getTutorReviews(tutorId, req.query, isAdmin);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Tutor reviews retrieved successfully',
        data: result.data,
        pagination: result.meta,
    });
}));

const getSingleReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield sessionReview_service_1.SessionReviewService.getSingleReview(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review retrieved successfully',
        data: result,
    });
}));

const getReviewBySession = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId } = req.params;
    const result = yield sessionReview_service_1.SessionReviewService.getReviewBySession(sessionId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: result ? 'Review retrieved successfully' : 'No review found for this session',
        data: result,
    });
}));

const updateReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const studentId = req.user.id;
    const result = yield sessionReview_service_1.SessionReviewService.updateReview(id, studentId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review updated successfully',
        data: result,
    });
}));

const deleteReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const studentId = req.user.id;
    yield sessionReview_service_1.SessionReviewService.deleteReview(id, studentId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review deleted successfully',
        data: null,
    });
}));

const getTutorStats = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { tutorId } = req.params;
    const result = yield sessionReview_service_1.SessionReviewService.getTutorStats(tutorId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Tutor statistics retrieved successfully',
        data: result,
    });
}));

const toggleVisibility = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { isPublic } = req.body;
    const result = yield sessionReview_service_1.SessionReviewService.toggleVisibility(id, isPublic);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review visibility updated successfully',
        data: result,
    });
}));

const linkOrphanedReviews = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionReview_service_1.SessionReviewService.linkOrphanedReviews();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: `Linked ${result.linked} reviews, ${result.alreadyLinked} already linked`,
        data: result,
    });
}));

const adminCreateReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sessionReview_service_1.SessionReviewService.adminCreateReview(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Review created successfully',
        data: result,
    });
}));

const adminUpdateReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const result = yield sessionReview_service_1.SessionReviewService.adminUpdateReview(id, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review updated successfully',
        data: result,
    });
}));

const adminDeleteReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield sessionReview_service_1.SessionReviewService.adminDeleteReview(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Review deleted successfully',
        data: null,
    });
}));
exports.SessionReviewController = {
    createReview,
    getMyReviews,
    getTutorReviews,
    getSingleReview,
    getReviewBySession,
    updateReview,
    deleteReview,
    getTutorStats,
    toggleVisibility,
    linkOrphanedReviews,

    adminCreateReview,
    adminUpdateReview,
    adminDeleteReview,
};
