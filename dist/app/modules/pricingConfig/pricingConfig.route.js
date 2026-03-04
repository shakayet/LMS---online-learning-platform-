"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfigRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const pricingConfig_controller_1 = require("./pricingConfig.controller");
const pricingConfig_validation_1 = require("./pricingConfig.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/pricing/plans
 * @desc    Get active pricing plans (for homepage)
 * @access  Public
 */
router.get('/plans', pricingConfig_controller_1.PricingConfigController.getActivePricingPlans);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/pricing/config
 * @desc    Get full pricing config
 * @access  Admin only
 */
router.get('/config', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), pricingConfig_controller_1.PricingConfigController.getPricingConfig);
/**
 * @route   PUT /api/v1/pricing/config
 * @desc    Update full pricing config
 * @access  Admin only
 * @body    { plans: IPricingPlan[] }
 */
router.put('/config', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(pricingConfig_validation_1.PricingConfigValidation.updatePricingConfigZodSchema), pricingConfig_controller_1.PricingConfigController.updatePricingConfig);
/**
 * @route   PATCH /api/v1/pricing/plans/:tier
 * @desc    Update single plan
 * @access  Admin only
 * @params  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM'
 */
router.patch('/plans/:tier', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(pricingConfig_validation_1.PricingConfigValidation.updateSinglePlanZodSchema), pricingConfig_controller_1.PricingConfigController.updateSinglePlan);
/**
 * @route   POST /api/v1/pricing/reset
 * @desc    Reset to default pricing
 * @access  Admin only
 */
router.post('/reset', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), pricingConfig_controller_1.PricingConfigController.resetToDefaultPricing);
exports.PricingConfigRoutes = router;
