import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentMethodController } from './paymentMethod.controller';
import { PaymentMethodValidation } from './paymentMethod.validation';

const router = express.Router();

/**
 * @route   GET /api/v1/payment-methods
 * @desc    Get all saved payment methods
 * @access  Student only
 */
router.get(
  '/',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.getPaymentMethods
);

/**
 * @route   POST /api/v1/payment-methods/setup-intent
 * @desc    Create SetupIntent for adding new payment method
 * @access  Student only
 * @returns { clientSecret }
 */
router.post(
  '/setup-intent',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.createSetupIntent
);

/**
 * @route   POST /api/v1/payment-methods/attach
 * @desc    Attach payment method after successful setup
 * @access  Student only
 * @body    { paymentMethodId, setAsDefault? }
 */
router.post(
  '/attach',
  auth(USER_ROLES.STUDENT),
  validateRequest(PaymentMethodValidation.attachPaymentMethodZodSchema),
  PaymentMethodController.attachPaymentMethod
);

/**
 * @route   PATCH /api/v1/payment-methods/:paymentMethodId/default
 * @desc    Set a payment method as default
 * @access  Student only
 */
router.patch(
  '/:paymentMethodId/default',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.setDefaultPaymentMethod
);

/**
 * @route   DELETE /api/v1/payment-methods/:paymentMethodId
 * @desc    Delete a payment method
 * @access  Student only
 */
router.delete(
  '/:paymentMethodId',
  auth(USER_ROLES.STUDENT),
  PaymentMethodController.deletePaymentMethod
);

export const PaymentMethodRoutes = router;