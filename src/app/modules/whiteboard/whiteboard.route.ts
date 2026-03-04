import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { WhiteboardController } from './whiteboard.controller';
import { WhiteboardValidation } from './whiteboard.validation';

const router = express.Router();

// Create a new whiteboard room
router.post(
  '/rooms',
  auth(),
  validateRequest(WhiteboardValidation.createRoom),
  WhiteboardController.createRoom
);

// Get user's whiteboard rooms
router.get(
  '/rooms',
  auth(),
  validateRequest(WhiteboardValidation.getUserRooms),
  WhiteboardController.getUserRooms
);

// Get or create whiteboard for a call
router.post(
  '/calls/:callId/room',
  auth(),
  validateRequest(WhiteboardValidation.getOrCreateForCall),
  WhiteboardController.getOrCreateForCall
);

// Get room token
router.post(
  '/rooms/:roomId/token',
  auth(),
  validateRequest(WhiteboardValidation.getRoomToken),
  WhiteboardController.getRoomToken
);

// Get room snapshots
router.get(
  '/rooms/:roomId/snapshots',
  auth(),
  validateRequest(WhiteboardValidation.roomIdParam),
  WhiteboardController.getRoomSnapshots
);

// Take snapshot
router.post(
  '/rooms/:roomId/snapshot',
  auth(),
  validateRequest(WhiteboardValidation.takeSnapshot),
  WhiteboardController.takeSnapshot
);

// Delete/close room
router.delete(
  '/rooms/:roomId',
  auth(),
  validateRequest(WhiteboardValidation.roomIdParam),
  WhiteboardController.deleteRoom
);

export const WhiteboardRoutes = router;
