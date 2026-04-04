import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { fileHandler } from '../../middlewares/fileHandler';
import { TutorSessionFeedbackController } from './tutorSessionFeedback.controller';
import { TutorSessionFeedbackValidation } from './tutorSessionFeedback.validation';

const router = express.Router();

router.get(
  '/admin/forfeited-summary',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorSessionFeedbackController.getForfeitedPaymentsSummary
);

router.get(
  '/admin/forfeited-list',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorSessionFeedbackController.getForfeitedFeedbacksList
);

router.post(
  '/',
  auth(USER_ROLES.TUTOR),
  fileHandler([{ name: 'feedbackAudioUrl', maxCount: 1 }]),
  validateRequest(TutorSessionFeedbackValidation.createFeedbackZodSchema as any),
  TutorSessionFeedbackController.submitFeedback
);

router.get(
  '/pending',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getPendingFeedbacks
);

router.get(
  '/my-feedbacks',
  auth(USER_ROLES.TUTOR),
  TutorSessionFeedbackController.getTutorFeedbacks
);

router.get(
  '/received',
  auth(USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getMyReceivedFeedbacks
);

router.get(
  '/session/:sessionId',
  auth(USER_ROLES.TUTOR, USER_ROLES.STUDENT),
  TutorSessionFeedbackController.getFeedbackBySession
);

export const TutorSessionFeedbackRoutes = router;
