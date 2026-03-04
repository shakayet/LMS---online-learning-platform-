"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const call_controller_1 = require("./call.controller");
const call_validation_1 = require("./call.validation");
const router = express_1.default.Router();
// Initiate a new call
router.post('/initiate', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.initiateCall), call_controller_1.CallController.initiateCall);
// Accept a call
router.post('/:callId/accept', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.acceptCall);
// Reject a call
router.post('/:callId/reject', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.rejectCall);
// End a call
router.post('/:callId/end', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.endCall);
// Cancel a call (before accepted)
router.post('/:callId/cancel', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.cancelCall);
// Refresh token for ongoing call
router.post('/:callId/refresh-token', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.refreshToken);
// Get call history
router.get('/history', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.getCallHistory), call_controller_1.CallController.getCallHistory);
// Get single call details
router.get('/:callId', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.getCallById);
// Get active participants of a call
router.get('/:callId/participants', (0, auth_1.default)(), (0, validateRequest_1.default)(call_validation_1.CallValidation.callIdParam), call_controller_1.CallController.getActiveParticipants);
exports.CallRoutes = router;
