"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const payment_controller_1 = __importDefault(require("./payment.controller"));
const webhook_controller_1 = __importDefault(require("./webhook.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const user_1 = require("../../../enums/user");
const stripeConnect_controller_1 = require("./stripeConnect.controller");
const router = express_1.default.Router();

router.post('/webhook', webhook_controller_1.default.handleStripeWebhook);

router.post('/stripe/account', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.APPLICANT), stripeConnect_controller_1.StripeConnectController.createStripeAccountController);
router.get('/stripe/onboarding', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), stripeConnect_controller_1.StripeConnectController.getOnboardingLinkController);
router.get('/stripe/onboarding-status', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.APPLICANT, user_1.USER_ROLES.SUPER_ADMIN), stripeConnect_controller_1.StripeConnectController.checkOnboardingStatusController);

router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.getPaymentHistoryController);

router.get('/by-bid/:bidId/current-intent', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.getCurrentIntentByBidController);
router.post('/refund/:paymentId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.refundPaymentController);

router.get('/:paymentId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.getPaymentByIdController);
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.getPaymentsController);
router.get('/stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.getPaymentStatsController);
router.delete('/account/:accountId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), payment_controller_1.default.deleteStripeAccountController);
exports.PaymentRoutes = router;
