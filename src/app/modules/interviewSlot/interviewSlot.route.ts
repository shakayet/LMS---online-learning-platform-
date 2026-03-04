import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { InterviewSlotController } from './interviewSlot.controller';
import { InterviewSlotValidation } from './interviewSlot.validation';

const router = express.Router();

// ============ APPLICANT ROUTES ============
// Note: Only applicants with SELECTED_FOR_INTERVIEW status can access these

/**
 * @route   GET /api/v1/interview-slots/my-interview
 * @desc    Get my booked interview slot
 * @access  Applicant only
 */
router.get(
  '/my-interview',
  auth(USER_ROLES.APPLICANT),
  InterviewSlotController.getMyBookedInterview
);

/**
 * @route   GET /api/v1/interview-slots/scheduled-meetings
 * @desc    Get all scheduled meetings (BOOKED interview slots)
 * @access  Admin only
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get(
  '/scheduled-meetings',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getScheduledMeetings
);

/**
 * @route   GET /api/v1/interview-slots/:id/meeting-token
 * @desc    Get Agora meeting token for interview video call
 * @access  Applicant or Admin (must be participant of the meeting)
 */
router.get(
  '/:id/meeting-token',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getMeetingToken
);

/**
 * @route   GET /api/v1/interview-slots
 * @desc    Get available interview slots
 * @access  Applicant (must be SELECTED_FOR_INTERVIEW) or Admin
 * @query   ?page=1&limit=10&sort=-startTime
 */
router.get(
  '/',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getAllInterviewSlots
);

/**
 * @route   GET /api/v1/interview-slots/:id
 * @desc    Get single interview slot details
 * @access  Applicant or Admin
 */
router.get(
  '/:id',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getSingleInterviewSlot
);

/**
 * @route   PATCH /api/v1/interview-slots/:id/book
 * @desc    Book an available interview slot
 * @access  Applicant only (must be SELECTED_FOR_INTERVIEW)
 * @body    { applicationId: string }
 * @note    Application must be SELECTED_FOR_INTERVIEW status
 * @note    Applicant can only have one booked slot at a time
 */
router.patch(
  '/:id/book',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.bookInterviewSlotZodSchema),
  InterviewSlotController.bookInterviewSlot
);

/**
 * @route   PATCH /api/v1/interview-slots/:id/cancel
 * @desc    Cancel a booked interview slot
 * @access  Applicant or Admin
 * @body    { cancellationReason: string }
 * @note    Must be at least 1 hour before interview (for applicants)
 * @note    Slot becomes AVAILABLE again
 */
router.patch(
  '/:id/cancel',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.cancelInterviewSlotZodSchema),
  InterviewSlotController.cancelInterviewSlot
);

/**
 * @route   PATCH /api/v1/interview-slots/:id/reschedule
 * @desc    Reschedule a booked interview to a different slot
 * @access  Applicant only
 * @body    { newSlotId: string }
 * @note    Must be at least 1 hour before current interview
 * @note    Current slot becomes available, new slot gets booked
 */
router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.rescheduleInterviewSlotZodSchema),
  InterviewSlotController.rescheduleInterviewSlot
);

// ============ ADMIN ROUTES ============

/**
 * @route   POST /api/v1/interview-slots
 * @desc    Create new interview slot
 * @access  Admin only
 * @body    { startTime: Date, endTime: Date, notes?: string }
 * @note    Prevents overlapping slots for same admin
 */
router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.createInterviewSlotZodSchema),
  InterviewSlotController.createInterviewSlot
);

/**
 * @route   PATCH /api/v1/interview-slots/:id/complete
 * @desc    Mark interview as completed
 * @access  Admin only
 * @note    Admin can then approve/reject the application separately
 */
router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.markAsCompleted
);

/**
 * @route   PATCH /api/v1/interview-slots/:id
 * @desc    Update interview slot (only AVAILABLE slots)
 * @access  Admin only
 * @body    { startTime?, endTime?, notes?, status? }
 * @note    Cannot update booked/completed/cancelled slots
 */
router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.updateInterviewSlotZodSchema),
  InterviewSlotController.updateInterviewSlot
);

/**
 * @route   DELETE /api/v1/interview-slots/:id
 * @desc    Delete interview slot
 * @access  Admin only
 * @note    Cannot delete booked slots (cancel first)
 */
router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.deleteInterviewSlot
);

export const InterviewSlotRoutes = router;