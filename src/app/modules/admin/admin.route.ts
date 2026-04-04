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

router.get(
  '/overview-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.overviewStatsQuerySchema),
  AdminController.getOverviewStats
);

router.get(
  '/monthly-revenue',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.monthlyRevenueQuerySchema),
  AdminController.getMonthlyRevenue
);

router.get(
  '/user-distribution',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(AdminValidation.userDistributionQuerySchema),
  AdminController.getUserDistribution
);

router.get(
  '/dashboard',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardStats
);

router.get(
  '/revenue-by-month',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getRevenueByMonth
);

router.get(
  '/popular-subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getPopularSubjects
);

router.get(
  '/top-tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopTutors
);

router.get(
  '/top-students',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTopStudents
);

router.get(
  '/user-growth',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUserGrowth
);

router.get(
  '/unified-sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getUnifiedSessions
);

router.get(
  '/session-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getSessionStats
);

router.get(
  '/application-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getApplicationStats
);

router.get(
  '/transactions',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactions
);

router.get(
  '/transaction-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getTransactionStats
);

router.get(
  '/recent-activity',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(ActivityLogValidation.recentActivityQuerySchema),
  ActivityLogController.getRecentActivities
);

router.get(
  '/activity-stats',
  auth(USER_ROLES.SUPER_ADMIN),
  ActivityLogController.getActivityStats
);

router.get(
  '/export/users',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportUsers
);

router.get(
  '/export/applications',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportApplications
);

router.get(
  '/export/sessions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSessions
);

router.get(
  '/export/billings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportBillings
);

router.get(
  '/export/earnings',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportEarnings
);

router.get(
  '/export/subscriptions',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportSubscriptions
);

router.get(
  '/export/trial-requests',
  auth(USER_ROLES.SUPER_ADMIN),
  ExportController.exportTrialRequests
);

export const AdminRoutes = router;
