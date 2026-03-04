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
// ============ STUDENT ROUTES ============
/**
 * @route   GET /api/v1/billings/my-billings
 * @desc    Get student's billing history
 * @access  Student only
 * @query   ?status=PAID&page=1&limit=10&sort=-billingYear,-billingMonth
 */
router.get('/my-billings', (0, auth_1.default)(user_1.USER_ROLES.STUDENT), monthlyBilling_controller_1.MonthlyBillingController.getMyBillings);
/**
 * @route   GET /api/v1/billings/:id
 * @desc    Get single billing details
 * @access  Student (own billings) or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.getSingleBilling);
// ============ ADMIN ROUTES ============
/**
 * @route   POST /api/v1/billings/generate
 * @desc    Generate monthly billings for all students
 * @access  Admin only
 * @body    { month: number, year: number }
 * @note    Called by cron job at month-end
 * @note    Creates invoices for all completed sessions in billing period
 * @note    Prevents duplicate billings (unique index on studentId + month + year)
 */
router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(monthlyBilling_validation_1.MonthlyBillingValidation.generateMonthlyBillingZodSchema), monthlyBilling_controller_1.MonthlyBillingController.generateMonthlyBillings);
/**
 * @route   GET /api/v1/billings
 * @desc    Get all billings
 * @access  Admin only
 * @query   ?status=PENDING&month=1&year=2024&searchTerm=INV&page=1&limit=10
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.getAllBillings);
/**
 * @route   PATCH /api/v1/billings/:id/mark-paid
 * @desc    Mark billing as paid
 * @access  Admin only
 * @body    { stripePaymentIntentId?: string, paymentMethod?: string }
 * @note    Usually called automatically by Stripe webhook
 */
router.patch('/:id/mark-paid', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.markAsPaid);
/**
 * @route   PATCH /api/v1/billings/:id/mark-failed
 * @desc    Mark billing as failed
 * @access  Admin only
 * @body    { failureReason: string }
 */
router.patch('/:id/mark-failed', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), monthlyBilling_controller_1.MonthlyBillingController.markAsFailed);
exports.MonthlyBillingRoutes = router;
