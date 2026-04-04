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

router.post('/rooms', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.createRoom), whiteboard_controller_1.WhiteboardController.createRoom);

router.get('/rooms', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getUserRooms), whiteboard_controller_1.WhiteboardController.getUserRooms);

router.post('/calls/:callId/room', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getOrCreateForCall), whiteboard_controller_1.WhiteboardController.getOrCreateForCall);

router.post('/rooms/:roomId/token', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.getRoomToken), whiteboard_controller_1.WhiteboardController.getRoomToken);

router.get('/rooms/:roomId/snapshots', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.roomIdParam), whiteboard_controller_1.WhiteboardController.getRoomSnapshots);

router.post('/rooms/:roomId/snapshot', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.takeSnapshot), whiteboard_controller_1.WhiteboardController.takeSnapshot);

router.delete('/rooms/:roomId', (0, auth_1.default)(), (0, validateRequest_1.default)(whiteboard_validation_1.WhiteboardValidation.roomIdParam), whiteboard_controller_1.WhiteboardController.deleteRoom);
exports.WhiteboardRoutes = router;
