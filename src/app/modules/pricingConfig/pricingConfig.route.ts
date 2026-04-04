import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PricingConfigController } from './pricingConfig.controller';
import { PricingConfigValidation } from './pricingConfig.validation';

const router = express.Router();

router.get('/plans', PricingConfigController.getActivePricingPlans);

router.get(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.getPricingConfig
);

router.put(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updatePricingConfigZodSchema),
  PricingConfigController.updatePricingConfig
);

router.patch(
  '/plans/:tier',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updateSinglePlanZodSchema),
  PricingConfigController.updateSinglePlan
);

router.post(
  '/reset',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.resetToDefaultPricing
);

export const PricingConfigRoutes = router;
