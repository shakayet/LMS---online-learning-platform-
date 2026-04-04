"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const session_controller_1 = require("./session.controller");
const session_validation_1 = require("./session.validation");
const router = express_1.default.Router();

router.post('/propose', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.proposeSessionZodSchema), session_controller_1.SessionController.proposeSession);

router.post('/proposals/:messageId/accept', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.acceptSessionProposalZodSchema), session_controller_1.SessionController.acceptSessionProposal);

router.post('/proposals/:messageId/counter', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(session_validation_1.SessionValidation.counterProposeSessionZodSchema), session_controller_1.SessionController.counterProposeSession);

router.post('/proposals/:messageId/reject', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.rejectSessionProposalZodSchema), session_controller_1.SessionController.rejectSessionProposal);

router.get('/my-upcoming', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.getUpcomingSessions);

router.get('/my-completed', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.getCompletedSessions);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getAllSessions);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.getSingleSession);

router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.cancelSessionZodSchema), session_controller_1.SessionController.cancelSession);

router.patch('/:id/reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(session_validation_1.SessionValidation.rescheduleSessionZodSchema), session_controller_1.SessionController.requestReschedule);

router.patch('/:id/approve-reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.approveReschedule);

router.patch('/:id/reject-reschedule', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), session_controller_1.SessionController.rejectReschedule);

router.patch('/:id/complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(session_validation_1.SessionValidation.completeSessionZodSchema), session_controller_1.SessionController.markAsCompleted);

router.post('/auto-complete', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.autoCompleteSessions);

router.post('/auto-transition', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), session_controller_1.SessionController.autoTransitionStatuses);
exports.SessionRoutes = router;
