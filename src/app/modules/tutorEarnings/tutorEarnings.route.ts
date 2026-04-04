import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorEarningsController } from './tutorEarnings.controller';
import { TutorEarningsValidation } from './tutorEarnings.validation';

const router = express.Router();

router.get(
  '/my-stats',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyStats
);

router.get(
  '/my-earnings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyEarnings
);

router.get(
  '/history',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getEarningsHistory
);

router.get(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getPayoutSettings
);

router.patch(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  validateRequest(TutorEarningsValidation.updatePayoutSettingsZodSchema),
  TutorEarningsController.updatePayoutSettings
);

router.get(
  '/:id',
  auth(USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getSingleEarning
);

router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.generateTutorEarningsZodSchema),
  TutorEarningsController.generateTutorEarnings
);

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getAllEarnings
);

router.patch(
  '/:id/initiate-payout',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.initiatePayoutZodSchema),
  TutorEarningsController.initiatePayout
);

router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.markAsPaid
);

router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.markAsFailedZodSchema),
  TutorEarningsController.markAsFailed
);

export const TutorEarningsRoutes = router;
