import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';
const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  NotificationController.getNotificationFromDB
);

router.patch(
  '/:id/read',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  NotificationController.readNotification
);

router.patch(
  '/read-all',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  NotificationController.readAllNotifications
);

router.get(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminNotificationFromDB
);

router.patch(
  '/admin/:id/read',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminMarkNotificationAsRead
);

router.patch(
  '/admin/read-all',
  auth(USER_ROLES.SUPER_ADMIN),
  NotificationController.adminMarkAllNotificationsAsRead
);

export const NotificationRoutes = router;
