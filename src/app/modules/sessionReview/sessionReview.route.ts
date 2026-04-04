import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionReviewController } from './sessionReview.controller';
import { SessionReviewValidation } from './sessionReview.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.createReviewZodSchema),
  SessionReviewController.createReview
);

router.get(
  '/my-reviews',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.getMyReviews
);

router.patch(
  '/:id',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionReviewValidation.updateReviewZodSchema),
  SessionReviewController.updateReview
);

router.delete(
  '/:id',
  auth(USER_ROLES.STUDENT),
  SessionReviewController.deleteReview
);

router.get(
  '/tutor/:tutorId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorReviews
);

router.get(
  '/tutor/:tutorId/stats',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getTutorStats
);

router.get(
  '/session/:sessionId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getReviewBySession
);

router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  SessionReviewController.getSingleReview
);

router.patch(
  '/:id/visibility',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.toggleVisibility
);

router.post(
  '/link-orphaned',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.linkOrphanedReviews
);

router.post(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminCreateReviewZodSchema),
  SessionReviewController.adminCreateReview
);

router.patch(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionReviewValidation.adminUpdateReviewZodSchema),
  SessionReviewController.adminUpdateReview
);

router.delete(
  '/admin/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionReviewController.adminDeleteReview
);

export const SessionReviewRoutes = router;
