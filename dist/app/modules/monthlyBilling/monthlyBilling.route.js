"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyBillingRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const monthlyBilling_controller_1 = require("./monthlyBilling.controller");
const monthlyBilling_validation_1 = require("./monthlyBilling.validation");
const router = express_1.default.Router();

router.get('/my-billings', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), monthlyBilling_controller_1.MonthlyBillingController.getMyBillings);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.getSingleBilling);

router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(monthlyBilling_validation_1.MonthlyBillingValidation.generateMonthlyBillingZodSchema), monthlyBilling_controller_1.MonthlyBillingController.generateMonthlyBillings);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.getAllBillings);

router.patch('/:id/mark-paid', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.markAsPaid);

router.patch('/:id/mark-failed', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.markAsFailed);
exports.MonthlyBillingRoutes = router;
