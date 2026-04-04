export type IDashboardStats = {

  users: {
    totalUsers: number;
    totalStudents: number;
    totalTutors: number;
    totalApplicants: number;
    newUsersThisMonth: number;
    activeStudents: number;
    activeTutors: number;
  };

  applications: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    applicationsThisMonth: number;
  };

  sessions: {
    totalSessions: number;
    completedSessions: number;
    upcomingSessions: number;
    cancelledSessions: number;
    sessionsThisMonth: number;
    totalHoursThisMonth: number;
  };

  revenue: {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingBillings: number;
    totalPlatformCommission: number;
    platformCommissionThisMonth: number;
  };

  subscriptions: {
    totalActiveSubscriptions: number;
    flexiblePlanCount: number;
    regularPlanCount: number;
    longTermPlanCount: number;
  };

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
  months?: string;
  tutorId?: string;
  studentId?: string;
  subscriptionTier?: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
  subject?: string;
};

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
  paymentStatus: string;
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

export type ITransaction = {
  _id: string;
  transactionId: string;
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
