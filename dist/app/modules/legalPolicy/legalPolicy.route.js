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
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/legal-policies/public
 * @desc    Get all active policies (for public display)
 * @access  Public
 */
router.get('/public', legalPolicy_controller_1.LegalPolicyController.getAllActivePolicies);
/**
 * @route   GET /api/v1/legal-policies/public/:type
 * @desc    Get active policy by type (for public display)
 * @access  Public
 * @params  type: PRIVACY_POLICY | TERMS_FOR_STUDENTS | TERMS_FOR_TUTORS | CANCELLATION_POLICY | LEGAL_NOTICE | COOKIE_POLICY
 */
router.get('/public/:type', (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.getActivePolicyByType);
// ============ ADMIN ONLY ROUTES ============
/**
 * @route   GET /api/v1/legal-policies
 * @desc    Get all policies (admin)
 * @access  Admin only
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), legalPolicy_controller_1.LegalPolicyController.getAllPolicies);
/**
 * @route   GET /api/v1/legal-policies/:type
 * @desc    Get policy by type (admin)
 * @access  Admin only
 */
router.get('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.getPolicyByType);
/**
 * @route   PUT /api/v1/legal-policies/:type
 * @desc    Create or update policy (upsert)
 * @access  Admin only
 * @body    { title?, content, isActive? }
 */
router.put('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.upsertPolicyZodSchema), legalPolicy_controller_1.LegalPolicyController.upsertPolicy);
/**
 * @route   PATCH /api/v1/legal-policies/:type
 * @desc    Update policy
 * @access  Admin only
 * @body    { title?, content?, isActive? }
 */
router.patch('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.updatePolicyZodSchema), legalPolicy_controller_1.LegalPolicyController.updatePolicy);
/**
 * @route   DELETE /api/v1/legal-policies/:type
 * @desc    Delete policy (soft delete)
 * @access  Admin only
 */
router.delete('/:type', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(legalPolicy_validation_1.LegalPolicyValidation.policyTypeParamSchema), legalPolicy_controller_1.LegalPolicyController.deletePolicy);
/**
 * @route   POST /api/v1/legal-policies/initialize
 * @desc    Initialize default policies
 * @access  Admin only
 */
router.post('/initialize', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), legalPolicy_controller_1.LegalPolicyController.initializeDefaultPolicies);
exports.LegalPolicyRoutes = router;
