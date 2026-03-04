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
// ============ STUDENT ROUTES ============
/**
 * @route   POST /api/v1/subscriptions/subscribe
 * @desc    Subscribe to a pricing plan
 * @access  Student only
 * @body    { tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' }
 * @note    FLEXIBLE: €30/hr, no commitment
 * @note    REGULAR: €28/hr, 1 month, min 4 hours
 * @note    LONG_TERM: €25/hr, 3 months, min 4 hours
 * @note    Student can only have one active subscription
 */
router.post('/subscribe', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.subscribeToPlanZodSchema), studentSubscription_controller_1.StudentSubscriptionController.subscribeToPlan);
/**
 * @route   GET /api/v1/subscriptions/my-subscription
 * @desc    Get student's active subscription
 * @access  Student only
 */
router.get('/my-subscription', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getMySubscription);
/**
 * @route   GET /api/v1/subscriptions/my-plan-usage
 * @desc    Get comprehensive plan usage details
 * @access  Student only
 * @returns Plan details, usage stats, spending, upcoming sessions
 */
router.get('/my-plan-usage', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getMyPlanUsage);
/**
 * @route   PATCH /api/v1/subscriptions/:id/cancel
 * @desc    Cancel subscription
 * @access  Student only (must own subscription)
 * @body    { cancellationReason: string }
 */
router.patch('/:id/cancel', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.cancelSubscriptionZodSchema), studentSubscription_controller_1.StudentSubscriptionController.cancelSubscription);
/**
 * @route   POST /api/v1/subscriptions/create-payment-intent
 * @desc    Create Stripe PaymentIntent for subscription
 * @access  Student only
 * @body    { tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' }
 * @returns { clientSecret, subscriptionId, amount, currency }
 */
router.post('/create-payment-intent', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.subscribeToPlanZodSchema), studentSubscription_controller_1.StudentSubscriptionController.createPaymentIntent);
/**
 * @route   POST /api/v1/subscriptions/confirm-payment
 * @desc    Confirm payment and activate subscription
 * @access  Student only
 * @body    { subscriptionId, paymentIntentId }
 */
router.post('/confirm-payment', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(studentSubscription_validation_1.StudentSubscriptionValidation.confirmPaymentZodSchema), studentSubscription_controller_1.StudentSubscriptionController.confirmPayment);
/**
 * @route   GET /api/v1/subscriptions/payment-history
 * @desc    Get payment history
 * @access  Student only
 * @query   ?page=1&limit=10
 */
router.get('/payment-history', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), studentSubscription_controller_1.StudentSubscriptionController.getPaymentHistory);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/subscriptions
 * @desc    Get all subscriptions
 * @access  Admin only
 * @query   ?status=ACTIVE&tier=REGULAR&page=1&limit=10
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.getAllSubscriptions);
/**
 * @route   GET /api/v1/subscriptions/:id
 * @desc    Get single subscription details
 * @access  Admin only
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.getSingleSubscription);
/**
 * @route   POST /api/v1/subscriptions/expire-old
 * @desc    Expire old subscriptions (Cron job endpoint)
 * @access  Admin only
 * @note    Marks subscriptions as EXPIRED after endDate passes
 * @note    Should be called periodically (e.g., daily)
 */
router.post('/expire-old', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), studentSubscription_controller_1.StudentSubscriptionController.expireOldSubscriptions);
exports.StudentSubscriptionRoutes = router;
