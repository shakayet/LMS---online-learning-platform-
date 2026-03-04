"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const auth_controller_1 = require("./auth.controller");
const auth_validation_1 = require("./auth.validation");
const router = express_1.default.Router();
// User Login
// ✅ FRONTEND: useLogin | Used in: src/app/(auth)/login/page.tsx
router.post('/login', (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createLoginZodSchema), auth_controller_1.AuthController.loginUser);
// User Logout (Public - no auth required so expired tokens can still logout)
// ✅ FRONTEND: useLogout | Used in: MobileMenuTutor.tsx, TopNavbar.tsx, MobileMenu.tsx
router.post('/logout', auth_controller_1.AuthController.logoutUser);
// Forget Password Request
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/forget-password', (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createForgetPasswordZodSchema), auth_controller_1.AuthController.forgetPassword);
// Email Verification
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/verify-email', (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createVerifyEmailZodSchema), auth_controller_1.AuthController.verifyEmail);
// Reset Password
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/reset-password', (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createResetPasswordZodSchema), auth_controller_1.AuthController.resetPassword);
// Change Password
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/change-password', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createChangePasswordZodSchema), auth_controller_1.AuthController.changePassword);
// Resend Verification Email
// ❌ NOT INTEGRATED IN FRONTEND
router.post('/resend-verify-email', auth_controller_1.AuthController.resendVerifyEmail);
// Refresh Token
// ✅ FRONTEND: useRefreshToken | Used in: src/lib/api-client.ts (interceptor)
router.post('/refresh-token', (0, validateRequest_1.default)(auth_validation_1.AuthValidation.createRefreshTokenZodSchema), auth_controller_1.AuthController.refreshToken);
exports.AuthRoutes = router;
