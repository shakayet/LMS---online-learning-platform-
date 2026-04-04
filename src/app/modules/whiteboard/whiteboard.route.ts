import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { WhiteboardController } from './whiteboard.controller';
import { WhiteboardValidation } from './whiteboard.validation';

const router = express.Router();

router.post(
  '/rooms',
  auth(),
  validateRequest(WhiteboardValidation.createRoom),
  WhiteboardController.createRoom
);

router.get(
  '/rooms',
  auth(),
  validateRequest(WhiteboardValidation.getUserRooms),
  WhiteboardController.getUserRooms
);

router.post(
  '/calls/:callId/room',
  auth(),
  validateRequest(WhiteboardValidation.getOrCreateForCall),
  WhiteboardController.getOrCreateForCall
);

router.post(
  '/rooms/:roomId/token',
  auth(),
  validateRequest(WhiteboardValidation.getRoomToken),
  WhiteboardController.getRoomToken
);

router.get(
  '/rooms/:roomId/snapshots',
  auth(),
  validateRequest(WhiteboardValidation.roomIdParam),
  WhiteboardController.getRoomSnapshots
);

router.post(
  '/rooms/:roomId/snapshot',
  auth(),
  validateRequest(WhiteboardValidation.takeSnapshot),
  WhiteboardController.takeSnapshot
);

router.delete(
  '/rooms/:roomId',
  auth(),
  validateRequest(WhiteboardValidation.roomIdParam),
  WhiteboardController.deleteRoom
);

export const WhiteboardRoutes = router;
