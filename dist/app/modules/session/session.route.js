"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const session_controller_1 = require("./session.controller");
const session_validation_1 = require("./session.validation");
const router = express_1.default.Router();
// ============ TUTOR ROUTES ============
/**
 * @route   POST /api/v1/sessions/propose
 * @desc    Propose session in chat (In-chat booking)
 * @access  Tutor only (verified tutors)
 * @body    { chatId: string, subject: string, startTime: Date, endTime: Date, description?: string }
 * @note    Creates message with type: 'session_proposal'
 * @note    Price calculated based on student's subscription tier
 * @note    Proposal expires in 24 hours
 */
router.post('/propose', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.proposeSessionZodSchema), session_controller_1.SessionController.proposeSession);
// ============ PROPOSAL RESPONSE ROUTES (Student or Tutor) ============
/**
 * @route   POST /api/v1/sessions/proposals/:messageId/accept
 * @desc    Accept session proposal
 * @access  Student or Tutor (recipient of proposal, not sender)
 * @note    Student accepts tutor's proposal OR Tutor accepts student's counter-proposal
 * @note    User cannot accept their own proposal
 * @note    Creates session with status: SCHEDULED
 * @note    Generates Google Meet link (placeholder)
 * @note    Updates proposal message status to ACCEPTED
 */
router.post('/proposals/:messageId/accept', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.acceptSessionProposalZodSchema), session_controller_1.SessionController.acceptSessionProposal);
/**
 * @route   POST /api/v1/sessions/proposals/:messageId/counter
 * @desc    Counter-propose session with alternative time
 * @access  Student only
 * @body    { newStartTime: Date, newEndTime: Date, reason?: string }
 * @note    Original proposal status changes to COUNTER_PROPOSED
 * @note    Creates new proposal message with student's preferred time
 * @note    Tutor can then accept or reject the counter-proposal
 */
router.post('/proposals/:messageId/counter', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(session_validation_1.SessionValidation.counterProposeSessionZodSchema), session_controller_1.SessionController.counterProposeSession);
/**
 * @route   POST /api/v1/sessions/proposals/:messageId/reject
 * @desc    Reject session proposal
 * @access  Student or Tutor (recipient of proposal, not sender)
 * @body    { rejectionReason: string }
 * @note    Student rejects tutor's proposal OR Tutor rejects student's counter-proposal
 * @note    User cannot reject their own proposal
 * @note    Updates proposal message status to REJECTED
 */
router.post('/proposals/:messageId/reject', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.rejectSessionProposalZodSchema), session_controller_1.SessionController.rejectSessionProposal);
// ============ SHARED ROUTES (STUDENT + TUTOR + ADMIN) ============
/**
 * @route   GET /api/v1/sessions/my-upcoming
 * @desc    Get upcoming sessions for logged-in user
 * @access  Student or Tutor
 * @query   ?page=1&limit=10&sort=startTime
 * @returns Sessions with status: SCHEDULED, STARTING_SOON, IN_PROGRESS, AWAITING_RESPONSE, RESCHEDULE_REQUESTED
 */
router.get('/my-upcoming', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.getUpcomingSessions);
/**
 * @route   GET /api/v1/sessions/my-completed
 * @desc    Get completed sessions for logged-in user
 * @access  Student or Tutor
 * @query   ?page=1&limit=10&sort=-completedAt
 * @returns Sessions with status: COMPLETED, CANCELLED, EXPIRED, NO_SHOW
 * @note    Includes review status (studentReviewStatus, tutorFeedbackStatus)
 */
router.get('/my-completed', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.getCompletedSessions);
/**
 * @route   GET /api/v1/sessions
 * @desc    Get sessions
 * @access  Student (own sessions), Tutor (own sessions), Admin (all sessions)
 * @query   ?status=SCHEDULED&page=1&limit=10&sort=-startTime
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getAllSessions);
/**
 * @route   GET /api/v1/sessions/:id
 * @desc    Get single session details
 * @access  Student (own), Tutor (own), Admin (all)
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getSingleSession);
/**
 * @route   PATCH /api/v1/sessions/:id/cancel
 * @desc    Cancel session
 * @access  Student or Tutor (must be participant)
 * @body    { cancellationReason: string }
 * @note    Only SCHEDULED sessions can be cancelled
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.cancelSessionZodSchema), session_controller_1.SessionController.cancelSession);
/**
 * @route   PATCH /api/v1/sessions/:id/reschedule
 * @desc    Request session reschedule
 * @access  Student or Tutor (must be participant)
 * @body    { newStartTime: Date, reason?: string }
 * @note    Can only reschedule up to 10 minutes before session start
 * @note    Other party must approve/reject the reschedule
 */
router.patch('/:id/reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.rescheduleSessionZodSchema), session_controller_1.SessionController.requestReschedule);
/**
 * @route   PATCH /api/v1/sessions/:id/approve-reschedule
 * @desc    Approve reschedule request
 * @access  Student or Tutor (must be the OTHER party, not requester)
 * @note    Updates session times and status back to SCHEDULED
 */
router.patch('/:id/approve-reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.approveReschedule);
/**
 * @route   PATCH /api/v1/sessions/:id/reject-reschedule
 * @desc    Reject reschedule request
 * @access  Student or Tutor (must be the OTHER party, not requester)
 * @note    Keeps original session times, status back to SCHEDULED
 */
router.patch('/:id/reject-reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.rejectReschedule);
// ============ ADMIN ROUTES ============
/**
 * @route   PATCH /api/v1/sessions/:id/complete
 * @desc    Manually mark session as completed
 * @access  Admin only
 * @note    Normally automated by cron job
 */
router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(session_validation_1.SessionValidation.completeSessionZodSchema), session_controller_1.SessionController.markAsCompleted);
/**
 * @route   POST /api/v1/sessions/auto-complete
 * @desc    Auto-complete sessions (Cron job endpoint)
 * @access  Admin only
 * @note    Marks sessions as COMPLETED after endTime passes
 * @note    Should be called periodically (e.g., every hour)
 */
router.post('/auto-complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.autoCompleteSessions);
/**
 * @route   POST /api/v1/sessions/auto-transition
 * @desc    Auto-transition session statuses (Cron job endpoint)
 * @access  Admin only
 * @note    SCHEDULED -> STARTING_SOON (10 min before)
 * @note    STARTING_SOON -> IN_PROGRESS (at start)
 * @note    IN_PROGRESS -> EXPIRED (at end if not completed)
 */
router.post('/auto-transition', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.autoTransitionStatuses);
exports.SessionRoutes = router;
