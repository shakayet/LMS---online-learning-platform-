import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SchoolTypeController } from './schoolType.controller';
import { SchoolTypeValidation } from './schoolType.validation';

const router = express.Router();

router.get('/active', SchoolTypeController.getActiveSchoolTypes);

router.get('/:schoolTypeId', SchoolTypeController.getSingleSchoolType);

router.get('/', SchoolTypeController.getAllSchoolTypes);

router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.createSchoolTypeZodSchema),
  SchoolTypeController.createSchoolType
);

router.patch(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.updateSchoolTypeZodSchema),
  SchoolTypeController.updateSchoolType
);

router.delete(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  SchoolTypeController.deleteSchoolType
);

export const SchoolTypeRoutes = router;
