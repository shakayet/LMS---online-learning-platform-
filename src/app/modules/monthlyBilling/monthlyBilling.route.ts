import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MonthlyBillingController } from './monthlyBilling.controller';
import { MonthlyBillingValidation } from './monthlyBilling.validation';

const router = express.Router();

router.get(
  '/my-billings',
  auth(USER_ROLES.STUDENT),
  MonthlyBillingController.getMyBillings
);

router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getSingleBilling
);

router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(MonthlyBillingValidation.generateMonthlyBillingZodSchema),
  MonthlyBillingController.generateMonthlyBillings
);

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getAllBillings
);

router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsPaid
);

router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsFailed
);

export const MonthlyBillingRoutes = router;
