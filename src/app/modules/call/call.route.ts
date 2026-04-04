import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CallController } from './call.controller';
import { CallValidation } from './call.validation';

const router = express.Router();

router.post(
  '/initiate',
  auth(),
  validateRequest(CallValidation.initiateCall),
  CallController.initiateCall
);

router.post(
  '/:callId/accept',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.acceptCall
);

router.post(
  '/:callId/reject',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.rejectCall
);

router.post(
  '/:callId/end',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.endCall
);

router.post(
  '/:callId/cancel',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.cancelCall
);

router.post(
  '/:callId/refresh-token',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.refreshToken
);

router.get(
  '/history',
  auth(),
  validateRequest(CallValidation.getCallHistory),
  CallController.getCallHistory
);

router.get(
  '/:callId',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.getCallById
);

router.get(
  '/:callId/participants',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.getActiveParticipants
);

export const CallRoutes = router;
