import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CallController } from './call.controller';
import { CallValidation } from './call.validation';

const router = express.Router();

// Initiate a new call
router.post(
  '/initiate',
  auth(),
  validateRequest(CallValidation.initiateCall),
  CallController.initiateCall
);

// Accept a call
router.post(
  '/:callId/accept',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.acceptCall
);

// Reject a call
router.post(
  '/:callId/reject',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.rejectCall
);

// End a call
router.post(
  '/:callId/end',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.endCall
);

// Cancel a call (before accepted)
router.post(
  '/:callId/cancel',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.cancelCall
);

// Refresh token for ongoing call
router.post(
  '/:callId/refresh-token',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.refreshToken
);

// Get call history
router.get(
  '/history',
  auth(),
  validateRequest(CallValidation.getCallHistory),
  CallController.getCallHistory
);

// Get single call details
router.get(
  '/:callId',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.getCallById
);

// Get active participants of a call
router.get(
  '/:callId/participants',
  auth(),
  validateRequest(CallValidation.callIdParam),
  CallController.getActiveParticipants
);

export const CallRoutes = router;
