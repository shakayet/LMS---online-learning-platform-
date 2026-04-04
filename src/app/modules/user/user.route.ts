import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { fileHandler } from '../../middlewares/fileHandler';
import { rateLimitMiddleware } from '../../middlewares/rateLimit';
import express from 'express';

const router = express.Router();

router.post(
  '/',
  rateLimitMiddleware({ windowMs: 60_000, max: 20, routeName: 'create-user' }),
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser
);

router.get(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.APPLICANT),
  UserController.getUserProfile
);

router.patch(
  '/profile',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR, USER_ROLES.SUPER_ADMIN, USER_ROLES.APPLICANT),
  fileHandler(['profilePicture']),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateProfile
);

router.get(
  '/my-statistics',
  auth(USER_ROLES.TUTOR),
  UserController.getTutorStatistics
);

router.get(
  '/students',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.getAllStudents
);

router.patch(
  '/students/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockStudent
);

router.patch(
  '/students/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockStudent
);

router.patch(
  '/students/:id/profile',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(UserValidation.adminUpdateStudentProfileZodSchema),
  UserController.adminUpdateStudentProfile
);

router.get(
  '/tutors',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.getAllTutors
);

router.patch(
  '/tutors/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockTutor
);

router.patch(
  '/tutors/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockTutor
);

router.patch(
  '/tutors/:id/subjects',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(UserValidation.updateTutorSubjectsZodSchema),
  UserController.updateTutorSubjects
);

router.patch(
  '/tutors/:id/profile',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(UserValidation.adminUpdateTutorProfileZodSchema),
  UserController.adminUpdateTutorProfile
);

router.get('/', auth(USER_ROLES.SUPER_ADMIN), UserController.getAllUsers);

router.patch(
  '/:id/block',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.blockUser
);

router.patch(
  '/:id/unblock',
  auth(USER_ROLES.SUPER_ADMIN),
  UserController.unblockUser
);

router.get('/:id', auth(USER_ROLES.SUPER_ADMIN), UserController.getUserById);

router.get(
  '/:id/user',
  auth(USER_ROLES.GUEST),
  rateLimitMiddleware({ windowMs: 60_000, max: 60, routeName: 'public-user-details' }),
  UserController.getUserDetailsById
);

export const UserRoutes = router;
