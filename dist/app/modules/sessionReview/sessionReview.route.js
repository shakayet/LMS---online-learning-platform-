"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionReviewRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const sessionReview_controller_1 = require("./sessionReview.controller");
const sessionReview_validation_1 = require("./sessionReview.validation");
const router = express_1.default.Router();
// ============ STUDENT ROUTES ============
/**
 * @route   POST /api/v1/reviews
 * @desc    Create a new review for a completed session
 * @access  Student only
 * @body    { sessionId, overallRating, teachingQuality, communication, punctuality, preparedness, comment?, wouldRecommend, isPublic? }
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.createReviewZodSchema), sessionReview_controller_1.SessionReviewController.createReview);
/**
 * @route   GET /api/v1/reviews/my-reviews
 * @desc    Get student's own reviews
 * @access  Student only
 * @query   ?page=1&limit=10&sort=-createdAt
 */
router.get('/my-reviews', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.getMyReviews);
/**
 * @route   PATCH /api/v1/reviews/:id
 * @desc    Update own review
 * @access  Student only
 * @body    Partial review fields
 */
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.updateReviewZodSchema), sessionReview_controller_1.SessionReviewController.updateReview);
/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete own review
 * @access  Student only
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.deleteReview);
// ============ PUBLIC/TUTOR ROUTES ============
/**
 * @route   GET /api/v1/reviews/tutor/:tutorId
 * @desc    Get tutor's reviews (public only, or all if admin)
 * @access  Public (Students, Tutors, Admins)
 * @query   ?page=1&limit=10&sort=-createdAt
 */
router.get('/tutor/:tutorId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorReviews);
/**
 * @route   GET /api/v1/reviews/tutor/:tutorId/stats
 * @desc    Get tutor's review statistics
 * @access  Public (Students, Tutors, Admins)
 */
router.get('/tutor/:tutorId/stats', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorStats);
/**
 * @route   GET /api/v1/reviews/session/:sessionId
 * @desc    Get review for a specific session
 * @access  Student or Tutor (session participants)
 */
router.get('/session/:sessionId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getReviewBySession);
/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get single review details
 * @access  Student (own) or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getSingleReview);
// ============ ADMIN ROUTES ============
/**
 * @route   PATCH /api/v1/reviews/:id/visibility
 * @desc    Toggle review visibility (hide/show publicly)
 * @access  Admin only
 * @body    { isPublic: boolean }
 */
router.patch('/:id/visibility', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.toggleVisibility);
/**
 * @route   POST /api/v1/reviews/link-orphaned
 * @desc    Link orphaned reviews to sessions (migration helper)
 * @access  Admin only
 */
router.post('/link-orphaned', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.linkOrphanedReviews);
/**
 * @route   POST /api/v1/reviews/admin
 * @desc    Admin: Create a review for a tutor (without session requirement)
 * @access  Admin only
 * @body    { tutorId, overallRating, teachingQuality, communication, punctuality, preparedness, comment?, wouldRecommend, isPublic?, reviewerName? }
 */
router.post('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminCreateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminCreateReview);
/**
 * @route   PATCH /api/v1/reviews/admin/:id
 * @desc    Admin: Update any review
 * @access  Admin only
 * @body    Partial review fields
 */
router.patch('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminUpdateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminUpdateReview);
/**
 * @route   DELETE /api/v1/reviews/admin/:id
 * @desc    Admin: Delete any review
 * @access  Admin only
 */
router.delete('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.adminDeleteReview);
exports.SessionReviewRoutes = router;
