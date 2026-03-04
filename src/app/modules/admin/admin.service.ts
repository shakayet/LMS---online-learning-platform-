import { Types } from 'mongoose';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { TutorApplication } from '../tutorApplication/tutorApplication.model';
import { APPLICATION_STATUS } from '../tutorApplication/tutorApplication.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS, PAYMENT_STATUS } from '../session/session.interface';
import { MonthlyBilling } from '../monthlyBilling/monthlyBilling.model';
import { BILLING_STATUS } from '../monthlyBilling/monthlyBilling.interface';
import { TutorEarnings } from '../tutorEarnings/tutorEarnings.model';
import { StudentSubscription } from '../studentSubscription/studentSubscription.model';
import { SUBSCRIPTION_STATUS } from '../studentSubscription/studentSubscription.interface';
import AggregationBuilder from '../../builder/AggregationBuilder';
import { TrialRequest } from '../trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../trialRequest/trialRequest.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  IDashboardStats,
  IRevenueStats,
  IPopularSubject,
  ITopTutor,
  ITopStudent,
  IOverviewStats,
  IMonthlyRevenue,
  IUserDistribution,
  IUnifiedSession,
  IUnifiedSessionsQuery,
  ITransaction,
  ITransactionsQuery,
  ITransactionStats,
} from './admin.interface';
import { PAYOUT_STATUS } from '../tutorEarnings/tutorEarnings.interface';

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = async (): Promise<IDashboardStats> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // User Statistics
  const [
    totalUsers,
    totalStudents,
    totalTutors,
    totalApplicants,
    newUsersThisMonth,
    activeStudentsCount,
    activeTutorsCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: USER_ROLES.STUDENT }),
    User.countDocuments({ role: USER_ROLES.TUTOR }),
    User.countDocuments({ role: USER_ROLES.APPLICANT }),
    User.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    StudentSubscription.countDocuments({ status: SUBSCRIPTION_STATUS.ACTIVE }),
    Session.distinct('tutorId', {
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }).then(ids => ids.length),
  ]);

  // Application Statistics
  const [
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    applicationsThisMonth,
  ] = await Promise.all([
    TutorApplication.countDocuments(),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SUBMITTED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED }),
    TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
  ]);

  // Session Statistics
  const [
    totalSessions,
    completedSessions,
    upcomingSessions,
    cancelledSessions,
    sessionsThisMonth,
  ] = await Promise.all([
    Session.countDocuments(),
    Session.countDocuments({ status: SESSION_STATUS.COMPLETED }),
    Session.countDocuments({
      status: SESSION_STATUS.SCHEDULED,
      startTime: { $gte: now },
    }),
    Session.countDocuments({ status: SESSION_STATUS.CANCELLED }),
    Session.countDocuments({
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }),
  ]);

  // Total hours this month
  const sessionsThisMonthData = await Session.find({
    status: SESSION_STATUS.COMPLETED,
    completedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
  });
  const totalHoursThisMonth = sessionsThisMonthData.reduce(
    (sum, session) => sum + session.duration / 60,
    0
  );

  // Financial Statistics
  const [allBillings, billingsThisMonth, pendingBillingsCount] = await Promise.all([
    MonthlyBilling.find({ status: BILLING_STATUS.PAID }),
    MonthlyBilling.find({
      status: BILLING_STATUS.PAID,
      paidAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
    }),
    MonthlyBilling.countDocuments({ status: BILLING_STATUS.PENDING }),
  ]);

  const totalRevenue = allBillings.reduce((sum, billing) => sum + billing.total, 0);
  const revenueThisMonth = billingsThisMonth.reduce(
    (sum, billing) => sum + billing.total,
    0
  );

  // Last month revenue
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const billingsLastMonth = await MonthlyBilling.find({
    status: BILLING_STATUS.PAID,
    paidAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth },
  });
  const revenueLastMonth = billingsLastMonth.reduce(
    (sum, billing) => sum + billing.total,
    0
  );

  // Platform commission
  const allEarnings = await TutorEarnings.find({});
  const totalPlatformCommission = allEarnings.reduce(
    (sum, earning) => sum + earning.platformCommission,
    0
  );

  const earningsThisMonth = await TutorEarnings.find({
    payoutMonth: now.getMonth() + 1,
    payoutYear: now.getFullYear(),
  });
  const platformCommissionThisMonth = earningsThisMonth.reduce(
    (sum, earning) => sum + earning.platformCommission,
    0
  );

  // Subscription Statistics
  const activeSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  const flexiblePlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'FLEXIBLE'
  ).length;
  const regularPlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'REGULAR'
  ).length;
  const longTermPlanCount = activeSubscriptions.filter(
    sub => sub.tier === 'LONG_TERM'
  ).length;

  // Recent Activity (last 30 days)
  const [newStudents, newTutors, newApplications, recentCompletedSessions] =
    await Promise.all([
      User.countDocuments({
        role: USER_ROLES.STUDENT,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      User.countDocuments({
        role: USER_ROLES.TUTOR,
        createdAt: { $gte: thirtyDaysAgo },
      }),
      TutorApplication.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Session.countDocuments({
        status: SESSION_STATUS.COMPLETED,
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
};

/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = async (
  year: number,
  months?: number[]
): Promise<IRevenueStats[]> => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats: IRevenueStats[] = [];

  for (const month of targetMonths) {
    const billings = await MonthlyBilling.find({
      billingYear: year,
      billingMonth: month,
      status: BILLING_STATUS.PAID,
    });

    const earnings = await TutorEarnings.find({
      payoutYear: year,
      payoutMonth: month,
    });

    const sessions = await Session.countDocuments({
      status: SESSION_STATUS.COMPLETED,
      completedAt: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      },
    });

    const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);
    const totalCommission = earnings.reduce(
      (sum, earning) => sum + earning.platformCommission,
      0
    );
    const totalPayouts = earnings.reduce(
      (sum, earning) => sum + earning.netEarnings,
      0
    );

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
};

/**
 * Get popular subjects by session count
 */
const getPopularSubjects = async (limit: number = 10): Promise<IPopularSubject[]> => {
  const result = await Session.aggregate([
    { $match: { status: SESSION_STATUS.COMPLETED } },
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
};

/**
 * Get top tutors by session count or earnings
 */
const getTopTutors = async (
  limit: number = 10,
  sortBy: 'sessions' | 'earnings' = 'sessions'
): Promise<ITopTutor[]> => {
  if (sortBy === 'sessions') {
    const result = await Session.aggregate([
      { $match: { status: SESSION_STATUS.COMPLETED } },
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
  } else {
    const result = await TutorEarnings.aggregate([
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
};

/**
 * Get top students by spending or sessions
 */
const getTopStudents = async (
  limit: number = 10,
  sortBy: 'spending' | 'sessions' = 'spending'
): Promise<ITopStudent[]> => {
  if (sortBy === 'spending') {
    const result = await MonthlyBilling.aggregate([
      { $match: { status: BILLING_STATUS.PAID } },
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
  } else {
    const result = await Session.aggregate([
      { $match: { status: SESSION_STATUS.COMPLETED } },
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
};

/**
 * Get user growth statistics (monthly new users)
 */
const getUserGrowth = async (year: number, months?: number[]) => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats = [];

  for (const month of targetMonths) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [totalUsers, students, tutors, applicants] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({
        role: USER_ROLES.STUDENT,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      User.countDocuments({
        role: USER_ROLES.TUTOR,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      User.countDocuments({
        role: USER_ROLES.APPLICANT,
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
};

/**
 * Get overview stats with percentage changes
 * Returns Total Revenue, Total Students, Total Tutors with growth metrics
 */
const getOverviewStats = async (
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<IOverviewStats> => {
  const [revenue, students, tutors] = await Promise.all([
    // Revenue from MonthlyBilling (sum of 'total' field)
    new AggregationBuilder(MonthlyBilling).calculateGrowth({
      sumField: 'total',
      filter: { status: BILLING_STATUS.PAID },
      period,
    }),
    // Students count
    new AggregationBuilder(User).calculateGrowth({
      filter: { role: USER_ROLES.STUDENT },
      period,
    }),
    // Tutors count
    new AggregationBuilder(User).calculateGrowth({
      filter: { role: USER_ROLES.TUTOR },
      period,
    }),
  ]);

  return { revenue, students, tutors };
};

/**
 * Get monthly revenue with advanced filters
 */
const getMonthlyRevenue = async (
  year: number,
  months?: number[],
  filters?: {
    tutorId?: string;
    studentId?: string;
    subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
    subject?: string;
  }
): Promise<IMonthlyRevenue[]> => {
  const targetMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const stats: IMonthlyRevenue[] = [];

  for (const month of targetMonths) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Build session filter
    const sessionFilter: Record<string, unknown> = {
      status: SESSION_STATUS.COMPLETED,
      completedAt: { $gte: startDate, $lte: endDate },
    };

    if (filters?.tutorId) {
      sessionFilter.tutorId = new Types.ObjectId(filters.tutorId);
    }
    if (filters?.studentId) {
      sessionFilter.studentId = new Types.ObjectId(filters.studentId);
    }
    if (filters?.subject) {
      sessionFilter.subject = filters.subject;
    }

    // Get sessions with filters
    const sessions = await Session.find(sessionFilter);

    // Calculate session stats
    const sessionCount = sessions.length;
    const totalHours = sessions.reduce((sum, s) => sum + s.duration / 60, 0);
    const sessionRevenue = sessions.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    const averageSessionPrice = sessionCount > 0 ? sessionRevenue / sessionCount : 0;

    // Build billing filter
    const billingFilter: Record<string, unknown> = {
      billingYear: year,
      billingMonth: month,
      status: BILLING_STATUS.PAID,
    };

    if (filters?.studentId) {
      billingFilter.studentId = new Types.ObjectId(filters.studentId);
    }

    // Get billings with tier filter if needed
    let billings = await MonthlyBilling.find(billingFilter).populate('studentId');

    // Filter by subscription tier if provided
    if (filters?.subscriptionTier) {
      const studentsWithTier = await StudentSubscription.find({
        tier: filters.subscriptionTier,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      }).distinct('studentId');

      billings = billings.filter(billing =>
        studentsWithTier.some(
          studentId => studentId.toString() === billing.studentId?.toString()
        )
      );
    }

    const totalRevenue = billings.reduce((sum, billing) => sum + billing.total, 0);

    // Get earnings for commission/payout calculation
    const earningsFilter: Record<string, unknown> = {
      payoutYear: year,
      payoutMonth: month,
    };

    if (filters?.tutorId) {
      earningsFilter.tutorId = new Types.ObjectId(filters.tutorId);
    }

    const earnings = await TutorEarnings.find(earningsFilter);

    const totalCommission = earnings.reduce(
      (sum, earning) => sum + earning.platformCommission,
      0
    );
    const totalPayouts = earnings.reduce(
      (sum, earning) => sum + earning.netEarnings,
      0
    );

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
};

/**
 * Get user distribution by role and/or status
 */
const getUserDistribution = async (
  groupBy: 'role' | 'status' | 'both' = 'role'
): Promise<IUserDistribution> => {
  const total = await User.countDocuments();

  const result: IUserDistribution = { total };

  if (groupBy === 'role' || groupBy === 'both') {
    const byRole = await User.aggregate([
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
    const byStatus = await User.aggregate([
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
};

/**
 * Get unified sessions (Sessions + Trial Requests)
 * Merges both sessions and pending trial requests into a single view
 */
const getUnifiedSessions = async (
  query: IUnifiedSessionsQuery
): Promise<{
  data: IUnifiedSession[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    isTrial,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Get all sessions with populated fields
  const sessions = await Session.find()
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
    .filter((s: any) => s.trialRequestId)
    .map((s: any) => s.trialRequestId._id?.toString() || s.trialRequestId.toString());

  // Get pending/accepted trial requests (excluding those that already have sessions)
  const pendingTrialRequests = await TrialRequest.find({
    status: { $in: [TRIAL_REQUEST_STATUS.PENDING, TRIAL_REQUEST_STATUS.ACCEPTED] },
    ...(trialRequestIdsWithSessions.length > 0 && {
      _id: { $nin: trialRequestIdsWithSessions },
    }),
  })
    .populate('studentId', 'name email phone profilePicture')
    .populate('acceptedTutorId', 'name email phone profilePicture')
    .populate('subject', 'name')
    .lean();

  // Transform sessions to unified format
  const unifiedSessions: IUnifiedSession[] = sessions.map((s: any) => ({
    _id: s._id.toString(),
    type: 'SESSION' as const,
    studentName: s.studentId?.name,
    studentEmail: s.studentId?.email,
    studentPhone: s.studentId?.phone,
    tutorName: s.tutorId?.name,
    tutorEmail: s.tutorId?.email,
    tutorPhone: s.tutorId?.phone,
    // Use trialRequest subject if session subject is generic "Tutoring Session"
    subject: (s.subject === 'Tutoring Session' && s.trialRequestId?.subject?.name)
      ? s.trialRequestId.subject.name
      : s.subject,
    status: s.status,
    paymentStatus: s.isTrial ? 'FREE_TRIAL' : s.paymentStatus || PAYMENT_STATUS.PENDING,
    startTime: s.startTime,
    endTime: s.endTime,
    createdAt: s.createdAt,
    isTrial: s.isTrial || false,
    description: s.description,
    totalPrice: s.totalPrice,
  }));

  // Transform trial requests to unified format
  const unifiedTrialRequests: IUnifiedSession[] = pendingTrialRequests.map((tr: any) => ({
    _id: tr._id.toString(),
    type: 'TRIAL_REQUEST' as const,
    studentName: tr.studentInfo?.name || tr.studentId?.name,
    studentEmail: tr.studentInfo?.email || tr.studentInfo?.guardianInfo?.email || tr.studentId?.email,
    studentPhone: tr.studentInfo?.guardianInfo?.phone || tr.studentId?.phone,
    tutorName: tr.acceptedTutorId?.name || 'Pending Tutor',
    tutorEmail: tr.acceptedTutorId?.email,
    tutorPhone: tr.acceptedTutorId?.phone,
    subject: tr.subject?.name || 'Unknown Subject',
    status: tr.status,
    paymentStatus: 'FREE_TRIAL',
    startTime: tr.preferredDateTime,
    endTime: undefined,
    createdAt: tr.createdAt,
    isTrial: true,
    description: tr.description,
    totalPrice: 0,
  }));

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
    unified = unified.filter(
      item =>
        item.studentName?.toLowerCase().includes(searchLower) ||
        item.studentEmail?.toLowerCase().includes(searchLower) ||
        item.tutorName?.toLowerCase().includes(searchLower) ||
        item.subject?.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  unified.sort((a, b) => {
    const aValue = a[sortBy as keyof IUnifiedSession];
    const bValue = b[sortBy as keyof IUnifiedSession];

    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;

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
};

/**
 * Get session stats for admin dashboard
 * Includes both Session records and TrialRequest records for accurate counts
 */
const getSessionStats = async (): Promise<{
  totalSessions: number;
  pendingSessions: number;
  completedSessions: number;
  trialSessions: number;
}> => {
  // Get trial request IDs that already have sessions created (to avoid double counting)
  const trialRequestIdsWithSessions = await Session.distinct('trialRequestId', {
    trialRequestId: { $ne: null },
  });

  const [
    // Session counts
    sessionTotal,
    sessionPending,
    sessionCompleted,
    sessionTrial,
    // TrialRequest counts (ONLY those WITHOUT sessions - to avoid double counting)
    trialRequestPending,
    trialRequestAccepted,
  ] = await Promise.all([
    // Sessions
    Session.countDocuments(),
    Session.countDocuments({
      status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON, SESSION_STATUS.AWAITING_RESPONSE] },
    }),
    Session.countDocuments({ status: SESSION_STATUS.COMPLETED }),
    Session.countDocuments({ isTrial: true }),
    // TrialRequests (pending = not yet matched with tutor, excluding those with sessions)
    TrialRequest.countDocuments({
      status: TRIAL_REQUEST_STATUS.PENDING,
      ...(trialRequestIdsWithSessions.length > 0 && {
        _id: { $nin: trialRequestIdsWithSessions },
      }),
    }),
    // TrialRequests (accepted = matched but session not yet created/scheduled, excluding those with sessions)
    TrialRequest.countDocuments({
      status: TRIAL_REQUEST_STATUS.ACCEPTED,
      ...(trialRequestIdsWithSessions.length > 0 && {
        _id: { $nin: trialRequestIdsWithSessions },
      }),
    }),
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
};

/**
 * Get application statistics for admin dashboard
 * Returns counts by status with growth metrics (current month vs last month)
 */
const getApplicationStats = async (): Promise<{
  total: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
  pending: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
  interview: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
  approved: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
  rejected: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
  revision: { count: number; growth: number; growthType: 'increase' | 'decrease' | 'no_change' };
}> => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // Get total counts
  const [total, pending, interview, approved, rejected, revision] = await Promise.all([
    TutorApplication.countDocuments(),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SUBMITTED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SELECTED_FOR_INTERVIEW }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REVISION }),
  ]);

  // Get this month counts
  const [
    totalThisMonth,
    pendingThisMonth,
    interviewThisMonth,
    approvedThisMonth,
    rejectedThisMonth,
    revisionThisMonth,
  ] = await Promise.all([
    TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SUBMITTED, createdAt: { $gte: firstDayOfMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SELECTED_FOR_INTERVIEW, selectedForInterviewAt: { $gte: firstDayOfMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED, approvedAt: { $gte: firstDayOfMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED, rejectedAt: { $gte: firstDayOfMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REVISION, revisionRequestedAt: { $gte: firstDayOfMonth } }),
  ]);

  // Get last month counts
  const [
    totalLastMonth,
    pendingLastMonth,
    interviewLastMonth,
    approvedLastMonth,
    rejectedLastMonth,
    revisionLastMonth,
  ] = await Promise.all([
    TutorApplication.countDocuments({ createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SUBMITTED, createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.SELECTED_FOR_INTERVIEW, selectedForInterviewAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.APPROVED, approvedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REJECTED, rejectedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
    TutorApplication.countDocuments({ status: APPLICATION_STATUS.REVISION, revisionRequestedAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth } }),
  ]);

  // Calculate growth helper
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) {
      return {
        growth: current > 0 ? 100 : 0,
        growthType: current > 0 ? 'increase' as const : 'no_change' as const,
      };
    }
    const growth = ((current - previous) / previous) * 100;
    return {
      growth: Math.round(growth * 10) / 10,
      growthType: growth > 0 ? 'increase' as const : growth < 0 ? 'decrease' as const : 'no_change' as const,
    };
  };

  return {
    total: { count: total, ...calculateGrowth(totalThisMonth, totalLastMonth) },
    pending: { count: pending, ...calculateGrowth(pendingThisMonth, pendingLastMonth) },
    interview: { count: interview, ...calculateGrowth(interviewThisMonth, interviewLastMonth) },
    approved: { count: approved, ...calculateGrowth(approvedThisMonth, approvedLastMonth) },
    rejected: { count: rejected, ...calculateGrowth(rejectedThisMonth, rejectedLastMonth) },
    revision: { count: revision, ...calculateGrowth(revisionThisMonth, revisionLastMonth) },
  };
};

/**
 * Get all transactions (Student Payments + Tutor Payouts + Subscription Purchases)
 * Combines MonthlyBilling (student payments), TutorEarnings (tutor payouts), and StudentSubscription (subscription purchases)
 */
const getTransactions = async (
  query: ITransactionsQuery
): Promise<{
  data: ITransaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const {
    page = 1,
    limit = 10,
    type = 'all',
    status,
    search,
    sortBy = 'date',
    sortOrder = 'desc',
  } = query;

  const transactions: ITransaction[] = [];

  // Get Student Payments (MonthlyBilling)
  if (type === 'all' || type === 'STUDENT_PAYMENT') {
    const billings = await MonthlyBilling.find()
      .populate('studentId', 'name email')
      .lean();

    billings.forEach((billing: any) => {
      transactions.push({
        _id: billing._id.toString(),
        transactionId: billing.invoiceNumber,
        type: 'STUDENT_PAYMENT',
        amount: billing.total,
        userName: billing.studentId?.name || 'Unknown',
        userEmail: billing.studentId?.email || '',
        userType: 'student',
        status: billing.status as any,
        date: billing.paidAt || billing.createdAt,
        description: `Invoice for ${billing.billingMonth}/${billing.billingYear}`,
        sessions: billing.totalSessions,
        hours: billing.totalHours,
      });
    });

    // Get All Subscription Purchases
    const subscriptions = await StudentSubscription.find()
      .populate('studentId', 'name email')
      .lean();

    subscriptions.forEach((sub: any) => {
      // Calculate subscription value based on tier
      let subscriptionAmount = 0;
      let tierName = '';
      let description = '';

      if (sub.tier === 'FLEXIBLE') {
        tierName = 'Flexible';
        subscriptionAmount = 0; // Pay as you go - no upfront
        description = 'Flexible Plan Activation (Pay per session)';
      } else if (sub.tier === 'REGULAR') {
        tierName = 'Regular';
        subscriptionAmount = sub.pricePerHour * sub.minimumHours; // €28 * 4 = €112
        description = `${tierName} Subscription (${sub.minimumHours}hrs @ €${sub.pricePerHour}/hr)`;
      } else if (sub.tier === 'LONG_TERM') {
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
        userName: sub.studentId?.name || 'Unknown',
        userEmail: sub.studentId?.email || '',
        userType: 'student',
        status: sub.status === 'ACTIVE' ? 'PAID' : sub.status === 'PENDING' ? 'PENDING' : 'PAID',
        date: sub.paidAt || sub.createdAt,
        description,
      });
    });
  }

  // Get Tutor Payouts (TutorEarnings)
  if (type === 'all' || type === 'TUTOR_PAYOUT') {
    const earnings = await TutorEarnings.find()
      .populate('tutorId', 'name email')
      .lean();

    earnings.forEach((earning: any) => {
      transactions.push({
        _id: earning._id.toString(),
        transactionId: earning.payoutReference,
        type: 'TUTOR_PAYOUT',
        amount: earning.netEarnings,
        userName: earning.tutorId?.name || 'Unknown',
        userEmail: earning.tutorId?.email || '',
        userType: 'tutor',
        status: earning.status as any,
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
    filtered = filtered.filter(
      t =>
        t.transactionId?.toLowerCase().includes(searchLower) ||
        t.userName?.toLowerCase().includes(searchLower) ||
        t.userEmail?.toLowerCase().includes(searchLower)
    );
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
};

/**
 * Get transaction statistics
 */
const getTransactionStats = async (): Promise<ITransactionStats> => {
  // Student payments (paid billings)
  const paidBillings = await MonthlyBilling.find({ status: BILLING_STATUS.PAID });
  const billingPaymentsTotal = paidBillings.reduce((sum, b) => sum + b.total, 0);

  // All subscription purchases
  const allSubscriptions = await StudentSubscription.find({
    status: SUBSCRIPTION_STATUS.ACTIVE,
  });

  let subscriptionPaymentsTotal = 0;
  allSubscriptions.forEach((sub: any) => {
    if (sub.tier === 'REGULAR') {
      subscriptionPaymentsTotal += sub.pricePerHour * sub.minimumHours;
    } else if (sub.tier === 'LONG_TERM') {
      subscriptionPaymentsTotal += sub.pricePerHour * sub.minimumHours * sub.commitmentMonths;
    }
    // FLEXIBLE = 0, no upfront payment
  });

  const studentPaymentsTotal = billingPaymentsTotal + subscriptionPaymentsTotal;
  const studentPaymentsCount = paidBillings.length + allSubscriptions.length;

  // Tutor payouts (paid earnings)
  const paidEarnings = await TutorEarnings.find({ status: PAYOUT_STATUS.PAID });
  const tutorPayoutsTotal = paidEarnings.reduce((sum, e) => sum + e.netEarnings, 0);

  // All billings, subscriptions and earnings count
  const allBillingsCount = await MonthlyBilling.countDocuments();
  const allSubscriptionsCount = await StudentSubscription.countDocuments();
  const allEarningsCount = await TutorEarnings.countDocuments();

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
};

export const AdminService = {
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
