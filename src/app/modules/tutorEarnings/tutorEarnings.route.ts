import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { TutorEarningsController } from './tutorEarnings.controller';
import { TutorEarningsValidation } from './tutorEarnings.validation';

const router = express.Router();

// ============ TUTOR ROUTES ============

/**
 * @route   GET /api/v1/earnings/my-stats
 * @desc    Get tutor's comprehensive stats including level progress
 * @access  Tutor only
 */
router.get(
  '/my-stats',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyStats
);

/**
 * @route   GET /api/v1/earnings/my-earnings
 * @desc    Get tutor's earnings history
 * @access  Tutor only
 * @query   ?status=PAID&page=1&limit=10&sort=-payoutYear,-payoutMonth
 */
router.get(
  '/my-earnings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getMyEarnings
);

/**
 * @route   GET /api/v1/earnings/history
 * @desc    Get tutor's formatted earnings history for frontend
 * @access  Tutor only
 * @query   ?page=1&limit=10
 */
router.get(
  '/history',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getEarningsHistory
);

/**
 * @route   GET /api/v1/earnings/payout-settings
 * @desc    Get tutor's payout settings (IBAN, recipient)
 * @access  Tutor only
 */
router.get(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  TutorEarningsController.getPayoutSettings
);

/**
 * @route   PATCH /api/v1/earnings/payout-settings
 * @desc    Update tutor's payout settings
 * @access  Tutor only
 * @body    { recipient: string, iban: string }
 */
router.patch(
  '/payout-settings',
  auth(USER_ROLES.TUTOR),
  validateRequest(TutorEarningsValidation.updatePayoutSettingsZodSchema),
  TutorEarningsController.updatePayoutSettings
);

/**
 * @route   GET /api/v1/earnings/:id
 * @desc    Get single earnings record
 * @access  Tutor (own earnings) or Admin
 */
router.get(
  '/:id',
  auth(USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getSingleEarning
);

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
router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.generateTutorEarningsZodSchema),
  TutorEarningsController.generateTutorEarnings
);

/**
 * @route   GET /api/v1/earnings
 * @desc    Get all earnings
 * @access  Admin only
 * @query   ?status=PENDING&month=1&year=2024&searchTerm=PAYOUT&page=1&limit=10
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.getAllEarnings
);

/**
 * @route   PATCH /api/v1/earnings/:id/initiate-payout
 * @desc    Initiate Stripe Connect payout to tutor
 * @access  Admin only
 * @body    { notes?: string }
 * @note    Creates Stripe transfer to tutor's Connect account
 */
router.patch(
  '/:id/initiate-payout',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.initiatePayoutZodSchema),
  TutorEarningsController.initiatePayout
);

/**
 * @route   PATCH /api/v1/earnings/:id/mark-paid
 * @desc    Mark payout as paid
 * @access  Admin only
 * @body    { stripePayoutId?: string, paymentMethod?: string }
 * @note    Usually called automatically by Stripe webhook
 */
router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  TutorEarningsController.markAsPaid
);

/**
 * @route   PATCH /api/v1/earnings/:id/mark-failed
 * @desc    Mark payout as failed
 * @access  Admin only
 * @body    { failureReason: string }
 */
router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(TutorEarningsValidation.markAsFailedZodSchema),
  TutorEarningsController.markAsFailed
);

export const TutorEarningsRoutes = router;
