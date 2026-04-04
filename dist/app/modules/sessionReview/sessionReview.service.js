"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.SessionReviewService = void 0;
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const sessionReview_model_1 = require("./sessionReview.model");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));

const createReview = (studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {

    const session = yield session_model_1.Session.findById(payload.sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    if (session.status !== session_interface_1.SESSION_STATUS.COMPLETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Can only review completed sessions');
    }

    if (session.studentId.toString() !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only review your own sessions');
    }

    const existingReview = yield sessionReview_model_1.SessionReview.findOne({
        sessionId: payload.sessionId,
    });
    if (existingReview) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Review already exists for this session');
    }

    const review = yield sessionReview_model_1.SessionReview.create(Object.assign(Object.assign({}, payload), { studentId: new mongoose_1.Types.ObjectId(studentId), tutorId: session.tutorId }));

    yield session_model_1.Session.findByIdAndUpdate(payload.sessionId, {
        reviewId: review._id,
    });

    const io = global.io;
    if (io && session.chatId) {
        const chatIdStr = String(session.chatId);
        const reviewPayload = {
            sessionId: payload.sessionId,
            chatId: chatIdStr,
            reviewId: review._id,
            rating: review.overallRating,
        };

        io.to(`chat::${chatIdStr}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);
        io.to(`user::${studentId}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);
        io.to(`user::${String(session.tutorId)}`).emit('STUDENT_REVIEW_SUBMITTED', reviewPayload);
        console.log(`[Socket Emit] STUDENT_REVIEW_SUBMITTED sent for session ${payload.sessionId}`);
    }
    return review;
});

const getMyReviews = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const reviewQuery = new QueryBuilder_1.default(sessionReview_model_1.SessionReview.find({ studentId })
        .populate('sessionId', 'subject startTime endTime')
        .populate('tutorId', 'name email'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield reviewQuery.modelQuery;
    const meta = yield reviewQuery.getPaginationInfo();
    return { data: result, meta };
});

const getTutorReviews = (tutorId_1, query_1, ...args_1) => __awaiter(void 0, [tutorId_1, query_1, ...args_1], void 0, function* (tutorId, query, isAdmin = false) {
    const baseQuery = isAdmin
        ? { tutorId }
        : { tutorId, isPublic: true };
    const reviewQuery = new QueryBuilder_1.default(sessionReview_model_1.SessionReview.find(baseQuery)
        .populate('studentId', 'name')
        .populate('sessionId', 'subject startTime'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield reviewQuery.modelQuery;
    const meta = yield reviewQuery.getPaginationInfo();
    return { data: result, meta };
});

const getReviewBySession = (sessionId) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findOne({ sessionId })
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime endTime');
    return review;
});

const getSingleReview = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id)
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime endTime');
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    return review;
});

const updateReview = (id, studentId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }

    if (((_a = review.studentId) === null || _a === void 0 ? void 0 : _a.toString()) !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only update your own reviews');
    }

    Object.assign(review, payload);
    review.isEdited = true;
    review.editedAt = new Date();
    yield review.save();
    return review;
});

const deleteReview = (id, studentId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }

    if (((_a = review.studentId) === null || _a === void 0 ? void 0 : _a.toString()) !== studentId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only delete your own reviews');
    }
    yield sessionReview_model_1.SessionReview.findByIdAndDelete(id);
    return review;
});

const getTutorStats = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    const reviews = yield sessionReview_model_1.SessionReview.find({ tutorId, isPublic: true });
    if (reviews.length === 0) {
        return {
            tutorId: new mongoose_1.Types.ObjectId(tutorId),
            totalReviews: 0,
            averageOverallRating: 0,
            averageTeachingQuality: 0,
            averageCommunication: 0,
            averagePunctuality: 0,
            averagePreparedness: 0,
            wouldRecommendPercentage: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
    }
    const totalReviews = reviews.length;

    const averageOverallRating = reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews;
    const averageTeachingQuality = reviews.reduce((sum, r) => sum + r.teachingQuality, 0) / totalReviews;
    const averageCommunication = reviews.reduce((sum, r) => sum + r.communication, 0) / totalReviews;
    const averagePunctuality = reviews.reduce((sum, r) => sum + r.punctuality, 0) / totalReviews;
    const averagePreparedness = reviews.reduce((sum, r) => sum + r.preparedness, 0) / totalReviews;

    const wouldRecommendCount = reviews.filter(r => r.wouldRecommend).length;
    const wouldRecommendPercentage = (wouldRecommendCount / totalReviews) * 100;

    const ratingDistribution = reviews.reduce((dist, r) => {
        const rating = Math.floor(r.overallRating);
        dist[rating]++;
        return dist;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
    return {
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        totalReviews,
        averageOverallRating: Math.round(averageOverallRating * 10) / 10,
        averageTeachingQuality: Math.round(averageTeachingQuality * 10) / 10,
        averageCommunication: Math.round(averageCommunication * 10) / 10,
        averagePunctuality: Math.round(averagePunctuality * 10) / 10,
        averagePreparedness: Math.round(averagePreparedness * 10) / 10,
        wouldRecommendPercentage: Math.round(wouldRecommendPercentage),
        ratingDistribution,
    };
});

const toggleVisibility = (id, isPublic) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }
    review.isPublic = isPublic;
    yield review.save();
    return review;
});

const linkOrphanedReviews = () => __awaiter(void 0, void 0, void 0, function* () {
    const reviews = yield sessionReview_model_1.SessionReview.find({});
    let linked = 0;
    let alreadyLinked = 0;
    for (const review of reviews) {
        const session = yield session_model_1.Session.findById(review.sessionId);
        if (session) {
            if (!session.reviewId) {
                yield session_model_1.Session.findByIdAndUpdate(review.sessionId, {
                    reviewId: review._id,
                });
                linked++;
            }
            else {
                alreadyLinked++;
            }
        }
    }
    return { linked, alreadyLinked };
});
const adminCreateReview = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;

    const { User } = yield Promise.resolve().then(() => __importStar(require('../user/user.model')));
    const tutor = yield User.findById(payload.tutorId);
    if (!tutor) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Tutor not found');
    }

    const review = yield sessionReview_model_1.SessionReview.create({
        tutorId: new mongoose_1.Types.ObjectId(payload.tutorId),
        studentId: null,
        sessionId: null,
        overallRating: payload.overallRating,
        teachingQuality: payload.teachingQuality,
        communication: payload.communication,
        punctuality: payload.punctuality,
        preparedness: payload.preparedness,
        comment: payload.comment,
        wouldRecommend: payload.wouldRecommend,
        isPublic: (_a = payload.isPublic) !== null && _a !== void 0 ? _a : true,
        isAdminCreated: true,
        reviewerName: payload.reviewerName,
    });
    return review;
});

const adminUpdateReview = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }

    Object.assign(review, payload);
    review.isEdited = true;
    review.editedAt = new Date();
    yield review.save();
    return review;
});

const adminDeleteReview = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const review = yield sessionReview_model_1.SessionReview.findById(id);
    if (!review) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Review not found');
    }

    if (review.sessionId) {
        yield session_model_1.Session.findByIdAndUpdate(review.sessionId, {
            $unset: { reviewId: 1 },
        });
    }
    yield sessionReview_model_1.SessionReview.findByIdAndDelete(id);
    return review;
});
exports.SessionReviewService = {
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
