"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const mongoose_1 = require("mongoose");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const tutorApplication_interface_1 = require("../tutorApplication/tutorApplication.interface");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const monthlyBilling_model_1 = require("../monthlyBilling/monthlyBilling.model");
const monthlyBilling_interface_1 = require("../monthlyBilling/monthlyBilling.interface");
const tutorEarnings_model_1 = require("../tutorEarnings/tutorEarnings.model");
const studentSubscription_model_1 = require("../studentSubscription/studentSubscription.model");
const studentSubscription_interface_1 = require("../studentSubscription/studentSubscription.interface");
const AggregationBuilder_1 = __importDefault(require("../../builder/AggregationBuilder"));
const trialRequest_model_1 = require("../trialRequest/trialRequest.model");
const trialRequest_interface_1 = require("../trialRequest/trialRequest.interface");
const tutorEarnings_interface_1 = require("../tutorEarnings/tutorEarnings.interface");
/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // User Statistics
    const [totalUsers, totalStudents, totalTutors, totalApplicants, newUsersThisMonth, activeStudentsCount, activeTutorsCount,] = yield Promise.all([
        user_model_1.User.countDocuments(),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.STUDENT }),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.TUTOR }),
        user_model_1.User.countDocuments({ role: user_1.USER_ROLES.APPLICANT }),
        user_model_1.User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
        studentSubscription_model_1.StudentSubscription.countDocuments({ status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE }),
        session_model_1.Session.distinct('tutorId', {
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }).then(ids => ids.length),
    ]);
    // Application Statistics
    const [totalApplications, pendingApplications, approvedApplications, rejectedApplications, applicationsThisMonth,] = yield Promise.all([
        tutorApplication_model_1.TutorApplication.countDocuments(),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.APPROVED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REJECTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    ]);
    // Session Statistics
    const [totalSessions, completedSessions, upcomingSessions, cancelledSessions, sessionsThisMonth,] = yield Promise.all([
        session_model_1.Session.countDocuments(),
        session_model_1.Session.countDocuments({ status: session_interface_1.SESSION_STATUS.COMPLETED }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
            startTime: { $gte: now },
        }),
        session_model_1.Session.countDocuments({ status: session_interface_1.SESSION_STATUS.CANCELLED }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }),
    ]);
    // Total hours this month
    const sessionsThisMonthData = yield session_model_1.Session.find({
        status: session_interface_1.SESSION_STATUS.COMPLETED,
        completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    });
    const totalHoursThisMonth = sessionsThisMonthData.reduce((sum, session) => sum + session.duration / 60, 0);
    // Financial Statistics
    const [allBillings, billingsThisMonth, pendingBillingsCount] = yield Promise.all([
        monthlyBilling_model_1.MonthlyBilling.find({ status: monthlyBilling_interface_1.BILLING_STATUS.PAID }),
        monthlyBilling_model_1.MonthlyBilling.find({
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
            paidAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
        }),
        monthlyBilling_model_1.MonthlyBilling.countDocuments({ status: monthlyBilling_interface_1.BILLING_STATUS.PENDING }),
    ]);
    const totalRevenue = allBillings.reduce((sum, billing) => sum + billing.total, 0);
    const revenueThisMonth = billingsThisMonth.reduce((sum, billing) => sum + billing.total, 0);
    // Last month revenue
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const billingsLastMonth = yield monthlyBilling_model_1.MonthlyBilling.find({
        status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        paidAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
    });
    const revenueLastMonth = billingsLastMonth.reduce((sum, billing) => sum + billing.total, 0);
    // Platform commission
    const allEarnings = yield tutorEarnings_model_1.TutorEarnings.find({});
    const totalPlatformCommission = allEarnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
    const earningsThisMonth = yield tutorEarnings_model_1.TutorEarnings.find({
        payoutMonth: now.getMonth() + 1,
        payoutYear: now.getFullYear(),
    });
    const platformCommissionThisMonth = earningsThisMonth.reduce((sum, earning) => sum + earning.platformCommission, 0);
    // Subscription Statistics
    const activeSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    const flexiblePlanCount = activeSubscriptions.filter(sub => sub.tier === 'FLEXIBLE').length;
    const regularPlanCount = activeSubscriptions.filter(sub => sub.tier === 'REGULAR').length;
    const longTermPlanCount = activeSubscriptions.filter(sub => sub.tier === 'LONG_TERM').length;
    // Recent Activity (last 30 days)
    const [newStudents, newTutors, newApplications, recentCompletedSessions] = yield Promise.all([
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.STUDENT,
            createdAt: { $gte: thirtyDaysAgo },
        }),
        user_model_1.User.countDocuments({
            role: user_1.USER_ROLES.TUTOR,
            createdAt: { $gte: thirtyDaysAgo },
        }),
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: thirtyDaysAgo },
        }),
    ]);
    return {
        users: {
            totalUsers,
            totalStudents,
            totalTutors,
            totalApplicants,
            newUsersThisMonth,
            activeStudents: activeStudentsCount,
            activeTutors: activeTutorsCount,
        },
        applications: {
            totalApplications,
            pendingApplications,
            approvedApplications,
            rejectedApplications,
            applicationsThisMonth,
        },
        sessions: {
            totalSessions,
            completedSessions,
            upcomingSessions,
            cancelledSessions,
            sessionsThisMonth,
            totalHoursThisMonth,
        },
        revenue: {
            totalRevenue,
            revenueThisMonth,
            revenueLastMonth,
            pendingBillings: pendingBillingsCount,
            totalPlatformCommission,
            platformCommissionThisMonth,
        },
        subscriptions: {
            totalActiveSubscriptions: activeSubscriptions.length,
            flexiblePlanCount,
            regularPlanCount,
            longTermPlanCount,
        },
        recentActivity: {
            newStudents,
            newTutors,
            newApplications,
            completedSessions: recentCompletedSessions,
        },
    };
});
/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = (year, months) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const billings = yield monthlyBilling_model_1.MonthlyBilling.find({
            billingYear: year,
            billingMonth: month,
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        });
        const earnings = yield tutorEarnings_model_1.TutorEarnings.find({
            payoutYear: year,
            payoutMonth: month,
        });
        const sessions = yield session_model_1.Session.countDocuments({
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: {
                $gte: new Date(year, month - 1, 1),
                $lte: new Date(year, month, 0, 23, 59, 59),
            },
        });
        const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
        const totalCommission = earnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
        const totalPayouts = earnings.reduce((sum, earning) => sum + earning.netEarnings, 0);
        stats.push({
            month,
            year,
            totalRevenue,
            totalCommission,
            totalPayouts,
            netProfit: totalCommission,
            sessionCount: sessions,
        });
    }
    return stats;
});
/**
 * Get popular subjects by session count
 */
