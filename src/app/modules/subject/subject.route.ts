import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SubjectController } from './subject.controller';
import { SubjectValidation } from './subject.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/subjects/active
 * @desc    Get all active subjects (for students/tutors to see available subjects)
 * @access  Public
 */
router.get('/active', SubjectController.getActiveSubjects);

/**
 * @route   GET /api/v1/subjects/:subjectId
 * @desc    Get single subject by ID
 * @access  Public
 */
router.get('/:subjectId', SubjectController.getSingleSubject);

/**
 * @route   GET /api/v1/subjects
 * @desc    Get all subjects with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=math&isActive=true
 */
router.get('/', SubjectController.getAllSubjects);

// ============ ADMIN ONLY ROUTES ============

/**
 * @route   POST /api/v1/subjects
 * @desc    Create new subject
 * @access  Admin only
 * @body    { name: "Mathematics", isActive?: true }
 */
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.createSubjectZodSchema),
  SubjectController.createSubject
);

/**
 * @route   PATCH /api/v1/subjects/:subjectId
 * @desc    Update subject
 * @access  Admin only
 * @body    { name?, isActive? }
 */
router.patch(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SubjectValidation.updateSubjectZodSchema),
  SubjectController.updateSubject
);

/**
 * @route   DELETE /api/v1/subjects/:subjectId
 * @desc    Permanently delete subject (hard delete). Blocked if active requests exist.
 * @access  Admin only
 */
router.delete(
  '/:subjectId',
  auth(USER_ROLES.SUPER_ADMIN),
  SubjectController.deleteSubject
);

export const SubjectRoutes = router;
