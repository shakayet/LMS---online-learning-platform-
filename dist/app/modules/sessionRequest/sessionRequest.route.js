"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRequestRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_1 = require("../../../enums/user");
const sessionRequest_controller_1 = require("./sessionRequest.controller");
const sessionRequest_validation_1 = require("./sessionRequest.validation");
const router = express_1.default.Router();
// Student routes
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionRequest_validation_1.SessionRequestValidation.createSessionRequestZodSchema), sessionRequest_controller_1.SessionRequestController.createSessionRequest);
router.get('/my-requests', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionRequest_controller_1.SessionRequestController.getMySessionRequests);
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(sessionRequest_validation_1.SessionRequestValidation.cancelSessionRequestZodSchema), sessionRequest_controller_1.SessionRequestController.cancelSessionRequest);
router.patch('/:id/extend', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), sessionRequest_controller_1.SessionRequestController.extendSessionRequest);
// Tutor routes
router.get('/matching', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), sessionRequest_controller_1.SessionRequestController.getMatchingSessionRequests);
router.get('/my-accepted', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), sessionRequest_controller_1.SessionRequestController.getMyAcceptedRequests);
router.patch('/:id/accept', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(sessionRequest_validation_1.SessionRequestValidation.acceptSessionRequestZodSchema), sessionRequest_controller_1.SessionRequestController.acceptSessionRequest);
// Admin routes
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionRequest_controller_1.SessionRequestController.getAllSessionRequests);
router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionRequest_controller_1.SessionRequestController.expireOldRequests);
router.post('/send-reminders', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionRequest_controller_1.SessionRequestController.sendExpirationReminders);
router.post('/auto-delete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), sessionRequest_controller_1.SessionRequestController.autoDeleteExpiredRequests);
// Shared routes (authenticated users)
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), sessionRequest_controller_1.SessionRequestController.getSingleSessionRequest);
exports.SessionRequestRoutes = router;