const getPopularSubjects = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10) {
    const result = yield session_model_1.Session.aggregate([
        { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
        {
            $group: {
                _id: '$subject',
                sessionCount: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
            },
        },
        { $sort: { sessionCount: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                subject: '$_id',
                sessionCount: 1,
                totalRevenue: 1,
            },
        },
    ]);
    return result;
});
/**
 * Get top tutors by session count or earnings
 */
const getTopTutors = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10, sortBy = 'sessions') {
    if (sortBy === 'sessions') {
        const result = yield session_model_1.Session.aggregate([
            { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
            {
                $group: {
                    _id: '$tutorId',
                    totalSessions: { $sum: 1 },
                    totalEarnings: { $sum: '$totalPrice' },
                    subjects: { $addToSet: '$subject' },
                },
            },
            { $sort: { totalSessions: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tutor',
                },
            },
            { $unwind: '$tutor' },
            {
                $project: {
                    _id: 0,
                    tutorId: '$_id',
                    tutorName: '$tutor.name',
                    tutorEmail: '$tutor.email',
                    totalSessions: 1,
                    totalEarnings: 1,
                    subjects: 1,
                },
            },
        ]);
        return result;
    }
    else {
        const result = yield tutorEarnings_model_1.TutorEarnings.aggregate([
            {
                $group: {
                    _id: '$tutorId',
                    totalEarnings: { $sum: '$netEarnings' },
                    totalSessions: { $sum: '$totalSessions' },
                },
            },
            { $sort: { totalEarnings: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'tutor',
                },
            },
            { $unwind: '$tutor' },
            {
                $project: {
                    _id: 0,
                    tutorId: '$_id',
                    tutorName: '$tutor.name',
                    tutorEmail: '$tutor.email',
                    totalSessions: 1,
                    totalEarnings: 1,
                    subjects: [],
                },
            },
        ]);
        return result;
    }
});
/**
 * Get top students by spending or sessions
 */
