import { ActivityLog } from './activityLog.model';
import {
  IActivityLogCreate,
  IActivityLogQuery,
  IActivityLogResponse,
} from './activityLog.interface';

// Log a new activity
const logActivity = async (data: IActivityLogCreate): Promise<void> => {
  try {
    await ActivityLog.create({
      userId: data.userId,
      actionType: data.actionType,
      title: data.title,
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata || {},
      status: data.status || 'success',
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break main flow
    console.error('Failed to log activity:', error);
  }
};

// Get recent activities with pagination and filters
const getRecentActivities = async (
  query: IActivityLogQuery
): Promise<{
  data: IActivityLogResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 10, 100); // Max 100
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, unknown> = {};

  if (query.actionType) {
    const actionTypes = query.actionType.split(',');
    filter.actionType = { $in: actionTypes };
  }

  if (query.status) {
    const statuses = query.status.split(',');
    filter.status = { $in: statuses };
  }

  if (query.entityType) {
    filter.entityType = query.entityType;
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(
        query.startDate
      );
    }
    if (query.endDate) {
      (filter.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
    }
  }

  // Get total count
  const total = await ActivityLog.countDocuments(filter);

  // Get activities with user population
  const activities = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email profilePicture')
    .lean();

  // Transform response
  const data: IActivityLogResponse[] = activities.map(activity => {
    const user = activity.userId as unknown as {
      _id: string;
      name?: string;
      profilePicture?: string;
    } | null;
    return {
      _id: String(activity._id),
      userId: user ? String(user._id) : undefined,
      userName: user?.name,
      userAvatar: user?.profilePicture,
      actionType: activity.actionType,
      title: activity.title,
      description: activity.description,
      entityType: activity.entityType,
      entityId: activity.entityId ? String(activity.entityId) : undefined,
      status: activity.status,
      createdAt: activity.createdAt?.toISOString() || new Date().toISOString(),
    };
  });

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

// Get activity statistics
const getActivityStats = async (): Promise<{
  totalActivities: number;
  activitiesByType: Record<string, number>;
  activitiesToday: number;
}> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalActivities, activitiesToday, byType] = await Promise.all([
    ActivityLog.countDocuments(),
    ActivityLog.countDocuments({ createdAt: { $gte: today } }),
    ActivityLog.aggregate([
      { $group: { _id: '$actionType', count: { $sum: 1 } } },
    ]),
  ]);

  const activitiesByType: Record<string, number> = {};
  byType.forEach(item => {
    activitiesByType[item._id] = item.count;
  });

  return {
    totalActivities,
    activitiesByType,
    activitiesToday,
  };
};

export const ActivityLogService = {
  logActivity,
  getRecentActivities,
  getActivityStats,
};
