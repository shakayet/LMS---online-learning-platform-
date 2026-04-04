import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { StudentSubscriptionController } from './studentSubscription.controller';
import { StudentSubscriptionValidation } from './studentSubscription.validation';

const router = express.Router();

router.post(
  '/subscribe',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.subscribeToPlanZodSchema),
  StudentSubscriptionController.subscribeToPlan
);

router.get(
  '/my-subscription',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getMySubscription
);

router.get(
  '/my-plan-usage',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getMyPlanUsage
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.cancelSubscriptionZodSchema),
  StudentSubscriptionController.cancelSubscription
);

router.post(
  '/create-payment-intent',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.subscribeToPlanZodSchema),
  StudentSubscriptionController.createPaymentIntent
);

router.post(
  '/confirm-payment',
  auth(USER_ROLES.STUDENT),
  validateRequest(StudentSubscriptionValidation.confirmPaymentZodSchema),
  StudentSubscriptionController.confirmPayment
);

router.get(
  '/payment-history',
  auth(USER_ROLES.STUDENT),
  StudentSubscriptionController.getPaymentHistory
);

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getAllSubscriptions
);

router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.getSingleSubscription
);

router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  StudentSubscriptionController.expireOldSubscriptions
);

export const StudentSubscriptionRoutes = router;
