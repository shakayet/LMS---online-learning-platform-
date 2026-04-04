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

router.get('/plans', pricingConfig_controller_1.PricingConfigController.getActivePricingPlans);

router.get('/config', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), pricingConfig_controller_1.PricingConfigController.getPricingConfig);

router.put('/config', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(pricingConfig_validation_1.PricingConfigValidation.updatePricingConfigZodSchema), pricingConfig_controller_1.PricingConfigController.updatePricingConfig);

router.patch('/plans/:tier', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(pricingConfig_validation_1.PricingConfigValidation.updateSinglePlanZodSchema), pricingConfig_controller_1.PricingConfigController.updateSinglePlan);

router.post('/reset', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), pricingConfig_controller_1.PricingConfigController.resetToDefaultPricing);
exports.PricingConfigRoutes = router;
