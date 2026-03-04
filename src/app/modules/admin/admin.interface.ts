export type IDashboardStats = {
  // User Statistics
  users: {
    totalUsers: number;
    totalStudents: number;
    totalTutors: number;
    totalApplicants: number;
    newUsersThisMonth: number;
    activeStudents: number; // Students with active subscriptions
    activeTutors: number; // Tutors with sessions this month
  };

  // Application Statistics
  applications: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    applicationsThisMonth: number;
  };

  // Session Statistics
  sessions: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    cancelledSessions: number;
    sessionsThisMonth: number;
    totalHoursThisMonth: number;
  };

  // Financial Statistics
  revenue: {
    totalRevenue: number; // All-time
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingBillings: number;
    totalPlatformCommission: number; // All-time
    platformCommissionThisMonth: number;
  };

  // Subscription Statistics
  subscriptions: {
    totalActiveSubscriptions: number;
    flexiblePlanCount: number;
    regularPlanCount: number;
    longTermPlanCount: number;
  };

  // Recent Activity (last 30 days)
  recentActivity: {
    newStudents: number;
    newTutors: number;
    newApplications: number;
    completedSessions: number;
  };
};

export type IRevenueStats = {
  month: number;
  year: number;
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  netProfit: number;
  sessionCount: number;
};

export type IPopularSubject = {
  subject: string;
  sessionCount: number;
  totalRevenue: number;
  averageRating?: number;
};

export type ITopTutor = {
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  totalSessions: number;
  totalEarnings: number;
  averageRating?: number;
  subjects: string[];
};

export type ITopStudent = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalSessions: number;
  totalSpent: number;
  subscriptionTier: string;
};

// ============ OVERVIEW STATS ============

export type IStatistic = {
  total: number;
  thisPeriodCount: number;
  lastPeriodCount: number;
  growth: number;
  formattedGrowth: string;
  growthType: 'increase' | 'decrease' | 'no_change';
};

export type IOverviewStats = {
  revenue: IStatistic;
  students: IStatistic;
  tutors: IStatistic;
};

export type IOverviewStatsQuery = {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
};

// ============ MONTHLY REVENUE ============

export type IMonthlyRevenue = {
  month: number;
  year: number;
  totalRevenue: number;
  totalCommission: number;
  totalPayouts: number;
  netProfit: number;
  sessionCount: number;
  totalHours: number;
  averageSessionPrice: number;
};

export type IMonthlyRevenueQuery = {
  year?: number;
  months?: string; // comma-separated e.g. "1,2,3"
  tutorId?: string;
  studentId?: string;
  subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
  subject?: string;
};

// ============ USER DISTRIBUTION ============

export type IRoleDistribution = {
  role: string;
  count: number;
  percentage: number;
};

export type IStatusDistribution = {
  status: string;
  count: number;
  percentage: number;
};

export type IUserDistribution = {
  total: number;
  byRole?: IRoleDistribution[];
  byStatus?: IStatusDistribution[];
};

export type IUserDistributionQuery = {
  groupBy?: 'role' | 'status' | 'both';
};

// ============ UNIFIED SESSIONS ============

export type IUnifiedSession = {
  _id: string;
  type: 'SESSION' | 'TRIAL_REQUEST';
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  tutorName?: string;
  tutorEmail?: string;
  tutorPhone?: string;
  subject: string;
  status: string;
  paymentStatus: string; // 'FREE_TRIAL' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  isTrial: boolean;
  description?: string;
  totalPrice?: number;
};

export type IUnifiedSessionsQuery = {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  isTrial?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

// ============ TRANSACTIONS ============

export type ITransaction = {
  _id: string;
  transactionId: string; // Invoice number or Payout reference
  type: 'STUDENT_PAYMENT' | 'TUTOR_PAYOUT';
  amount: number;
  userName: string;
  userEmail: string;
  userType: 'student' | 'tutor';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PROCESSING';
  date: Date;
  description: string;
  sessions?: number;
  hours?: number;
};

export type ITransactionsQuery = {
  page?: number;
  limit?: number;
  type?: 'STUDENT_PAYMENT' | 'TUTOR_PAYOUT' | 'all';
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ITransactionStats = {
  totalTransactions: number;
  totalAmount: number;
  studentPayments: {
    count: number;
    total: number;
  };
  tutorPayouts: {
    count: number;
    total: number;
  };
};
