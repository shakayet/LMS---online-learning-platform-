"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const subject_controller_1 = require("./subject.controller");
const subject_validation_1 = require("./subject.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/subjects/active
 * @desc    Get all active subjects (for students/tutors to see available subjects)
 * @access  Public
 */
router.get('/active', subject_controller_1.SubjectController.getActiveSubjects);
/**
 * @route   GET /api/v1/subjects/:subjectId
 * @desc    Get single subject by ID
 * @access  Public
 */
router.get('/:subjectId', subject_controller_1.SubjectController.getSingleSubject);
/**
 * @route   GET /api/v1/subjects
 * @desc    Get all subjects with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=math&isActive=true
 */
router.get('/', subject_controller_1.SubjectController.getAllSubjects);
// ============ ADMIN ONLY ROUTES ============
/**
 * @route   POST /api/v1/subjects
 * @desc    Create new subject
 * @access  Admin only
 * @body    { name: "Mathematics", isActive?: true }
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(subject_validation_1.SubjectValidation.createSubjectZodSchema), subject_controller_1.SubjectController.createSubject);
/**
 * @route   PATCH /api/v1/subjects/:subjectId
 * @desc    Update subject
 * @access  Admin only
 * @body    { name?, isActive? }
 */
router.patch('/:subjectId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(subject_validation_1.SubjectValidation.updateSubjectZodSchema), subject_controller_1.SubjectController.updateSubject);
/**
 * @route   DELETE /api/v1/subjects/:subjectId
 * @desc    Permanently delete subject (hard delete). Blocked if active requests exist.
 * @access  Admin only
 */
router.delete('/:subjectId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), subject_controller_1.SubjectController.deleteSubject);
exports.SubjectRoutes = router;
