import { JwtPayload } from 'jsonwebtoken';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import QueryBuilder from '../../builder/QueryBuilder';

const getNotificationFromDB = async (
  user: JwtPayload,
  query: Record<string, unknown>
) => {

  const notificationQuery = new QueryBuilder<INotification>(
    Notification.find({ receiver: user.id }),
    query
  )
    .search(['title', 'text'])
    .filter()
    .dateFilter()
    .sort()
    .paginate()
    .fields();

  const { data, pagination } = await notificationQuery.getFilteredResults();

  const unreadCount = await Notification.countDocuments({
    receiver: user.id,
    isRead: false,
  });

  return {
    data,
    pagination,
    unreadCount,
  };
};

const markNotificationAsReadIntoDB = async (
  notificationId: string,
  userId: string
) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, receiver: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new Error('Notification not found');
  }

  return notification;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    { receiver: userId, isRead: false },
    { isRead: true }
  );

  return {
    modifiedCount: result.modifiedCount,
    message: 'All notifications marked as read',
  };
};

const adminNotificationFromDB = async (query: Record<string, unknown>) => {
  const notificationQuery = new QueryBuilder<INotification>(
    Notification.find({ type: 'ADMIN' }),
    query
  )
    .search(['title', 'text'])
    .filter()
    .dateFilter()
    .sort()
    .paginate()
    .fields();

  const { data, pagination } = await notificationQuery.getFilteredResults();

  const unreadCount = await Notification.countDocuments({
    type: 'ADMIN',
    isRead: false,
  });

  return {
    data,
    pagination,
    unreadCount,
  };
};

const adminMarkNotificationAsReadIntoDB = async (notificationId: string) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, type: 'ADMIN' },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new Error('Admin notification not found');
  }

  return notification;
};

const adminMarkAllNotificationsAsRead = async () => {
  const result = await Notification.updateMany(
    { type: 'ADMIN', isRead: false },
    { isRead: true }
  );

  return {
    modifiedCount: result.modifiedCount,
    message: 'All admin notifications marked as read',
  };
};

export const NotificationService = {
  adminNotificationFromDB,
  getNotificationFromDB,
  markNotificationAsReadIntoDB,
  adminMarkNotificationAsReadIntoDB,
  markAllNotificationsAsRead,
  adminMarkAllNotificationsAsRead,
};
