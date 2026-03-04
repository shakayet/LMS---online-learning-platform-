import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import optionalAuth from '../../middlewares/optionalAuth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { TrialRequestController } from './trialRequest.controller';
import { TrialRequestValidation } from './trialRequest.validation';

const router = express.Router();

// ============ PUBLIC / GUEST ROUTES ============

/**
 * @route   POST /api/v1/trial-requests
 * @desc    Create trial request (Uber-style request)
 * @access  Public (Guest or Student)
 * @body    {
 *   studentInfo: { firstName, lastName, email, isUnder18, dateOfBirth? },
 *   subject: ObjectId (Subject ID),
 *   gradeLevel: GRADE_LEVEL enum,
 *   schoolType: SCHOOL_TYPE enum,
 *   description: string,
 *   preferredLanguage: 'ENGLISH' | 'GERMAN',
 *   learningGoals?: string,
 *   documents?: string[],
 *   guardianInfo?: { name, email, phone, relationship? } (Required if under 18),
 *   preferredDateTime?: Date
 * }
 * @note    Guest users can create requests without authentication
 * @note    Student can only have one pending request at a time (checked by studentId or email)
 * @note    Request expires after 24 hours
 * @note    Guardian info required for students under 18
 */
router.post(
  '/',
  fileHandler([{ name: 'documents', maxCount: 3 }]),
  validateRequest(TrialRequestValidation.createTrialRequestZodSchema),
  TrialRequestController.createTrialRequest
);

// ============ STUDENT ROUTES ============

// NOTE: GET /my-requests removed - use /session-requests/my-requests instead (unified view)

/**
 * @route   PATCH /api/v1/trial-requests/:id/cancel
 * @desc    Cancel trial request
 * @access  Student only (must own the request)
 * @body    { cancellationReason: string }
 * @note    Only PENDING requests can be cancelled
 */
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT),
  validateRequest(TrialRequestValidation.cancelTrialRequestZodSchema),
  TrialRequestController.cancelTrialRequest
);

/**
 * @route   PATCH /api/v1/trial-requests/:id/extend
 * @desc    Extend trial request by 7 more days
 * @access  Student (logged-in) or Guest (via email in body)
 * @body    { email?: string } (Required for guest users)
 * @note    Only PENDING requests can be extended
 * @note    Max 1 extension allowed
 */
router.patch(
  '/:id/extend',
  optionalAuth,
  TrialRequestController.extendTrialRequest
);

// ============ TUTOR ROUTES ============

/**
 * @route   GET /api/v1/trial-requests/available
 * @desc    Get available trial requests matching tutor's subjects
 * @access  Tutor only (verified tutors only)
 * @query   ?page=1&limit=10&sort=-createdAt
 * @returns Pending requests matching tutor's subjects with student info
 * @note    Returns: subject, schoolType, gradeLevel, studentAge, studentName, learningGoal, documents
 */
router.get(
  '/available',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getAvailableTrialRequests
);

/**
 * @route   GET /api/v1/trial-requests/my-accepted
 * @desc    Get trial requests the tutor has accepted
 * @access  Tutor only
 * @query   ?page=1&limit=10&sort=-acceptedAt
 * @returns Accepted requests with student details and chat info
 */
router.get(
  '/my-accepted',
  auth(USER_ROLES.TUTOR),
  TrialRequestController.getMyAcceptedTrialRequests
);

/**
 * @route   PATCH /api/v1/trial-requests/:id/accept
 * @desc    Accept trial request (Uber-style accept)
 * @access  Tutor only (verified tutors only)
 * @body    { introductoryMessage?: string } (optional, min 10 chars, max 500 chars)
 * @note    Creates chat between student and tutor
 * @note    Sends introductory message to chat if provided
 * @note    Changes request status to ACCEPTED
 * @note    Tutor must teach the requested subject
 * @note    Sends notification to student
 */
router.patch(
  '/:id/accept',
  auth(USER_ROLES.TUTOR),
  validateRequest(TrialRequestValidation.acceptTrialRequestZodSchema),
  TrialRequestController.acceptTrialRequest
);

// ============ SHARED ROUTES ============

/**
 * @route   GET /api/v1/trial-requests/:id
 * @desc    Get single trial request details
 * @access  Student (own requests), Tutor (matching requests), Admin (all)
 */
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TrialRequestController.getSingleTrialRequest
);

// ============ ADMIN ROUTES ============

// NOTE: GET / (all trial requests) removed - use /session-requests instead (unified view)

/**
 * @route   POST /api/v1/trial-requests/expire-old
 * @desc    Expire old trial requests (Cron job endpoint)
 * @access  Admin only
 * @note    Updates PENDING requests past finalExpiresAt to EXPIRED
 */
router.post(
  '/expire-old',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.expireOldRequests
);

/**
 * @route   POST /api/v1/trial-requests/send-reminders
 * @desc    Send expiration reminder emails (Cron job endpoint)
 * @access  Admin only
 * @note    Sends email to students whose requests expired (7 days)
 * @note    Sets finalExpiresAt to 3 days from now
 * @note    Should be called daily
 */
router.post(
  '/send-reminders',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.sendExpirationReminders
);

/**
 * @route   POST /api/v1/trial-requests/auto-delete
 * @desc    Auto-delete expired requests (Cron job endpoint)
 * @access  Admin only
 * @note    Deletes requests where finalExpiresAt has passed (no response after reminder)
 * @note    Should be called daily
 */
router.post(
  '/auto-delete',
  auth(USER_ROLES.SUPER_ADMIN),
  TrialRequestController.autoDeleteExpiredRequests
);

export const TrialRequestRoutes = router;