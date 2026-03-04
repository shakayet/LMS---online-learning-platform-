import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ActivityLogService } from './activityLog.service';

// Get recent activities (Admin only)
const getRecentActivities = catchAsync(async (req: Request, res: Response) => {
  const result = await ActivityLogService.getRecentActivities(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Recent activities retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get activity statistics (Admin only)
const getActivityStats = catchAsync(async (req: Request, res: Response) => {
  const result = await ActivityLogService.getActivityStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Activity statistics retrieved successfully',
    data: result,
  });
});

export const ActivityLogController = {
  getRecentActivities,
  getActivityStats,
};
