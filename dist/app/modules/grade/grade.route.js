"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const grade_controller_1 = require("./grade.controller");
const grade_validation_1 = require("./grade.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/grades/active
 * @desc    Get all active grades (for students/tutors to see available grades)
 * @access  Public
 */
router.get('/active', grade_controller_1.GradeController.getActiveGrades);
/**
 * @route   GET /api/v1/grades/:gradeId
 * @desc    Get single grade by ID
 * @access  Public
 */
router.get('/:gradeId', grade_controller_1.GradeController.getSingleGrade);
/**
 * @route   GET /api/v1/grades
 * @desc    Get all grades with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=grade&isActive=true
 */
router.get('/', grade_controller_1.GradeController.getAllGrades);
// ============ ADMIN ONLY ROUTES ============
/**
 * @route   POST /api/v1/grades
 * @desc    Create new grade
 * @access  Admin only
 * @body    { name: "Grade 1", value: "1", order: 1, isActive?: true }
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.createGradeZodSchema), grade_controller_1.GradeController.createGrade);
/**
 * @route   PATCH /api/v1/grades/:gradeId
 * @desc    Update grade
 * @access  Admin only
 * @body    { name?, value?, order?, isActive? }
 */
router.patch('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.updateGradeZodSchema), grade_controller_1.GradeController.updateGrade);
/**
 * @route   DELETE /api/v1/grades/:gradeId
 * @desc    Delete grade (soft delete - sets isActive to false)
 * @access  Admin only
 */
router.delete('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), grade_controller_1.GradeController.deleteGrade);
exports.GradeRoutes = router;
