import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { InterviewSlotController } from './interviewSlot.controller';
import { InterviewSlotValidation } from './interviewSlot.validation';

const router = express.Router();

router.get(
  '/my-interview',
  auth(USER_ROLES.APPLICANT),
  InterviewSlotController.getMyBookedInterview
);

router.get(
  '/scheduled-meetings',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getScheduledMeetings
);

router.get(
  '/:id/meeting-token',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getMeetingToken
);

router.get(
  '/',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getAllInterviewSlots
);

router.get(
  '/:id',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.getSingleInterviewSlot
);

router.patch(
  '/:id/book',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.bookInterviewSlotZodSchema),
  InterviewSlotController.bookInterviewSlot
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLES.APPLICANT, USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.cancelInterviewSlotZodSchema),
  InterviewSlotController.cancelInterviewSlot
);

router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.APPLICANT),
  validateRequest(InterviewSlotValidation.rescheduleInterviewSlotZodSchema),
  InterviewSlotController.rescheduleInterviewSlot
);

router.post(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.createInterviewSlotZodSchema),
  InterviewSlotController.createInterviewSlot
);

router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.markAsCompleted
);

router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(InterviewSlotValidation.updateInterviewSlotZodSchema),
  InterviewSlotController.updateInterviewSlot
);

router.delete(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN),
  InterviewSlotController.deleteInterviewSlot
);

export const InterviewSlotRoutes = router;