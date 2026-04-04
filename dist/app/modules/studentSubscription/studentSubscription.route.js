"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentSubscriptionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const studentSubscription_controller_1 = require("./studentSubscription.controller");
const studentSubscription_validation_1 = require("./studentSubscription.validation");
const router = express_1.default.Router();

router.post('/subscribe', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.subscribeToPlanZodSchema), studentSubscription_controller_1.StudentSubscriptionController.subscribeToPlan);

router.get('/my-subscription', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getMySubscription);

router.get('/my-plan-usage', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getMyPlanUsage);

router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.cancelSubscriptionZodSchema), studentSubscription_controller_1.StudentSubscriptionController.cancelSubscription);

router.post('/create-payment-intent', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.subscribeToPlanZodSchema), studentSubscription_controller_1.StudentSubscriptionController.createPaymentIntent);

router.post('/confirm-payment', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.confirmPaymentZodSchema), studentSubscription_controller_1.StudentSubscriptionController.confirmPayment);

router.get('/payment-history', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getPaymentHistory);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.getAllSubscriptions);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.getSingleSubscription);

router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.expireOldSubscriptions);
exports.StudentSubscriptionRoutes = router;
