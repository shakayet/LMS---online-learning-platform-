"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalPolicyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const legalPolicy_controller_1 = require("./legalPolicy.controller");
const legalPolicy_validation_1 = require("./legalPolicy.validation");
const router = express_1.default.Router();

router.get('/public', legalPolicy_controller_1.LegalPolicyController.getAllActivePolicies);

router.get('/public/:type', (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.getActivePolicyByType);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), legalPolicy_controller_1.LegalPolicyController.getAllPolicies);

router.get('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.getPolicyByType);

router.put('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.upsertPolicyZodSchema), legalPolicy_controller_1.LegalPolicyController.upsertPolicy);

router.patch('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.updatePolicyZodSchema), legalPolicy_controller_1.LegalPolicyController.updatePolicy);

router.delete('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.deletePolicy);

router.post('/initialize', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), legalPolicy_controller_1.LegalPolicyController.initializeDefaultPolicies);
exports.LegalPolicyRoutes = router;