const getTopStudents = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10, sortBy = 'spending') {
    if (sortBy === 'spending') {
        const result = yield monthlyBilling_model_1.MonthlyBilling.aggregate([
            { $match: { status: monthlyBilling_interface_1.BILLING_STATUS.PAID } },
            {
                $group: {
                    _id: '$studentId',
                    totalSpent: { $sum: '$total' },
                    totalSessions: { $sum: '$totalSessions' },
                },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student',
                },
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'studentsubscriptions',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'subscription',
                },
            },
            {
                $project: {
                    _id: 0,
                    studentId: '$_id',
                    studentName: '$student.name',
                    studentEmail: '$student.email',
                    totalSpent: 1,
                    totalSessions: 1,
                    subscriptionTier: {
                        $ifNull: [{ $arrayElemAt: ['$subscription.tier', 0] }, 'N/A'],
                    },
                },
            },
        ]);
        return result;
    }
    else {
        const result = yield session_model_1.Session.aggregate([
            { $match: { status: session_interface_1.SESSION_STATUS.COMPLETED } },
            {
                $group: {
                    _id: '$studentId',
                    totalSessions: { $sum: 1 },
                    totalSpent: { $sum: '$totalPrice' },
                },
            },
            { $sort: { totalSessions: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student',
                },
            },
            { $unwind: '$student' },
            {
                $lookup: {
                    from: 'studentsubscriptions',
                    localField: '_id',
                    foreignField: 'studentId',
                    as: 'subscription',
                },
            },
            {
                $project: {
                    _id: 0,
                    studentId: '$_id',
                    studentName: '$student.name',
                    studentEmail: '$student.email',
                    totalSessions: 1,
                    totalSpent: 1,
                    subscriptionTier: {
                        $ifNull: [{ $arrayElemAt: ['$subscription.tier', 0] }, 'N/A'],
                    },
                },
            },
        ]);
        return result;
    }
});
/**
 * Get user growth statistics (monthly new users)
 */
const getUserGrowth = (year, months) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const [totalUsers, students, tutors, applicants] = yield Promise.all([
            user_model_1.User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.STUDENT,
                createdAt: { $gte: startDate, $lte: endDate },
            }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.TUTOR,
                createdAt: { $gte: startDate, $lte: endDate },
            }),
            user_model_1.User.countDocuments({
                role: user_1.USER_ROLES.APPLICANT,
                createdAt: { $gte: startDate, $lte: endDate },
            }),
        ]);
        stats.push({
            month,
            year,
            totalUsers,
            students,
            tutors,
            applicants,
        });
    }
    return stats;
});
/**
 * Get overview stats with percentage changes
 * Returns Total Revenue, Total Students, Total Tutors with growth metrics
 */
const getOverviewStats = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (period = 'month') {
    const [revenue, students, tutors] = yield Promise.all([
        // Revenue from MonthlyBilling (sum of 'total' field)
        new AggregationBuilder_1.default(monthlyBilling_model_1.MonthlyBilling).calculateGrowth({
            sumField: 'total',
            filter: { status: monthlyBilling_interface_1.BILLING_STATUS.PAID },
            period,
        }),
        // Students count
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.STUDENT },
            period,
        }),
        // Tutors count
        new AggregationBuilder_1.default(user_model_1.User).calculateGrowth({
            filter: { role: user_1.USER_ROLES.TUTOR },
            period,
        }),
    ]);
    return { revenue, students, tutors };
});
/**
 * Get monthly revenue with advanced filters
 */
