"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorApplicationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const fileHandler_1 = require("../../middlewares/fileHandler");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const tutorApplication_controller_1 = require("./tutorApplication.controller");
const tutorApplication_validation_1 = require("./tutorApplication.validation");
const router = express_1.default.Router();

router.post('/', (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.createApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.submitApplication);

router.get('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), tutorApplication_controller_1.TutorApplicationController.getMyApplication);

router.patch('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.updateMyApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.updateMyApplication);

router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getAllApplications);

router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getSingleApplication);

router.patch('/:id/select-for-interview', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.selectForInterviewZodSchema), tutorApplication_controller_1.TutorApplicationController.selectForInterview);

router.patch('/:id/approve', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.approveApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.approveApplication);

router.patch('/:id/reject', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.rejectApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.rejectApplication);

router.patch('/:id/revision', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.sendForRevisionZodSchema), tutorApplication_controller_1.TutorApplicationController.sendForRevision);

router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.deleteApplication);
exports.TutorApplicationRoutes = router;
