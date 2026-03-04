import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { SessionRequestController } from './sessionRequest.controller';
import { SessionRequestValidation } from './sessionRequest.validation';

const router = express.Router();

// Student routes
router.post(
  '/',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionRequestValidation.createSessionRequestZodSchema),
  SessionRequestController.createSessionRequest
);

router.get(
  '/my-requests',
  auth(USER_ROLES.STUDENT),
  SessionRequestController.getMySessionRequests
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionRequestValidation.cancelSessionRequestZodSchema),
  SessionRequestController.cancelSessionRequest
);

router.patch(
  '/:id/extend',
  auth(USER_ROLES.STUDENT),
  SessionRequestController.extendSessionRequest
);

// Tutor routes
router.get(
  '/matching',
  auth(USER_ROLES.TUTOR),
  SessionRequestController.getMatchingSessionRequests
);

router.get(
  '/my-accepted',
  auth(USER_ROLES.TUTOR),
  SessionRequestController.getMyAcceptedRequests
);

router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  validateRequest(SessionRequestValidation.acceptSessionRequestZodSchema),
  SessionRequestController.acceptSessionRequest
);

// Admin routes
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.getAllSessionRequests
);

router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.expireOldRequests
);

router.post(
  '/send-reminders',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.sendExpirationReminders
);

router.post(
  '/auto-delete',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionRequestController.autoDeleteExpiredRequests
);

// Shared routes (authenticated users)
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionRequestController.getSingleSessionRequest
);

export const SessionRequestRoutes = router;
