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

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.getPaymentMethods);

router.post('/setup-intent', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.createSetupIntent);

router.post('/attach', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), (0, validateRequest_1.default)(paymentMethod_validation_1.PaymentMethodValidation.attachPaymentMethodZodSchema), paymentMethod_controller_1.PaymentMethodController.attachPaymentMethod);

router.patch('/:paymentMethodId/default', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.setDefaultPaymentMethod);

router.delete('/:paymentMethodId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), paymentMethod_controller_1.PaymentMethodController.deletePaymentMethod);
exports.PaymentMethodRoutes = router;
