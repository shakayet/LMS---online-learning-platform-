import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { GradeController } from './grade.controller';
import { GradeValidation } from './grade.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/grades/active
 * @desc    Get all active grades (for students/tutors to see available grades)
 * @access  Public
 */
router.get('/active', GradeController.getActiveGrades);

/**
 * @route   GET /api/v1/grades/:gradeId
 * @desc    Get single grade by ID
 * @access  Public
 */
router.get('/:gradeId', GradeController.getSingleGrade);

/**
 * @route   GET /api/v1/grades
 * @desc    Get all grades with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=grade&isActive=true
 */
router.get('/', GradeController.getAllGrades);

// ============ ADMIN ONLY ROUTES ============

/**
 * @route   POST /api/v1/grades
 * @desc    Create new grade
 * @access  Admin only
 * @body    { name: "Grade 1", value: "1", order: 1, isActive?: true }
 */
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.createGradeZodSchema),
  GradeController.createGrade
);

/**
 * @route   PATCH /api/v1/grades/:gradeId
 * @desc    Update grade
 * @access  Admin only
 * @body    { name?, value?, order?, isActive? }
 */
router.patch(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(GradeValidation.updateGradeZodSchema),
  GradeController.updateGrade
);

/**
 * @route   DELETE /api/v1/grades/:gradeId
 * @desc    Delete grade (soft delete - sets isActive to false)
 * @access  Admin only
 */
router.delete(
  '/:gradeId',
  auth(USER_ROLES.SUPER_ADMIN),
  GradeController.deleteGrade
);

export const GradeRoutes = router;
