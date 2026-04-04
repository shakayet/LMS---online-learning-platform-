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

router.get('/active', grade_controller_1.GradeController.getActiveGrades);

router.get('/:gradeId', grade_controller_1.GradeController.getSingleGrade);

router.get('/', grade_controller_1.GradeController.getAllGrades);

router.post('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.createGradeZodSchema), grade_controller_1.GradeController.createGrade);

router.patch('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(grade_validation_1.GradeValidation.updateGradeZodSchema), grade_controller_1.GradeController.updateGrade);

router.delete('/:gradeId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), grade_controller_1.GradeController.deleteGrade);
exports.GradeRoutes = router;
