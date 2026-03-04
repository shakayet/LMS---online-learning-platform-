"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolTypeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const schoolType_controller_1 = require("./schoolType.controller");
const schoolType_validation_1 = require("./schoolType.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/school-types/active
 * @desc    Get all active school types (for students/tutors to see available school types)
 * @access  Public
 */
router.get('/active', schoolType_controller_1.SchoolTypeController.getActiveSchoolTypes);
/**
 * @route   GET /api/v1/school-types/:schoolTypeId
 * @desc    Get single school type by ID
 * @access  Public
 */
router.get('/:schoolTypeId', schoolType_controller_1.SchoolTypeController.getSingleSchoolType);
/**
 * @route   GET /api/v1/school-types
 * @desc    Get all school types with filtering, searching, pagination
 * @access  Public
 * @query   ?page=1&limit=10&searchTerm=gymnasium&isActive=true
 */
router.get('/', schoolType_controller_1.SchoolTypeController.getAllSchoolTypes);
// ============ ADMIN ONLY ROUTES ============
/**
 * @route   POST /api/v1/school-types
 * @desc    Create new school type
 * @access  Admin only
 * @body    { name: "Gymnasium", value: "GYMNASIUM", order: 4, isActive?: true }
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(schoolType_validation_1.SchoolTypeValidation.createSchoolTypeZodSchema), schoolType_controller_1.SchoolTypeController.createSchoolType);
/**
 * @route   PATCH /api/v1/school-types/:schoolTypeId
 * @desc    Update school type
 * @access  Admin only
 * @body    { name?, value?, order?, isActive? }
 */
router.patch('/:schoolTypeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(schoolType_validation_1.SchoolTypeValidation.updateSchoolTypeZodSchema), schoolType_controller_1.SchoolTypeController.updateSchoolType);
/**
 * @route   DELETE /api/v1/school-types/:schoolTypeId
 * @desc    Delete school type (soft delete - sets isActive to false)
 * @access  Admin only
 */
router.delete('/:schoolTypeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), schoolType_controller_1.SchoolTypeController.deleteSchoolType);
exports.SchoolTypeRoutes = router;
