"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewSlotRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const interviewSlot_controller_1 = require("./interviewSlot.controller");
const interviewSlot_validation_1 = require("./interviewSlot.validation");
const router = express_1.default.Router();
// ============ APPLICANT ROUTES ============
// Note: Only applicants with SELECTED_FOR_INTERVIEW status can access these
/**
 * @route   GET /api/v1/interview-slots/my-interview
 * @desc    Get my booked interview slot
 * @access  Applicant only
 */
router.get('/my-interview', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), interviewSlot_controller_1.InterviewSlotController.getMyBookedInterview);
/**
 * @route   GET /api/v1/interview-slots/scheduled-meetings
 * @desc    Get all scheduled meetings (BOOKED interview slots)
 * @access  Admin only
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get('/scheduled-meetings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getScheduledMeetings);
/**
 * @route   GET /api/v1/interview-slots/:id/meeting-token
 * @desc    Get Agora meeting token for interview video call
 * @access  Applicant or Admin (must be participant of the meeting)
 */
router.get('/:id/meeting-token', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getMeetingToken);
/**
 * @route   GET /api/v1/interview-slots
 * @desc    Get available interview slots
 * @access  Applicant (must be SELECTED_FOR_INTERVIEW) or Admin
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getAllInterviewSlots);
/**
 * @route   GET /api/v1/interview-slots/:id
 * @desc    Get single interview slot details
 * @access  Applicant or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.getSingleInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/book
 * @desc    Book an available interview slot
 * @access  Applicant only (must be SELECTED_FOR_INTERVIEW)
 * @body    { applicationId: string }
 * @note    Application must be SELECTED_FOR_INTERVIEW status
 * @note    Applicant can only have one booked slot at a time
 */
router.patch('/:id/book', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.bookInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.bookInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/cancel
 * @desc    Cancel a booked interview slot
 * @access  Applicant or Admin
 * @body    { cancellationReason: string }
 * @note    Must be at least 1 hour before interview (for applicants)
 * @note    Slot becomes AVAILABLE again
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.cancelInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.cancelInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/reschedule
 * @desc    Reschedule a booked interview to a different slot
 * @access  Applicant only
 * @body    { newSlotId: string }
 * @note    Must be at least 1 hour before current interview
 * @note    Current slot becomes available, new slot gets booked
 */
router.patch('/:id/reschedule', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.rescheduleInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.rescheduleInterviewSlot);
// ============ ADMIN ROUTES ============
/**
 * @route   POST /api/v1/interview-slots
 * @desc    Create new interview slot
 * @access  Admin only
 * @body    { startTime: Date, endTime: Date, notes?: string }
 * @note    Prevents overlapping slots for same admin
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.createInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.createInterviewSlot);
/**
 * @route   PATCH /api/v1/interview-slots/:id/complete
 * @desc    Mark interview as completed
 * @access  Admin only
 * @note    Admin can then approve/reject the application separately
 */
router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.markAsCompleted);
/**
 * @route   PATCH /api/v1/interview-slots/:id
 * @desc    Update interview slot (only AVAILABLE slots)
 * @access  Admin only
 * @body    { startTime?, endTime?, notes?, status? }
 * @note    Cannot update booked/completed/cancelled slots
 */
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(interviewSlot_validation_1.InterviewSlotValidation.updateInterviewSlotZodSchema), interviewSlot_controller_1.InterviewSlotController.updateInterviewSlot);
/**
 * @route   DELETE /api/v1/interview-slots/:id
 * @desc    Delete interview slot
 * @access  Admin only
 * @note    Cannot delete booked slots (cancel first)
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), interviewSlot_controller_1.InterviewSlotController.deleteInterviewSlot);
exports.InterviewSlotRoutes = router;
