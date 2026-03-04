"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const whiteboard_controller_1 = require("./whiteboard.controller");
const whiteboard_validation_1 = require("./whiteboard.validation");
const router = express_1.default.Router();
// Create a new whiteboard room
router.post('/rooms', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.createRoom), whiteboard_controller_1.WhiteboardController.createRoom);
// Get user's whiteboard rooms
router.get('/rooms', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getUserRooms), whiteboard_controller_1.WhiteboardController.getUserRooms);
// Get or create whiteboard for a call
router.post('/calls/:callId/room', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getOrCreateForCall), whiteboard_controller_1.WhiteboardController.getOrCreateForCall);
// Get room token
router.post('/rooms/:roomId/token', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getRoomToken), whiteboard_controller_1.WhiteboardController.getRoomToken);
// Get room snapshots
router.get('/rooms/:roomId/snapshots', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.roomIdParam), whiteboard_controller_1.WhiteboardController.getRoomSnapshots);
// Take snapshot
router.post('/rooms/:roomId/snapshot', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.takeSnapshot), whiteboard_controller_1.WhiteboardController.takeSnapshot);
// Delete/close room
router.delete('/rooms/:roomId', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.roomIdParam), whiteboard_controller_1.WhiteboardController.deleteRoom);
exports.WhiteboardRoutes = router;
