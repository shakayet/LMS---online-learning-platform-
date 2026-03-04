import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminService } from './admin.service';

/**
 * Get comprehensive dashboard statistics
 */
const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Dashboard statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get revenue statistics by month
 */
const getRevenueByMonth = catchAsync(async (req: Request, res: Response) => {
  const { year, months } = req.query;
  const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();
  const monthsArray = months
    ? (months as string).split(',').map(m => parseInt(m))
    : undefined;

  const result = await AdminService.getRevenueByMonth(yearNumber, monthsArray);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Revenue statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get popular subjects
 */
const getPopularSubjects = catchAsync(async (req: Request, res: Response) => {
  const { limit } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;

  const result = await AdminService.getPopularSubjects(limitNumber);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Popular subjects retrieved successfully',
    data: result,
  });
});

/**
 * Get top tutors
 */
const getTopTutors = catchAsync(async (req: Request, res: Response) => {
  const { limit, sortBy } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;
  const sortByValue = (sortBy as 'sessions' | 'earnings') || 'sessions';

  const result = await AdminService.getTopTutors(limitNumber, sortByValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Top tutors retrieved successfully',
    data: result,
  });
});

/**
 * Get top students
 */
const getTopStudents = catchAsync(async (req: Request, res: Response) => {
  const { limit, sortBy } = req.query;
  const limitNumber = limit ? parseInt(limit as string) : 10;
  const sortByValue = (sortBy as 'spending' | 'sessions') || 'spending';

  const result = await AdminService.getTopStudents(limitNumber, sortByValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Top students retrieved successfully',
    data: result,
  });
});

/**
 * Get user growth statistics
 */
const getUserGrowth = catchAsync(async (req: Request, res: Response) => {
  const { year, months } = req.query;
  const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();
  const monthsArray = months
    ? (months as string).split(',').map(m => parseInt(m))
    : undefined;

  const result = await AdminService.getUserGrowth(yearNumber, monthsArray);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User growth statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get overview stats with percentage changes
 * Query: ?period=month (day|week|month|quarter|year)
 */
const getOverviewStats = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.query;
  const periodValue = (period as 'day' | 'week' | 'month' | 'quarter' | 'year') || 'month';

  const result = await AdminService.getOverviewStats(periodValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Overview statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get monthly revenue with filters
 * Query: ?year=2024&months=1,2,3&tutorId=xxx&studentId=xxx&subscriptionTier=FLEXIBLE&subject=Math
 */
const getMonthlyRevenue = catchAsync(async (req: Request, res: Response) => {
  const { year, months, tutorId, studentId, subscriptionTier, subject } = req.query;

  const yearNumber = year ? parseInt(year as string) : new Date().getFullYear();
  const monthsArray = months
    ? (months as string).split(',').map(m => parseInt(m.trim()))
    : undefined;

  const filters = {
    tutorId: tutorId as string | undefined,
    studentId: studentId as string | undefined,
    subscriptionTier: subscriptionTier as 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM' | undefined,
    subject: subject as string | undefined,
  };

  // Remove undefined values
  Object.keys(filters).forEach(key => {
    if (filters[key as keyof typeof filters] === undefined) {
      delete filters[key as keyof typeof filters];
    }
  });

  const result = await AdminService.getMonthlyRevenue(
    yearNumber,
    monthsArray,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Monthly revenue statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get user distribution
 * Query: ?groupBy=role (role|status|both)
 */
const getUserDistribution = catchAsync(async (req: Request, res: Response) => {
  const { groupBy } = req.query;
  const groupByValue = (groupBy as 'role' | 'status' | 'both') || 'role';

  const result = await AdminService.getUserDistribution(groupByValue);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User distribution retrieved successfully',
    data: result,
  });
});

/**
 * Get unified sessions (Sessions + Trial Requests)
 * Query: ?page=1&limit=10&status=SCHEDULED&paymentStatus=FREE_TRIAL&isTrial=true&search=john&sortBy=createdAt&sortOrder=desc
 */
const getUnifiedSessions = catchAsync(async (req: Request, res: Response) => {
  const {
    page,
    limit,
    status,
    paymentStatus,
    isTrial,
    search,
    sortBy,
    sortOrder,
  } = req.query;

  const query = {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    status: status as string | undefined,
    paymentStatus: paymentStatus as string | undefined,
    isTrial: isTrial ? isTrial === 'true' : undefined,
    search: search as string | undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
  };

  const result = await AdminService.getUnifiedSessions(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Unified sessions retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * Get session stats for admin dashboard
 */
const getSessionStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getSessionStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session stats retrieved successfully',
    data: result,
  });
});

/**
 * Get application statistics for admin dashboard
 * Returns counts by status
 */
const getApplicationStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getApplicationStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application statistics retrieved successfully',
    data: result,
  });
});

/**
 * Get all transactions (Student Payments + Tutor Payouts)
 * Query: ?page=1&limit=10&type=all&status=PAID&search=john&sortBy=date&sortOrder=desc
 */
const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const {
    page,
    limit,
    type,
    status,
    search,
    sortBy,
    sortOrder,
  } = req.query;

  const query = {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
    type: type as 'STUDENT_PAYMENT' | 'TUTOR_PAYOUT' | 'all' | undefined,
    status: status as string | undefined,
    search: search as string | undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
  };

  const result = await AdminService.getTransactions(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transactions retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * Get transaction statistics
 */
const getTransactionStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getTransactionStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Transaction statistics retrieved successfully',
    data: result,
  });
});

export const AdminController = {
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
