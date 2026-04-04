import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { TrialRequestController } from './trialRequest.controller';
import { TrialRequestValidation } from './trialRequest.validation';

const router = express.Router();

router.post(
  '/',
  fileHandler([{ name: 'documents', maxCount: 3 }]),
  validateRequest(TrialRequestValidation.createTrialRequestZodSchema),
  TrialRequestController.createTrialRequest
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(TrialRequestValidation.cancelTrialRequestZodSchema),
  TrialRequestController.cancelTrialRequest
);

router.patch(
  '/:id/extend',
  optionalAuth,
  TrialRequestController.extendTrialRequest
);

router.get(
  '/available',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getAvailableTrialRequests
);

router.get(
  '/my-accepted',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getMyAcceptedTrialRequests
);

router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  validateRequest(TrialRequestValidation.acceptTrialRequestZodSchema),
  TrialRequestController.acceptTrialRequest
);

router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TrialRequestController.getSingleTrialRequest
);

router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.expireOldRequests
);

router.post(
  '/send-reminders',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.sendExpirationReminders
);

router.post(
  '/auto-delete',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.autoDeleteExpiredRequests
);

export const TrialRequestRoutes = router;