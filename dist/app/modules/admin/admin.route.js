"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const admin_controller_1 = require("./admin.controller");
const export_controller_1 = require("./export.controller");
const admin_validation_1 = require("./admin.validation");
const activityLog_controller_1 = require("../activityLog/activityLog.controller");
const activityLog_validation_1 = require("../activityLog/activityLog.validation");
const router = express_1.default.Router();

router.get('/overview-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.overviewStatsQuerySchema), admin_controller_1.AdminController.getOverviewStats);

router.get('/monthly-revenue', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.monthlyRevenueQuerySchema), admin_controller_1.AdminController.getMonthlyRevenue);

router.get('/user-distribution', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(admin_validation_1.AdminValidation.userDistributionQuerySchema), admin_controller_1.AdminController.getUserDistribution);

router.get('/dashboard', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getDashboardStats);

router.get('/revenue-by-month', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getRevenueByMonth);

router.get('/popular-subjects', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getPopularSubjects);

router.get('/top-tutors', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTopTutors);

router.get('/top-students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTopStudents);

router.get('/user-growth', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getUserGrowth);

router.get('/unified-sessions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getUnifiedSessions);

router.get('/session-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getSessionStats);

router.get('/application-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getApplicationStats);

router.get('/transactions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTransactions);

router.get('/transaction-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), admin_controller_1.AdminController.getTransactionStats);

router.get('/recent-activity', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(activityLog_validation_1.ActivityLogValidation.recentActivityQuerySchema), activityLog_controller_1.ActivityLogController.getRecentActivities);

router.get('/activity-stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), activityLog_controller_1.ActivityLogController.getActivityStats);

router.get('/export/users', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportUsers);

router.get('/export/applications', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportApplications);

router.get('/export/sessions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportSessions);

router.get('/export/billings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportBillings);

router.get('/export/earnings', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportEarnings);

router.get('/export/subscriptions', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportSubscriptions);

router.get('/export/trial-requests', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), export_controller_1.ExportController.exportTrialRequests);
exports.AdminRoutes = router;
