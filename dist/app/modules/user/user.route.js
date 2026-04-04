"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
const fileHandler_1 = require("../../middlewares/fileHandler");
const rateLimit_1 = require("../../middlewares/rateLimit");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();

router.post('/', (0, rateLimit_1.rateLimitMiddleware)({ windowMs: 60000, max: 20, routeName: 'create-user' }), (0, validateRequest_1.default)(user_validation_1.UserValidation.createUserZodSchema), user_controller_1.UserController.createUser);

router.get('/profile', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.APPLICANT), user_controller_1.UserController.getUserProfile);

router.patch('/profile', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.APPLICANT), (0, fileHandler_1.fileHandler)(['profilePicture']), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateUserZodSchema), user_controller_1.UserController.updateProfile);

router.get('/my-statistics', (0, auth_1.default)(user_1.USER_ROLES.TUTOR), user_controller_1.UserController.getTutorStatistics);

router.get('/students', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getAllStudents);

router.patch('/students/:id/block', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.blockStudent);

router.patch('/students/:id/unblock', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.unblockStudent);

router.patch('/students/:id/profile', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(user_validation_1.UserValidation.adminUpdateStudentProfileZodSchema), user_controller_1.UserController.adminUpdateStudentProfile);

router.get('/tutors', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getAllTutors);

router.patch('/tutors/:id/block', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.blockTutor);

router.patch('/tutors/:id/unblock', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.unblockTutor);

router.patch('/tutors/:id/subjects', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateTutorSubjectsZodSchema), user_controller_1.UserController.updateTutorSubjects);

router.patch('/tutors/:id/profile', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(user_validation_1.UserValidation.adminUpdateTutorProfileZodSchema), user_controller_1.UserController.adminUpdateTutorProfile);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getAllUsers);

router.patch('/:id/block', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.blockUser);

router.patch('/:id/unblock', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.unblockUser);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), user_controller_1.UserController.getUserById);

router.get('/:id/user', (0, auth_1.default)(user_1.USER_ROLES.GUEST), (0, rateLimit_1.rateLimitMiddleware)({ windowMs: 60000, max: 60, routeName: 'public-user-details' }), user_controller_1.UserController.getUserDetailsById);
exports.UserRoutes = router;
