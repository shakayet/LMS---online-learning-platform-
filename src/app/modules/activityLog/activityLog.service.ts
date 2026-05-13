import { ActivityLog } from './activityLog.model';
import QueryBuilder from '../../builder/QueryBuilder';
import {
  IActivityLogCreate,
  IActivityLogQuery,
  IActivityLogResponse,
} from './activityLog.interface';

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
    console.error('Failed to log activity:', error);
  }
};

const getRecentActivities = async (
  query: Record<string, unknown>,
): Promise<{
  data: IActivityLogResponse[];
  pagination: any;
}> => {
  const activityQuery = new QueryBuilder(
    ActivityLog.find().populate('userId', 'name email profilePicture'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const activities = await activityQuery.modelQuery.lean();
  const pagination = await activityQuery.getPaginationInfo();

  const data: IActivityLogResponse[] = (activities as any[]).map(activity => {
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
    pagination: pagination,
  };
};

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
