import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { User } from '../user/user.model';
import { pushNotificationHelper } from './pushNotificationHelper';

export const sendNotifications = async (data: any): Promise<INotification> => {
  const result = await Notification.create(data);

  const user = await User.findById(data?.receiver);

  if (
    user?.deviceTokens &&
    Array.isArray(user.deviceTokens) &&
    user.deviceTokens.length > 0
  ) {
    const message = {
      notification: {

        title: data?.title || 'Task Titans Notification',
        body: data?.text,
      },
      tokens: user.deviceTokens,
    };

    try {
      await pushNotificationHelper.sendPushNotifications(message);
    } catch (error) {
      console.error('Failed to send push notification:', error);

    }
  }

  const socketIo = global.io;

  if (socketIo) {
    socketIo.emit(`get-notification::${data?.receiver}`, result);
  }

  return result;
};
