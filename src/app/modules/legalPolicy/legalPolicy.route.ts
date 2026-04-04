import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { LegalPolicyController } from './legalPolicy.controller';
import { LegalPolicyValidation } from './legalPolicy.validation';

const router = express.Router();

router.get('/public', LegalPolicyController.getAllActivePolicies);

router.get(
  '/public/:type',
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getActivePolicyByType
);

router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.getAllPolicies
);

router.get(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.getPolicyByType
);

router.put(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.upsertPolicyZodSchema),
  LegalPolicyController.upsertPolicy
);

router.patch(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  validateRequest(LegalPolicyValidation.updatePolicyZodSchema),
  LegalPolicyController.updatePolicy
);

router.delete(
  '/:type',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(LegalPolicyValidation.policyTypeParamSchema),
  LegalPolicyController.deletePolicy
);

router.post(
  '/initialize',
  auth(USER_ROLES.SUPER_ADMIN),
  LegalPolicyController.initializeDefaultPolicies
);

export const LegalPolicyRoutes = router;
