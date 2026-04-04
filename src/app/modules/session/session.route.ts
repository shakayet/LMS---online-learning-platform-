import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SessionController } from './session.controller';
import { SessionValidation } from './session.validation';

const router = express.Router();

router.post(
  '/propose',
  auth(USER_ROLES.TUTOR),
  validateRequest(SessionValidation.proposeSessionZodSchema),
  SessionController.proposeSession
);

router.post(
  '/proposals/:messageId/accept',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.acceptSessionProposalZodSchema),
  SessionController.acceptSessionProposal
);

router.post(
  '/proposals/:messageId/counter',
  auth(USER_ROLES.STUDENT),
  validateRequest(SessionValidation.counterProposeSessionZodSchema),
  SessionController.counterProposeSession
);

router.post(
  '/proposals/:messageId/reject',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.rejectSessionProposalZodSchema),
  SessionController.rejectSessionProposal
);

router.get(
  '/my-upcoming',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.getUpcomingSessions
);

router.get(
  '/my-completed',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.getCompletedSessions
);

router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getAllSessions
);

router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  SessionController.getSingleSession
);

router.patch(
  '/:id/cancel',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.cancelSessionZodSchema),
  SessionController.cancelSession
);

router.patch(
  '/:id/reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SessionValidation.rescheduleSessionZodSchema),
  SessionController.requestReschedule
);

router.patch(
  '/:id/approve-reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.approveReschedule
);

router.patch(
  '/:id/reject-reschedule',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SessionController.rejectReschedule
);

router.patch(
  '/:id/complete',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SessionValidation.completeSessionZodSchema),
  SessionController.markAsCompleted
);

router.post(
  '/auto-complete',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionController.autoCompleteSessions
);

router.post(
  '/auto-transition',
  auth(USER_ROLES.SUPER_ADMIN),
  SessionController.autoTransitionStatuses
);

export const SessionRoutes = router;