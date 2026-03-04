import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PricingConfigController } from './pricingConfig.controller';
import { PricingConfigValidation } from './pricingConfig.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/pricing/plans
 * @desc    Get active pricing plans (for homepage)
 * @access  Public
 */
router.get('/plans', PricingConfigController.getActivePricingPlans);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/pricing/config
 * @desc    Get full pricing config
 * @access  Admin only
 */
router.get(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.getPricingConfig
);

/**
 * @route   PUT /api/v1/pricing/config
 * @desc    Update full pricing config
 * @access  Admin only
 * @body    { plans: IPricingPlan[] }
 */
router.put(
  '/config',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updatePricingConfigZodSchema),
  PricingConfigController.updatePricingConfig
);

/**
 * @route   PATCH /api/v1/pricing/plans/:tier
 * @desc    Update single plan
 * @access  Admin only
 * @params  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM'
 */
router.patch(
  '/plans/:tier',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(PricingConfigValidation.updateSinglePlanZodSchema),
  PricingConfigController.updateSinglePlan
);

/**
 * @route   POST /api/v1/pricing/reset
 * @desc    Reset to default pricing
 * @access  Admin only
 */
router.post(
  '/reset',
  auth(USER_ROLES.SUPER_ADMIN),
  PricingConfigController.resetToDefaultPricing
);

export const PricingConfigRoutes = router;
