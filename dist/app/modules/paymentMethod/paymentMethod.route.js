"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const paymentMethod_controller_1 = require("./paymentMethod.controller");
const paymentMethod_validation_1 = require("./paymentMethod.validation");
const router = express_1.default.Router();
/**
 * @route   GET /api/v1/payment-methods
 * @desc    Get all saved payment methods
 * @access  Student only
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.getPaymentMethods);
/**
 * @route   POST /api/v1/payment-methods/setup-intent
 * @desc    Create SetupIntent for adding new payment method
 * @access  Student only
 * @returns { clientSecret }
 */
router.post('/setup-intent', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.createSetupIntent);
/**
 * @route   POST /api/v1/payment-methods/attach
 * @desc    Attach payment method after successful setup
 * @access  Student only
 * @body    { paymentMethodId, setAsDefault? }
 */
router.post('/attach', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(paymentMethod_validation_1.PaymentMethodValidation.attachPaymentMethodZodSchema), paymentMethod_controller_1.PaymentMethodController.attachPaymentMethod);
/**
 * @route   PATCH /api/v1/payment-methods/:paymentMethodId/default
 * @desc    Set a payment method as default
 * @access  Student only
 */
router.patch('/:paymentMethodId/default', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.setDefaultPaymentMethod);
/**
 * @route   DELETE /api/v1/payment-methods/:paymentMethodId
 * @desc    Delete a payment method
 * @access  Student only
 */
router.delete('/:paymentMethodId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.deletePaymentMethod);
exports.PaymentMethodRoutes = router;
