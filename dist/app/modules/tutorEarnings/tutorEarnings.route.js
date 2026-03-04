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
// ============ TUTOR ROUTES ============
/**
 * @route   GET /api/v1/earnings/my-stats
 * @desc    Get tutor's comprehensive stats including level progress
 * @access  Tutor only
 */
router.get('/my-stats', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyStats);
/**
 * @route   GET /api/v1/earnings/my-earnings
 * @desc    Get tutor's earnings history
 * @access  Tutor only
 * @query   ?status=PAID&page=1&limit=10&sort=-payoutYear,-payoutMonth
 */
router.get('/my-earnings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getMyEarnings);
/**
 * @route   GET /api/v1/earnings/history
 * @desc    Get tutor's formatted earnings history for frontend
 * @access  Tutor only
 * @query   ?page=1&limit=10
 */
router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getEarningsHistory);
/**
 * @route   GET /api/v1/earnings/payout-settings
 * @desc    Get tutor's payout settings (IBAN, recipient)
 * @access  Tutor only
 */
router.get('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), tutorEarnings_controller_1.TutorEarningsController.getPayoutSettings);
/**
 * @route   PATCH /api/v1/earnings/payout-settings
 * @desc    Update tutor's payout settings
 * @access  Tutor only
 * @body    { recipient: string, iban: string }
 */
router.patch('/payout-settings', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.updatePayoutSettingsZodSchema), tutorEarnings_controller_1.TutorEarningsController.updatePayoutSettings);
/**
 * @route   GET /api/v1/earnings/:id
 * @desc    Get single earnings record
 * @access  Tutor (own earnings) or Admin
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getSingleEarning);
// ============ ADMIN ROUTES ============
/**
 * @route   POST /api/v1/earnings/generate
 * @desc    Generate tutor earnings for all tutors
 * @access  Admin only
 * @body    { month: number, year: number, commissionRate?: number }
 * @note    Called by cron job at month-end (after billing generation)
 * @note    Calculates platform commission and tutor net earnings
 * @note    Prevents duplicate payouts (unique index on tutorId + month + year)
 */
router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.generateTutorEarningsZodSchema), tutorEarnings_controller_1.TutorEarningsController.generateTutorEarnings);
/**
 * @route   GET /api/v1/earnings
 * @desc    Get all earnings
 * @access  Admin only
 * @query   ?status=PENDING&month=1&year=2024&searchTerm=PAYOUT&page=1&limit=10
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.getAllEarnings);
/**
 * @route   PATCH /api/v1/earnings/:id/initiate-payout
 * @desc    Initiate Stripe Connect payout to tutor
 * @access  Admin only
 * @body    { notes?: string }
 * @note    Creates Stripe transfer to tutor's Connect account
 */
router.patch('/:id/initiate-payout', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.initiatePayoutZodSchema), tutorEarnings_controller_1.TutorEarningsController.initiatePayout);
/**
 * @route   PATCH /api/v1/earnings/:id/mark-paid
 * @desc    Mark payout as paid
 * @access  Admin only
 * @body    { stripePayoutId?: string, paymentMethod?: string }
 * @note    Usually called automatically by Stripe webhook
 */
router.patch('/:id/mark-paid', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorEarnings_controller_1.TutorEarningsController.markAsPaid);
/**
 * @route   PATCH /api/v1/earnings/:id/mark-failed
 * @desc    Mark payout as failed
 * @access  Admin only
 * @body    { failureReason: string }
 */
router.patch('/:id/mark-failed', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorEarnings_validation_1.TutorEarningsValidation.markAsFailedZodSchema), tutorEarnings_controller_1.TutorEarningsController.markAsFailed);
exports.TutorEarningsRoutes = router;
