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

router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.createReviewZodSchema), sessionReview_controller_1.SessionReviewController.createReview);

router.get('/my-reviews', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.getMyReviews);

router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.updateReviewZodSchema), sessionReview_controller_1.SessionReviewController.updateReview);

router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionReview_controller_1.SessionReviewController.deleteReview);

router.get('/tutor/:tutorId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorReviews);

router.get('/tutor/:tutorId/stats', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getTutorStats);

router.get('/session/:sessionId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getReviewBySession);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.getSingleReview);

router.patch('/:id/visibility', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.toggleVisibility);

router.post('/link-orphaned', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.linkOrphanedReviews);

router.post('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminCreateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminCreateReview);

router.patch('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(sessionReview_validation_1.SessionReviewValidation.adminUpdateReviewZodSchema), sessionReview_controller_1.SessionReviewController.adminUpdateReview);

router.delete('/admin/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionReview_controller_1.SessionReviewController.adminDeleteReview);
exports.SessionReviewRoutes = router;
