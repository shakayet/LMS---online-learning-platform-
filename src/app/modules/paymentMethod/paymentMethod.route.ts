import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentMethodController } from './paymentMethod.controller';
import { PaymentMethodValidation } from './paymentMethod.validation';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.getPaymentMethods
);

router.post(
  '/setup-intent',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.createSetupIntent
);

router.post(
  '/attach',
  auth(USER_ROLES.STUDENT),
  validateRequest(PaymentMethodValidation.attachPaymentMethodZodSchema),
  PaymentMethodController.attachPaymentMethod
);

router.patch(
  '/:paymentMethodId/default',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.setDefaultPaymentMethod
);

router.delete(
  '/:paymentMethodId',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.deletePaymentMethod
);

export const PaymentMethodRoutes = router;