const getMonthlyRevenue = (year, months, filters) => __awaiter(void 0, void 0, void 0, function* () {
    const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const stats = [];
    for (const month of targetMonths) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        // Build session filter
        const sessionFilter = {
            status: session_interface_1.SESSION_STATUS.COMPLETED,
            completedAt: { $gte: startDate, $lte: endDate },
        };
        if (filters === null || filters === void 0 ? void 0 : filters.tutorId) {
            sessionFilter.tutorId = new mongoose_1.Types.ObjectId(filters.tutorId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.studentId) {
            sessionFilter.studentId = new mongoose_1.Types.ObjectId(filters.studentId);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.subject) {
            sessionFilter.subject = filters.subject;
        }
        // Get sessions with filters
        const sessions = yield session_model_1.Session.find(sessionFilter);
        // Calculate session stats
        const sessionCount = sessions.length;
        const totalHours = sessions.reduce((sum, s) => sum + s.duration / 60, 0);
        const sessionRevenue = sessions.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        const averageSessionPrice = sessionCount > 0 ? sessionRevenue / sessionCount : 0;
        // Build billing filter
        const billingFilter = {
            billingYear: year,
            billingMonth: month,
            status: monthlyBilling_interface_1.BILLING_STATUS.PAID,
        };
        if (filters === null || filters === void 0 ? void 0 : filters.studentId) {
            billingFilter.studentId = new mongoose_1.Types.ObjectId(filters.studentId);
        }
        // Get billings with tier filter if needed
        let billings = yield monthlyBilling_model_1.MonthlyBilling.find(billingFilter).populate('studentId');
        // Filter by subscription tier if provided
        if (filters === null || filters === void 0 ? void 0 : filters.subscriptionTier) {
            const studentsWithTier = yield studentSubscription_model_1.StudentSubscription.find({
                tier: filters.subscriptionTier,
                status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
            }).distinct('studentId');
            billings = billings.filter(billing => studentsWithTier.some(studentId => { var _a; return studentId.toString() === ((_a = billing.studentId) === null || _a === void 0 ? void 0 : _a.toString()); }));
        }
        const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
        // Get earnings for commission/payout calculation
        const earningsFilter = {
            payoutYear: year,
            payoutMonth: month,
        };
        if (filters === null || filters === void 0 ? void 0 : filters.tutorId) {
            earningsFilter.tutorId = new mongoose_1.Types.ObjectId(filters.tutorId);
        }
        const earnings = yield tutorEarnings_model_1.TutorEarnings.find(earningsFilter);
        const totalCommission = earnings.reduce((sum, earning) => sum + earning.platformCommission, 0);
        const totalPayouts = earnings.reduce((sum, earning) => sum + earning.netEarnings, 0);
        stats.push({
            month,
            year,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalCommission: Math.round(totalCommission * 100) / 100,
            totalPayouts: Math.round(totalPayouts * 100) / 100,
            netProfit: Math.round(totalCommission * 100) / 100,
            sessionCount,
            totalHours: Math.round(totalHours * 100) / 100,
            averageSessionPrice: Math.round(averageSessionPrice * 100) / 100,
        });
    }
    return stats;
});
/**
 * Get user distribution by role and/or status
 */
const getUserDistribution = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (groupBy = 'role') {
    const total = yield user_model_1.User.countDocuments();
    const result = { total };
    if (groupBy === 'role' || groupBy === 'both') {
        const byRole = yield user_model_1.User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            {
                $project: {
                    _id: 0,
                    role: '$_id',
                    count: 1,
                    percentage: {
                        $round: [{ $multiply: [{ $divide: ['$count', total] }, 100] }, 2],
                    },
                },
            },
            { $sort: { count: -1 } },
        ]);
        result.byRole = byRole;
    }
    if (groupBy === 'status' || groupBy === 'both') {
        const byStatus = yield user_model_1.User.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1,
                    percentage: {
                        $round: [{ $multiply: [{ $divide: ['$count', total] }, 100] }, 2],
                    },
                },
            },
            { $sort: { count: -1 } },
        ]);
        result.byStatus = byStatus;
    }
    return result;
});
/**
 * Get unified sessions (Sessions + Trial Requests)
 * Merges both sessions and pending trial requests into a single view
 */
