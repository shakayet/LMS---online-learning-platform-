import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SchoolTypeController } from './schoolType.controller';
import { SchoolTypeValidation } from './schoolType.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/school-types/active
 * @desc    Get all active school types (for students/tutors to see available school types)
 * @access  Public
 */
router.get('/active', SchoolTypeController.getActiveSchoolTypes);

/**
 * @route   GET /api/v1/school-types/:schoolTypeId
 * @desc    Get single school type by ID
 * @access  Public
 */
router.get('/:schoolTypeId', SchoolTypeController.getSingleSchoolType);

/**
 * @route   GET /api/v1/school-types
 * @desc    Get all school types with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=gymnasium&isActive=true
 */
router.get('/', SchoolTypeController.getAllSchoolTypes);

// ============ ADMIN ONLY ROUTES ============

/**
 * @route   POST /api/v1/school-types
 * @desc    Create new school type
 * @access  Admin only
 * @body    { name: "Gymnasium", value: "GYMNASIUM", order: 4, isActive?: true }
 */
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.createSchoolTypeZodSchema),
  SchoolTypeController.createSchoolType
);

/**
 * @route   PATCH /api/v1/school-types/:schoolTypeId
 * @desc    Update school type
 * @access  Admin only
 * @body    { name?, value?, order?, isActive? }
 */
router.patch(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SchoolTypeValidation.updateSchoolTypeZodSchema),
  SchoolTypeController.updateSchoolType
);

/**
 * @route   DELETE /api/v1/school-types/:schoolTypeId
 * @desc    Delete school type (soft delete - sets isActive to false)
 * @access  Admin only
 */
router.delete(
  '/:schoolTypeId',
  auth(USER_ROLES.SUPER_ADMIN),
  SchoolTypeController.deleteSchoolType
);

export const SchoolTypeRoutes = router;
