import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { fileHandler } from '../../middlewares/fileHandler';
import validateRequest from '../../middlewares/validateRequest';
import { TutorApplicationController } from './tutorApplication.controller';
import { TutorApplicationValidation } from './tutorApplication.validation';

const router = express.Router();

/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application (PUBLIC - creates user + application)
 * @access  Public (no auth required)
 * @body    FormData with:
 *   - data: JSON string { email, password, name, birthDate, phoneNumber, street, houseNumber, zip, city, subjects[] }
 *   - cv: File (PDF/Image)
 *   - abiturCertificate: File (PDF/Image)
 *   - officialId: File (PDF/Image)
 * @note    First-time registration for tutors
 */
router.post(
  '/',
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.createApplicationZodSchema),
  TutorApplicationController.submitApplication
);

/**
 * @route   GET /api/v1/applications/my-application
 * @desc    Get my application status
 * @access  Applicant only
 */
router.get(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  TutorApplicationController.getMyApplication
);

/**
 * @route   PATCH /api/v1/applications/my-application
 * @desc    Update my application (when in REVISION status)
 * @access  Applicant only
 * @body    { cv?: string, abiturCertificate?: string, officialId?: string }
 * @note    Applicant can update documents and resubmit when revision is requested
 */
router.patch(
  '/my-application',
  auth(USER_ROLES.APPLICANT),
  fileHandler([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
  ]),
  validateRequest(TutorApplicationValidation.updateMyApplicationZodSchema),
  TutorApplicationController.updateMyApplication
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/applications
 * @desc    Get all applications with filtering, searching, pagination
 * @access  Admin only
 * @query   ?page=1&limit=10&searchTerm=john&status=SUBMITTED
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getAllApplications
);

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application by ID
 * @access  Admin only
 */
router.get(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.getSingleApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/select-for-interview
 * @desc    Select application for interview (after initial review)
 * @access  Admin only
 * @body    { adminNotes?: string }
 */
router.patch(
  '/:id/select-for-interview',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.selectForInterviewZodSchema),
  TutorApplicationController.selectForInterview
);

/**
 * @route   PATCH /api/v1/applications/:id/approve
 * @desc    Approve application after interview (changes user role to TUTOR)
 * @access  Admin only
 * @body    { adminNotes?: string }
 * @note    Application must be SELECTED_FOR_INTERVIEW status first
 */
router.patch(
  '/:id/approve',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.approveApplicationZodSchema),
  TutorApplicationController.approveApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject application
 * @access  Admin only
 * @body    { rejectionReason: string }
 */
router.patch(
  '/:id/reject',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.rejectApplicationZodSchema),
  TutorApplicationController.rejectApplication
);

/**
 * @route   PATCH /api/v1/applications/:id/revision
 * @desc    Send application for revision (ask applicant to fix something)
 * @access  Admin only
 * @body    { revisionNote: string }
 */
router.patch(
  '/:id/revision',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorApplicationValidation.sendForRevisionZodSchema),
  TutorApplicationController.sendForRevision
);

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete application (hard delete)
 * @access  Admin only
 */
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorApplicationController.deleteApplication
);

export const TutorApplicationRoutes = router;