const getUnifiedSessions = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, status, paymentStatus, isTrial, search, sortBy = 'createdAt', sortOrder = 'desc', } = query;
    // Get all sessions with populated fields
    const sessions = yield session_model_1.Session.find()
        .populate('studentId', 'name email phone profilePicture')
        .populate('tutorId', 'name email phone profilePicture')
        .populate({
        path: 'trialRequestId',
        select: 'subject',
        populate: {
            path: 'subject',
            select: 'name',
        },
    })
        .lean();
    // Get trialRequestIds that already have sessions created (to avoid duplicates)
    // Note: trialRequestId is now populated, so we need to get _id from the object
    const trialRequestIdsWithSessions = sessions
        .filter((s) => s.trialRequestId)
        .map((s) => { var _a; return ((_a = s.trialRequestId._id) === null || _a === void 0 ? void 0 : _a.toString()) || s.trialRequestId.toString(); });
    // Get pending/accepted trial requests (excluding those that already have sessions)
    const pendingTrialRequests = yield trialRequest_model_1.TrialRequest.find(Object.assign({ status: { $in: [trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING, trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED] } }, (trialRequestIdsWithSessions.length > 0 && {
        _id: { $nin: trialRequestIdsWithSessions },
    })))
        .populate('studentId', 'name email phone profilePicture')
        .populate('acceptedTutorId', 'name email phone profilePicture')
        .populate('subject', 'name')
        .lean();
    // Transform sessions to unified format
    const unifiedSessions = sessions.map((s) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return ({
            _id: s._id.toString(),
            type: 'SESSION',
            studentName: (_a = s.studentId) === null || _a === void 0 ? void 0 : _a.name,
            studentEmail: (_b = s.studentId) === null || _b === void 0 ? void 0 : _b.email,
            studentPhone: (_c = s.studentId) === null || _c === void 0 ? void 0 : _c.phone,
            tutorName: (_d = s.tutorId) === null || _d === void 0 ? void 0 : _d.name,
            tutorEmail: (_e = s.tutorId) === null || _e === void 0 ? void 0 : _e.email,
            tutorPhone: (_f = s.tutorId) === null || _f === void 0 ? void 0 : _f.phone,
            // Use trialRequest subject if session subject is generic "Tutoring Session"
            subject: (s.subject === 'Tutoring Session' && ((_h = (_g = s.trialRequestId) === null || _g === void 0 ? void 0 : _g.subject) === null || _h === void 0 ? void 0 : _h.name))
                ? s.trialRequestId.subject.name
                : s.subject,
            status: s.status,
            paymentStatus: s.isTrial ? 'FREE_TRIAL' : s.paymentStatus || session_interface_1.PAYMENT_STATUS.PENDING,
            startTime: s.startTime,
            endTime: s.endTime,
            createdAt: s.createdAt,
            isTrial: s.isTrial || false,
            description: s.description,
            totalPrice: s.totalPrice,
        });
    });
    // Transform trial requests to unified format
    const unifiedTrialRequests = pendingTrialRequests.map((tr) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        return ({
            _id: tr._id.toString(),
            type: 'TRIAL_REQUEST',
            studentName: ((_a = tr.studentInfo) === null || _a === void 0 ? void 0 : _a.name) || ((_b = tr.studentId) === null || _b === void 0 ? void 0 : _b.name),
            studentEmail: ((_c = tr.studentInfo) === null || _c === void 0 ? void 0 : _c.email) || ((_e = (_d = tr.studentInfo) === null || _d === void 0 ? void 0 : _d.guardianInfo) === null || _e === void 0 ? void 0 : _e.email) || ((_f = tr.studentId) === null || _f === void 0 ? void 0 : _f.email),
            studentPhone: ((_h = (_g = tr.studentInfo) === null || _g === void 0 ? void 0 : _g.guardianInfo) === null || _h === void 0 ? void 0 : _h.phone) || ((_j = tr.studentId) === null || _j === void 0 ? void 0 : _j.phone),
            tutorName: ((_k = tr.acceptedTutorId) === null || _k === void 0 ? void 0 : _k.name) || 'Pending Tutor',
            tutorEmail: (_l = tr.acceptedTutorId) === null || _l === void 0 ? void 0 : _l.email,
            tutorPhone: (_m = tr.acceptedTutorId) === null || _m === void 0 ? void 0 : _m.phone,
            subject: ((_o = tr.subject) === null || _o === void 0 ? void 0 : _o.name) || 'Unknown Subject',
            status: tr.status,
            paymentStatus: 'FREE_TRIAL',
            startTime: tr.preferredDateTime,
            endTime: undefined,
            createdAt: tr.createdAt,
            isTrial: true,
            description: tr.description,
            totalPrice: 0,
        });
    });
    // Merge all items
    let unified = [...unifiedSessions, ...unifiedTrialRequests];
    // Apply filters
    if (status) {
        unified = unified.filter(item => item.status === status);
    }
    if (paymentStatus) {
        unified = unified.filter(item => item.paymentStatus === paymentStatus);
    }
    if (isTrial !== undefined) {
        unified = unified.filter(item => item.isTrial === isTrial);
    }
    if (search) {
        const searchLower = search.toLowerCase();
        unified = unified.filter(item => {
            var _a, _b, _c, _d;
            return ((_a = item.studentName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                ((_b = item.studentEmail) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                ((_c = item.tutorName) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower)) ||
                ((_d = item.subject) === null || _d === void 0 ? void 0 : _d.toLowerCase().includes(searchLower));
        });
    }
    // Sort
    unified.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (aValue === undefined || aValue === null)
            return 1;
        if (bValue === undefined || bValue === null)
            return -1;
        if (aValue instanceof Date && bValue instanceof Date) {
            return sortOrder === 'desc'
                ? bValue.getTime() - aValue.getTime()
                : aValue.getTime() - bValue.getTime();
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'desc'
                ? bValue.localeCompare(aValue)
                : aValue.localeCompare(bValue);
        }
        return 0;
    });
    // Pagination
    const total = unified.length;
    const totalPage = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = unified.slice(startIndex, startIndex + limit);
    return {
        data: paginatedData,
        meta: {
            page,
            limit,
            total,
            totalPage,
        },
    };
});
/**
 * Get session stats for admin dashboard
 * Includes both Session records and TrialRequest records for accurate counts
 */
