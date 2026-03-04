import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MonthlyBillingController } from './monthlyBilling.controller';
import { MonthlyBillingValidation } from './monthlyBilling.validation';

const router = express.Router();

// ============ STUDENT ROUTES ============

/**
 * @route   GET /api/v1/billings/my-billings
 * @desc    Get student's billing history
 * @access  Student only
 * @query   ?status=PAID&page=1&limit=10&sort=-billingYear,-billingMonth
 */
router.get(
  '/my-billings',
  auth(USER_ROLES.STUDENT),
  MonthlyBillingController.getMyBillings
);

/**
 * @route   GET /api/v1/billings/:id
 * @desc    Get single billing details
 * @access  Student (own billings) or Admin
 */
router.get(
  '/:id',
  auth(USER_ROLES.STUDENT, USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getSingleBilling
);

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
router.post(
  '/generate',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(MonthlyBillingValidation.generateMonthlyBillingZodSchema),
  MonthlyBillingController.generateMonthlyBillings
);

/**
 * @route   GET /api/v1/billings
 * @desc    Get all billings
 * @access  Admin only
 * @query   ?status=PENDING&month=1&year=2024&searchTerm=INV&page=1&limit=10
 */
router.get(
  '/',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.getAllBillings
);

/**
 * @route   PATCH /api/v1/billings/:id/mark-paid
 * @desc    Mark billing as paid
 * @access  Admin only
 * @body    { stripePaymentIntentId?: string, paymentMethod?: string }
 * @note    Usually called automatically by Stripe webhook
 */
router.patch(
  '/:id/mark-paid',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsPaid
);

/**
 * @route   PATCH /api/v1/billings/:id/mark-failed
 * @desc    Mark billing as failed
 * @access  Admin only
 * @body    { failureReason: string }
 */
router.patch(
  '/:id/mark-failed',
  auth(USER_ROLES.SUPER_ADMIN),
  MonthlyBillingController.markAsFailed
);

export const MonthlyBillingRoutes = router;
