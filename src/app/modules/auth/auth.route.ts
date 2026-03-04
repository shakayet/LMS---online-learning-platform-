import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';

const router = express.Router();

// User Login
// ✅ FRONTEND: useLogin | Used in: src/app/(auth)/login/page.tsx
router.post(
  '/login',
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser
);

// User Logout (Public - no auth required so expired tokens can still logout)
// ✅ FRONTEND: useLogout | Used in: MobileMenuTutor.tsx, TopNavbar.tsx, MobileMenu.tsx
router.post('/logout', AuthController.logoutUser);

// Forget Password Request
// ❌ NOT INTEGRATED IN FRONTEND
router.post(
  '/forget-password',
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword
);

// Email Verification
// ❌ NOT INTEGRATED IN FRONTEND
router.post(
  '/verify-email',
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail
);

// Reset Password
// ❌ NOT INTEGRATED IN FRONTEND
router.post(
  '/reset-password',
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword
);

// Change Password
// ❌ NOT INTEGRATED IN FRONTEND
router.post(
  '/change-password',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword
);

// Resend Verification Email
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/resend-verify-email', AuthController.resendVerifyEmail);

// Refresh Token
// ✅ FRONTEND: useRefreshToken | Used in: src/lib/api-client.ts (interceptor)
router.post(
  '/refresh-token',
  validateRequest(AuthValidation.createRefreshTokenZodSchema),
  AuthController.refreshToken
);

export const AuthRoutes = router;
