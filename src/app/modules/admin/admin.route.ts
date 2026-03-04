import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AdminController } from './admin.controller';
import { ExportController } from './export.controller';
import { AdminValidation } from './admin.validation';
import { ActivityLogController } from '../activityLog/activityLog.controller';
import { ActivityLogValidation } from '../activityLog/activityLog.validation';

const router = express.Router();

// ============ DASHBOARD & STATISTICS ============

/**
 * @route   GET /api/v1/admin/overview-stats
 * @desc    Get overview stats with percentage changes (Total Revenue, Students, Tutors)
 * @access  Admin only
 * @query   ?period=month (day|week|month|quarter|year)
 */
// ✅ FRONTEND: useOverviewStats | Used in: src/app/(admin)/admin/overview/page.tsx
router.get(
  '/overview-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.overviewStatsQuerySchema),
  AdminController.getOverviewStats
);

/**
 * @route   GET /api/v1/admin/monthly-revenue
 * @desc    Get monthly revenue statistics with advanced filters
 * @access  Admin only
 * @query   ?year=2024&months=1,2,3&tutorId=xxx&studentId=xxx&subscriptionTier=FLEXIBLE&subject=Math
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/monthly-revenue',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.monthlyRevenueQuerySchema),
  AdminController.getMonthlyRevenue
);

/**
 * @route   GET /api/v1/admin/user-distribution
 * @desc    Get user distribution by role and/or status
 * @access  Admin only
 * @query   ?groupBy=role (role|status|both)
 */
// ✅ FRONTEND: useUserDistribution | Used in: src/app/(admin)/admin/overview/page.tsx
router.get(
  '/user-distribution',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.userDistributionQuerySchema),
  AdminController.getUserDistribution
);

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get comprehensive dashboard statistics
 * @access  Admin only
 * @returns User stats, application stats, session stats, revenue stats, subscription stats
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/dashboard',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardStats
);

/**
 * @route   GET /api/v1/admin/revenue-by-month
 * @desc    Get revenue statistics by month
 * @access  Admin only
 * @query   ?year=2024&months=1,2,3 (optional, defaults to current year, all months)
 */
// ✅ FRONTEND: useRevenueByMonth | Used in: src/app/(admin)/admin/overview/page.tsx
router.get(
  '/revenue-by-month',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueByMonth
);

/**
 * @route   GET /api/v1/admin/popular-subjects
 * @desc    Get most popular subjects by session count
 * @access  Admin only
 * @query   ?limit=10 (default: 10)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/popular-subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getPopularSubjects
);

/**
 * @route   GET /api/v1/admin/top-tutors
 * @desc    Get top tutors by sessions or earnings
 * @access  Admin only
 * @query   ?limit=10&sortBy=sessions (sortBy: sessions|earnings, default: sessions)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/top-tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopTutors
);

/**
 * @route   GET /api/v1/admin/top-students
 * @desc    Get top students by spending or sessions
 * @access  Admin only
 * @query   ?limit=10&sortBy=spending (sortBy: spending|sessions, default: spending)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/top-students',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopStudents
);

/**
 * @route   GET /api/v1/admin/user-growth
 * @desc    Get user growth statistics by month
 * @access  Admin only
 * @query   ?year=2024&months=1,2,3 (optional, defaults to current year, all months)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/user-growth',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUserGrowth
);

// ============ UNIFIED SESSIONS ============

/**
 * @route   GET /api/v1/admin/unified-sessions
 * @desc    Get unified view of sessions and trial requests
 * @access  Admin only
 * @query   ?page=1&limit=10&status=SCHEDULED&paymentStatus=FREE_TRIAL&isTrial=true&search=john&sortBy=createdAt&sortOrder=desc
 */
// ✅ FRONTEND: useUnifiedSessions | Used in: src/app/(admin)/admin/session/page.tsx
router.get(
  '/unified-sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUnifiedSessions
);

