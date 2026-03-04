import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { LegalPolicyController } from './legalPolicy.controller';
import { LegalPolicyValidation } from './legalPolicy.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/legal-policies/public
 * @desc    Get all active policies (for public display)
 * @access  Public
 */
router.get('/public', LegalPolicyController.getAllActivePolicies);

/**
 * @route   GET /api/v1/legal-policies/public/:type
 * @desc    Get active policy by type (for public display)
 * @access  Public
 * @params  type: PRIVACY_POLICY | TERMS_FOR_STUDENTS | TERMS_FOR_TUTORS | CANCELLATION_POLICY | LEGAL_NOTICE | COOKIE_POLICY
 */
router.get(
  '/public/:type',
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getActivePolicyByType
);

// ============ ADMIN ONLY ROUTES ============

/**
 * @route   GET /api/v1/legal-policies
 * @desc    Get all policies (admin)
 * @access  Admin only
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.getAllPolicies
);

/**
 * @route   GET /api/v1/legal-policies/:type
 * @desc    Get policy by type (admin)
 * @access  Admin only
 */
router.get(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getPolicyByType
);

/**
 * @route   PUT /api/v1/legal-policies/:type
 * @desc    Create or update policy (upsert)
 * @access  Admin only
 * @body    { title?, content, isActive? }
 */
router.put(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.upsertPolicyZodSchema),
  LegalPolicyController.upsertPolicy
);

/**
 * @route   PATCH /api/v1/legal-policies/:type
 * @desc    Update policy
 * @access  Admin only
 * @body    { title?, content?, isActive? }
 */
router.patch(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.updatePolicyZodSchema),
  LegalPolicyController.updatePolicy
);

/**
 * @route   DELETE /api/v1/legal-policies/:type
 * @desc    Delete policy (soft delete)
 * @access  Admin only
 */
router.delete(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.deletePolicy
);

/**
 * @route   POST /api/v1/legal-policies/initialize
 * @desc    Initialize default policies
 * @access  Admin only
 */
router.post(
  '/initialize',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.initializeDefaultPolicies
);

export const LegalPolicyRoutes = router;