const getSessionStats = () => __awaiter(void 0, void 0, void 0, function* () {
    // Get trial request IDs that already have sessions created (to avoid double counting)
    const trialRequestIdsWithSessions = yield session_model_1.Session.distinct('trialRequestId', {
        trialRequestId: { $ne: null },
    });
    const [
    // Session counts
    sessionTotal, sessionPending, sessionCompleted, sessionTrial, 
    // TrialRequest counts (ONLY those WITHOUT sessions - to avoid double counting)
    trialRequestPending, trialRequestAccepted,] = yield Promise.all([
        // Sessions
        session_model_1.Session.countDocuments(),
        session_model_1.Session.countDocuments({
            status: { $in: [session_interface_1.SESSION_STATUS.SCHEDULED, session_interface_1.SESSION_STATUS.STARTING_SOON, session_interface_1.SESSION_STATUS.AWAITING_RESPONSE] },
        }),
        session_model_1.Session.countDocuments({ status: session_interface_1.SESSION_STATUS.COMPLETED }),
        session_model_1.Session.countDocuments({ isTrial: true }),
        // TrialRequests (pending = not yet matched with tutor, excluding those with sessions)
        trialRequest_model_1.TrialRequest.countDocuments(Object.assign({ status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING }, (trialRequestIdsWithSessions.length > 0 && {
            _id: { $nin: trialRequestIdsWithSessions },
        }))),
        // TrialRequests (accepted = matched but session not yet created/scheduled, excluding those with sessions)
        trialRequest_model_1.TrialRequest.countDocuments(Object.assign({ status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.ACCEPTED }, (trialRequestIdsWithSessions.length > 0 && {
            _id: { $nin: trialRequestIdsWithSessions },
        }))),
    ]);
    // Total = Sessions + Pending/Accepted TrialRequests (without sessions)
    const totalSessions = sessionTotal + trialRequestPending + trialRequestAccepted;
    // Pending = Session pending + TrialRequest pending/accepted (without sessions)
    const pendingSessions = sessionPending + trialRequestPending + trialRequestAccepted;
    // Completed = Only completed sessions
    const completedSessions = sessionCompleted;
    // Trial = Session trials + TrialRequests (without sessions)
    const trialSessions = sessionTrial + trialRequestPending + trialRequestAccepted;
    return {
        totalSessions,
        pendingSessions,
        completedSessions,
        trialSessions,
    };
});
/**
 * Get application statistics for admin dashboard
 * Returns counts by status with growth metrics (current month vs last month)
 */
const getApplicationStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    // Get total counts
    const [total, pending, interview, approved, rejected, revision] = yield Promise.all([
        tutorApplication_model_1.TutorApplication.countDocuments(),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.APPROVED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REJECTED }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REVISION }),
    ]);
    // Get this month counts
    const [totalThisMonth, pendingThisMonth, interviewThisMonth, approvedThisMonth, rejectedThisMonth, revisionThisMonth,] = yield Promise.all([
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED, createdAt: { $gte: firstDayOfMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW, selectedForInterviewAt: { $gte: firstDayOfMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.APPROVED, approvedAt: { $gte: firstDayOfMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REJECTED, rejectedAt: { $gte: firstDayOfMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REVISION, revisionRequestedAt: { $gte: firstDayOfMonth } }),
    ]);
    // Get last month counts
    const [totalLastMonth, pendingLastMonth, interviewLastMonth, approvedLastMonth, rejectedLastMonth, revisionLastMonth,] = yield Promise.all([
        tutorApplication_model_1.TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SUBMITTED, createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW, selectedForInterviewAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.APPROVED, approvedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REJECTED, rejectedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
        tutorApplication_model_1.TutorApplication.countDocuments({ status: tutorApplication_interface_1.APPLICATION_STATUS.REVISION, revisionRequestedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    ]);
    // Calculate growth helper
    const calculateGrowth = (current, previous) => {
        if (previous === 0) {
            return {
                growth: current > 0 ? 100 : 0,
                growthType: current > 0 ? 'increase' : 'no_change',
            };
        }
        const growth = ((current - previous) / previous) * 100;
        return {
            growth: Math.round(growth * 10) / 10,
            growthType: growth > 0 ? 'increase' : growth < 0 ? 'decrease' : 'no_change',
        };
    };
    return {
        total: Object.assign({ count: total }, calculateGrowth(totalThisMonth, totalLastMonth)),
        pending: Object.assign({ count: pending }, calculateGrowth(pendingThisMonth, pendingLastMonth)),
        interview: Object.assign({ count: interview }, calculateGrowth(interviewThisMonth, interviewLastMonth)),
        approved: Object.assign({ count: approved }, calculateGrowth(approvedThisMonth, approvedLastMonth)),
        rejected: Object.assign({ count: rejected }, calculateGrowth(rejectedThisMonth, rejectedLastMonth)),
        revision: Object.assign({ count: revision }, calculateGrowth(revisionThisMonth, revisionLastMonth)),
    };
});
/**
 * Get all transactions (Student Payments + Tutor Payouts + Subscription Purchases)
 * Combines MonthlyBilling (student payments), TutorEarnings (tutor payouts), and StudentSubscription (subscription purchases)
 */
const getTransactions = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = 1, limit = 10, type = 'all', status, search, sortBy = 'date', sortOrder = 'desc', } = query;
    const transactions = [];
    // Get Student Payments (MonthlyBilling)
    if (type === 'all' || type === 'STUDENT_PAYMENT') {
        const billings = yield monthlyBilling_model_1.MonthlyBilling.find()
            .populate('studentId', 'name email')
            .lean();
        billings.forEach((billing) => {
            var _a, _b;
            transactions.push({
                _id: billing._id.toString(),
                transactionId: billing.invoiceNumber,
                type: 'STUDENT_PAYMENT',
                amount: billing.total,
                userName: ((_a = billing.studentId) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                userEmail: ((_b = billing.studentId) === null || _b === void 0 ? void 0 : _b.email) || '',
                userType: 'student',
                status: billing.status,
                date: billing.paidAt || billing.createdAt,
                description: `Invoice for ${billing.billingMonth}/${billing.billingYear}`,
                sessions: billing.totalSessions,
                hours: billing.totalHours,
            });
        });
        // Get All Subscription Purchases
        const subscriptions = yield studentSubscription_model_1.StudentSubscription.find()
            .populate('studentId', 'name email')
            .lean();
        subscriptions.forEach((sub) => {
            var _a, _b;
            // Calculate subscription value based on tier
            let subscriptionAmount = 0;
            let tierName = '';
            let description = '';
            if (sub.tier === 'FLEXIBLE') {
                tierName = 'Flexible';
                subscriptionAmount = 0; // Pay as you go - no upfront
                description = 'Flexible Plan Activation (Pay per session)';
            }
            else if (sub.tier === 'REGULAR') {
                tierName = 'Regular';
                subscriptionAmount = sub.pricePerHour * sub.minimumHours; // €28 * 4 = €112
                description = `${tierName} Subscription (${sub.minimumHours}hrs @ €${sub.pricePerHour}/hr)`;
            }
            else if (sub.tier === 'LONG_TERM') {
                tierName = 'Long-term';
                subscriptionAmount = sub.pricePerHour * sub.minimumHours * sub.commitmentMonths; // €25 * 4 * 3 = €300
                description = `${tierName} Subscription (${sub.commitmentMonths} months)`;
            }
            // Generate a subscription reference
            const subDate = new Date(sub.createdAt);
            const subRef = `SUB-${subDate.getFullYear().toString().slice(-2)}${(subDate.getMonth() + 1).toString().padStart(2, '0')}-${sub._id.toString().slice(-6).toUpperCase()}`;
            transactions.push({
                _id: sub._id.toString(),
                transactionId: subRef,
                type: 'STUDENT_PAYMENT',
                amount: subscriptionAmount,
                userName: ((_a = sub.studentId) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                userEmail: ((_b = sub.studentId) === null || _b === void 0 ? void 0 : _b.email) || '',
                userType: 'student',
                status: sub.status === 'ACTIVE' ? 'PAID' : sub.status === 'PENDING' ? 'PENDING' : 'PAID',
                date: sub.paidAt || sub.createdAt,
                description,
            });
        });
    }
    // Get Tutor Payouts (TutorEarnings)
    if (type === 'all' || type === 'TUTOR_PAYOUT') {
        const earnings = yield tutorEarnings_model_1.TutorEarnings.find()
            .populate('tutorId', 'name email')
            .lean();
        earnings.forEach((earning) => {
            var _a, _b;
            transactions.push({
                _id: earning._id.toString(),
                transactionId: earning.payoutReference,
                type: 'TUTOR_PAYOUT',
                amount: earning.netEarnings,
                userName: ((_a = earning.tutorId) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
                userEmail: ((_b = earning.tutorId) === null || _b === void 0 ? void 0 : _b.email) || '',
                userType: 'tutor',
                status: earning.status,
                date: earning.paidAt || earning.createdAt,
                description: `Payout for ${earning.payoutMonth}/${earning.payoutYear}`,
                sessions: earning.totalSessions,
                hours: earning.totalHours,
            });
        });
    }
    // Apply filters
    let filtered = transactions;
    if (status) {
        filtered = filtered.filter(t => t.status === status);
    }
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(t => {
            var _a, _b, _c;
            return ((_a = t.transactionId) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchLower)) ||
                ((_b = t.userName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(searchLower)) ||
                ((_c = t.userEmail) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchLower));
        });
    }
    // Sort
    filtered.sort((a, b) => {
        const aValue = sortBy === 'date' ? new Date(a.date).getTime() : a.amount;
        const bValue = sortBy === 'date' ? new Date(b.date).getTime() : b.amount;
        return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    // Pagination
    const total = filtered.length;
    const totalPage = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);
    return {
        data: paginatedData,
        meta: {
            page,
            limit,
            total,
            totalPage,
        },
    };
});
/**
 * Get transaction statistics
 */
const getTransactionStats = () => __awaiter(void 0, void 0, void 0, function* () {
    // Student payments (paid billings)
    const paidBillings = yield monthlyBilling_model_1.MonthlyBilling.find({ status: monthlyBilling_interface_1.BILLING_STATUS.PAID });
    const billingPaymentsTotal = paidBillings.reduce((sum, b) => sum + b.total, 0);
    // All subscription purchases
    const allSubscriptions = yield studentSubscription_model_1.StudentSubscription.find({
        status: studentSubscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
    let subscriptionPaymentsTotal = 0;
    allSubscriptions.forEach((sub) => {
        if (sub.tier === 'REGULAR') {
            subscriptionPaymentsTotal += sub.pricePerHour * sub.minimumHours;
        }
        else if (sub.tier === 'LONG_TERM') {
            subscriptionPaymentsTotal += sub.pricePerHour * sub.minimumHours * sub.commitmentMonths;
        }
        // FLEXIBLE = 0, no upfront payment
    });
    const studentPaymentsTotal = billingPaymentsTotal + subscriptionPaymentsTotal;
    const studentPaymentsCount = paidBillings.length + allSubscriptions.length;
    // Tutor payouts (paid earnings)
    const paidEarnings = yield tutorEarnings_model_1.TutorEarnings.find({ status: tutorEarnings_interface_1.PAYOUT_STATUS.PAID });
    const tutorPayoutsTotal = paidEarnings.reduce((sum, e) => sum + e.netEarnings, 0);
    // All billings, subscriptions and earnings count
    const allBillingsCount = yield monthlyBilling_model_1.MonthlyBilling.countDocuments();
    const allSubscriptionsCount = yield studentSubscription_model_1.StudentSubscription.countDocuments();
    const allEarningsCount = yield tutorEarnings_model_1.TutorEarnings.countDocuments();
    return {
        totalTransactions: allBillingsCount + allSubscriptionsCount + allEarningsCount,
        totalAmount: studentPaymentsTotal + tutorPayoutsTotal,
        studentPayments: {
            count: studentPaymentsCount,
            total: studentPaymentsTotal,
        },
        tutorPayouts: {
            count: paidEarnings.length,
            total: tutorPayoutsTotal,
        },
    };
});
exports.AdminService = {
    getDashboardStats,
    getRevenueByMonth,
    getPopularSubjects,
    getTopTutors,
    getTopStudents,
    getUserGrowth,
    getOverviewStats,
    getMonthlyRevenue,
    getUserDistribution,
    getUnifiedSessions,
    getSessionStats,
    getApplicationStats,
    getTransactions,
    getTransactionStats,
};
