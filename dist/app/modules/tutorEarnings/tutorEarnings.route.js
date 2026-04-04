"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorEarningsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const tutorEarnings_controller_1 = require("./tutorEarnings.controller");
const tutorEarnings_validation_1 = require("./tutorEarnings.validation");
const router = express_1.default.Router();

router.get('/my-stats', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyStats);

router.get('/my-earnings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyEarnings);

router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getEarningsHistory);

router.get('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getPayoutSettings);

router.patch('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.updatePayoutSettingsZodSchema), tutorEarnings_controller_1.TutorEarningsController.updatePayoutSettings);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getSingleEarning);

router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.generateTutorEarningsZodSchema), tutorEarnings_controller_1.TutorEarningsController.generateTutorEarnings);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getAllEarnings);

router.patch('/:id/initiate-payout', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.initiatePayoutZodSchema), tutorEarnings_controller_1.TutorEarningsController.initiatePayout);

router.patch('/:id/mark-paid', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.markAsPaid);

router.patch('/:id/mark-failed', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.markAsFailedZodSchema), tutorEarnings_controller_1.TutorEarningsController.markAsFailed);
exports.TutorEarningsRoutes = router;
