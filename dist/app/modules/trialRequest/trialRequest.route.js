"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequestRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const optionalAuth_1 = __importDefault(require("../../middlewares/optionalAuth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const trialRequest_controller_1 = require("./trialRequest.controller");
const trialRequest_validation_1 = require("./trialRequest.validation");
const router = express_1.default.Router();
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
router.post('/', (0, fileHandler_1.fileHandler)([{ name: 'documents', maxCount: 3 }]), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.createTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.createTrialRequest);
// ============ STUDENT ROUTES ============
// NOTE: GET /my-requests removed - use /session-requests/my-requests instead (unified view)
/**
 * @route   PATCH /api/v1/trial-requests/:id/cancel
 * @desc    Cancel trial request
 * @access  Student only (must own the request)
 * @body    { cancellationReason: string }
 * @note    Only PENDING requests can be cancelled
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.cancelTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.cancelTrialRequest);
/**
 * @route   PATCH /api/v1/trial-requests/:id/extend
 * @desc    Extend trial request by 7 more days
 * @access  Student (logged-in) or Guest (via email in body)
 * @body    { email?: string } (Required for guest users)
 * @note    Only PENDING requests can be extended
 * @note    Max 1 extension allowed
 */
router.patch('/:id/extend', optionalAuth_1.default, trialRequest_controller_1.TrialRequestController.extendTrialRequest);
// ============ TUTOR ROUTES ============
/**
 * @route   GET /api/v1/trial-requests/available
 * @desc    Get available trial requests matching tutor's subjects
 * @access  Tutor only (verified tutors only)
 * @query   ?page=1&limit=10&sort=-createdAt
 * @returns Pending requests matching tutor's subjects with student info
 * @note    Returns: subject, schoolType, gradeLevel, studentAge, studentName, learningGoal, documents
 */
router.get('/available', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.getAvailableTrialRequests);
/**
 * @route   GET /api/v1/trial-requests/my-accepted
 * @desc    Get trial requests the tutor has accepted
 * @access  Tutor only
 * @query   ?page=1&limit=10&sort=-acceptedAt
 * @returns Accepted requests with student details and chat info
 */
router.get('/my-accepted', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), trialRequest_controller_1.TrialRequestController.getMyAcceptedTrialRequests);
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
router.patch('/:id/accept', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(trialRequest_validation_1.TrialRequestValidation.acceptTrialRequestZodSchema), trialRequest_controller_1.TrialRequestController.acceptTrialRequest);
// ============ SHARED ROUTES ============
/**
 * @route   GET /api/v1/trial-requests/:id
 * @desc    Get single trial request details
 * @access  Student (own requests), Tutor (matching requests), Admin (all)
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.getSingleTrialRequest);
// ============ ADMIN ROUTES ============
// NOTE: GET / (all trial requests) removed - use /session-requests instead (unified view)
/**
 * @route   POST /api/v1/trial-requests/expire-old
 * @desc    Expire old trial requests (Cron job endpoint)
 * @access  Admin only
 * @note    Updates PENDING requests past finalExpiresAt to EXPIRED
 */
router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.expireOldRequests);
/**
 * @route   POST /api/v1/trial-requests/send-reminders
 * @desc    Send expiration reminder emails (Cron job endpoint)
 * @access  Admin only
 * @note    Sends email to students whose requests expired (7 days)
 * @note    Sets finalExpiresAt to 3 days from now
 * @note    Should be called daily
 */
router.post('/send-reminders', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.sendExpirationReminders);
/**
 * @route   POST /api/v1/trial-requests/auto-delete
 * @desc    Auto-delete expired requests (Cron job endpoint)
 * @access  Admin only
 * @note    Deletes requests where finalExpiresAt has passed (no response after reminder)
 * @note    Should be called daily
 */
router.post('/auto-delete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), trialRequest_controller_1.TrialRequestController.autoDeleteExpiredRequests);
exports.TrialRequestRoutes = router;