/**
 * @route   GET /api/v1/admin/session-stats
 * @desc    Get session statistics
 * @access  Admin only
 */
// ✅ FRONTEND: useSessionStats | Used in: src/app/(admin)/admin/session/page.tsx
router.get(
  '/session-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getSessionStats
);

/**
 * @route   GET /api/v1/admin/application-stats
 * @desc    Get application statistics by status
 * @access  Admin only
 * @returns { total, pending, interview, approved, rejected, revision }
 */
// ✅ FRONTEND: useApplicationStats | Used in: src/app/(admin)/admin/application/page.tsx
router.get(
  '/application-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getApplicationStats
);

// ============ TRANSACTIONS ============

/**
 * @route   GET /api/v1/admin/transactions
 * @desc    Get all transactions (Student Payments + Tutor Payouts)
 * @access  Admin only
 * @query   ?page=1&limit=10&type=all&status=PAID&search=john&sortBy=date&sortOrder=desc
 */
// ✅ FRONTEND: useTransactions | Used in: src/app/(admin)/admin/transaction/page.tsx
router.get(
  '/transactions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactions
);

/**
 * @route   GET /api/v1/admin/transaction-stats
 * @desc    Get transaction statistics (totals for student payments and tutor payouts)
 * @access  Admin only
 */
// ✅ FRONTEND: useTransactionStats | Used in: src/app/(admin)/admin/transaction/page.tsx
router.get(
  '/transaction-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactionStats
);

// ============ ACTIVITY LOG ============

/**
 * @route   GET /api/v1/admin/recent-activity
 * @desc    Get recent platform activities
 * @access  Admin only
 * @query   ?page=1&limit=10&actionType=USER_REGISTERED&status=success&startDate=2024-01-01&endDate=2024-12-31
 */
// ✅ FRONTEND: useRecentActivity | Used in: src/app/(admin)/admin/overview/page.tsx
router.get(
  '/recent-activity',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(ActivityLogValidation.recentActivityQuerySchema),
  ActivityLogController.getRecentActivities
);

/**
 * @route   GET /api/v1/admin/activity-stats
 * @desc    Get activity statistics
 * @access  Admin only
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/activity-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  ActivityLogController.getActivityStats
);

// ============ CSV EXPORT ============

/**
 * @route   GET /api/v1/admin/export/users
 * @desc    Export users to CSV
 * @access  Admin only
 * @query   ?role=STUDENT (optional: filter by role)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/users',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportUsers
);

/**
 * @route   GET /api/v1/admin/export/applications
 * @desc    Export tutor applications to CSV
 * @access  Admin only
 * @query   ?status=SUBMITTED (optional: filter by status)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/applications',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportApplications
);

/**
 * @route   GET /api/v1/admin/export/sessions
 * @desc    Export sessions to CSV
 * @access  Admin only
 * @query   ?status=COMPLETED&startDate=2024-01-01&endDate=2024-12-31
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSessions
);

/**
 * @route   GET /api/v1/admin/export/billings
 * @desc    Export monthly billings to CSV
 * @access  Admin only
 * @query   ?status=PAID&year=2024&month=1
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/billings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportBillings
);

/**
 * @route   GET /api/v1/admin/export/earnings
 * @desc    Export tutor earnings to CSV
 * @access  Admin only
 * @query   ?status=PAID&year=2024&month=1
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/earnings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportEarnings
);

/**
 * @route   GET /api/v1/admin/export/subscriptions
 * @desc    Export subscriptions to CSV
 * @access  Admin only
 * @query   ?status=ACTIVE (optional: filter by status)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/subscriptions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSubscriptions
);

/**
 * @route   GET /api/v1/admin/export/trial-requests
 * @desc    Export trial requests to CSV
 * @access  Admin only
 * @query   ?status=PENDING (optional: filter by status)
 */
// ❌ NOT INTEGRATED IN FRONTEND
router.get(
  '/export/trial-requests',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportTrialRequests
);

export const AdminRoutes = router;
