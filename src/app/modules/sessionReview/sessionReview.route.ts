import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionReviewController } from './sessionReview.controller';
import { SessionReviewValidation } from './sessionReview.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a new review for a completed session
 * @access  Student only
 * @body    { sessionId, overallRating, teachingQuality, communication, punctuality, preparedness, comment?, wouldRecommend, isPublic? }
 */
router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.createReviewZodSchema),
  SessionReviewController.createReview
);

/**
 * @route   GET /api/v1/reviews/my-reviews
 * @desc    Get student's own reviews
 * @access  Student only
 * @query   ?page=1&limit=10&sort=-createdAt
 */
router.get(
  '/my-reviews',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.getMyReviews
);

/**
 * @route   PATCH /api/v1/reviews/:id
 * @desc    Update own review
 * @access  Student only
 * @body    Partial review fields
 */
router.patch(
  '/:id',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.updateReviewZodSchema),
  SessionReviewController.updateReview
);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete own review
 * @access  Student only
 */
router.delete(
  '/:id',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.deleteReview
);

// ============ PUBLIC/TUTOR ROUTES ============

/**
 * @route   GET /api/v1/reviews/tutor/:tutorId
 * @desc    Get tutor's reviews (public only, or all if admin)
 * @access  Public (Students, Tutors, Admins)
 * @query   ?page=1&limit=10&sort=-createdAt
 */
router.get(
  '/tutor/:tutorId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorReviews
);

/**
 * @route   GET /api/v1/reviews/tutor/:tutorId/stats
 * @desc    Get tutor's review statistics
 * @access  Public (Students, Tutors, Admins)
 */
router.get(
  '/tutor/:tutorId/stats',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorStats
);

/**
 * @route   GET /api/v1/reviews/session/:sessionId
 * @desc    Get review for a specific session
 * @access  Student or Tutor (session participants)
 */
router.get(
  '/session/:sessionId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getReviewBySession
);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get single review details
 * @access  Student (own) or Admin
 */
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getSingleReview
);

// ============ ADMIN ROUTES ============

/**
 * @route   PATCH /api/v1/reviews/:id/visibility
 * @desc    Toggle review visibility (hide/show publicly)
 * @access  Admin only
 * @body    { isPublic: boolean }
 */
router.patch(
  '/:id/visibility',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.toggleVisibility
);

/**
 * @route   POST /api/v1/reviews/link-orphaned
 * @desc    Link orphaned reviews to sessions (migration helper)
 * @access  Admin only
 */
router.post(
  '/link-orphaned',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.linkOrphanedReviews
);

/**
 * @route   POST /api/v1/reviews/admin
 * @desc    Admin: Create a review for a tutor (without session requirement)
 * @access  Admin only
 * @body    { tutorId, overallRating, teachingQuality, communication, punctuality, preparedness, comment?, wouldRecommend, isPublic?, reviewerName? }
 */
router.post(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminCreateReviewZodSchema),
  SessionReviewController.adminCreateReview
);

/**
 * @route   PATCH /api/v1/reviews/admin/:id
 * @desc    Admin: Update any review
 * @access  Admin only
 * @body    Partial review fields
 */
router.patch(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminUpdateReviewZodSchema),
  SessionReviewController.adminUpdateReview
);

/**
 * @route   DELETE /api/v1/reviews/admin/:id
 * @desc    Admin: Delete any review
 * @access  Admin only
 */
router.delete(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.adminDeleteReview
);

export const SessionReviewRoutes = router;
