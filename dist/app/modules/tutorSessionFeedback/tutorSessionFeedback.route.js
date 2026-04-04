"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorSessionFeedbackRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const tutorSessionFeedback_controller_1 = require("./tutorSessionFeedback.controller");
const tutorSessionFeedback_validation_1 = require("./tutorSessionFeedback.validation");
const router = express_1.default.Router();

router.get('/admin/forfeited-summary', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getForfeitedPaymentsSummary);
router.get('/admin/forfeited-list', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getForfeitedFeedbacksList);

router.post('/', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, fileHandler_1.fileHandler)([{ name: 'feedbackAudioUrl', maxCount: 1 }]), (0, validateRequest_1.default)(tutorSessionFeedback_validation_1.TutorSessionFeedbackValidation.createFeedbackZodSchema), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.submitFeedback);
router.get('/pending', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getPendingFeedbacks);
router.get('/my-feedbacks', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getTutorFeedbacks);

router.get('/received', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getMyReceivedFeedbacks);

router.get('/session/:sessionId', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.STUDENT), tutorSessionFeedback_controller_1.TutorSessionFeedbackController.getFeedbackBySession);
exports.TutorSessionFeedbackRoutes = router;
