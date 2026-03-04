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
/**
 * @route   POST /api/v1/applications
 * @desc    Submit tutor application (PUBLIC - creates user + application)
 * @access  Public (no auth required)
 * @body    FormData with:
 *   - data: JSON string { email, password, name, birthDate, phoneNumber, street, houseNumber, zip, city, subjects[] }
 *   - cv: File (PDF/Image)
 *   - abiturCertificate: File (PDF/Image)
 *   - officialId: File (PDF/Image)
 * @note    First-time registration for tutors
 */
router.post('/', (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.createApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.submitApplication);
/**
 * @route   GET /api/v1/applications/my-application
 * @desc    Get my application status
 * @access  Applicant only
 */
router.get('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), tutorApplication_controller_1.TutorApplicationController.getMyApplication);
/**
 * @route   PATCH /api/v1/applications/my-application
 * @desc    Update my application (when in REVISION status)
 * @access  Applicant only
 * @body    { cv?: string, abiturCertificate?: string, officialId?: string }
 * @note    Applicant can update documents and resubmit when revision is requested
 */
router.patch('/my-application', (0, auth_1.default)(user_1.USER_ROLES.APPLICANT), (0, fileHandler_1.fileHandler)([
    { name: 'cv', maxCount: 1 },
    { name: 'abiturCertificate', maxCount: 1 },
    { name: 'officialId', maxCount: 1 },
]), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.updateMyApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.updateMyApplication);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/applications
 * @desc    Get all applications with filtering, searching, pagination
 * @access  Admin only
 * @query   ?page=1&limit=10&searchTerm=john&status=SUBMITTED
 */
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getAllApplications);
/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get single application by ID
 * @access  Admin only
 */
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.getSingleApplication);
/**
 * @route   PATCH /api/v1/applications/:id/select-for-interview
 * @desc    Select application for interview (after initial review)
 * @access  Admin only
 * @body    { adminNotes?: string }
 */
router.patch('/:id/select-for-interview', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.selectForInterviewZodSchema), tutorApplication_controller_1.TutorApplicationController.selectForInterview);
/**
 * @route   PATCH /api/v1/applications/:id/approve
 * @desc    Approve application after interview (changes user role to TUTOR)
 * @access  Admin only
 * @body    { adminNotes?: string }
 * @note    Application must be SELECTED_FOR_INTERVIEW status first
 */
router.patch('/:id/approve', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.approveApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.approveApplication);
/**
 * @route   PATCH /api/v1/applications/:id/reject
 * @desc    Reject application
 * @access  Admin only
 * @body    { rejectionReason: string }
 */
router.patch('/:id/reject', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.rejectApplicationZodSchema), tutorApplication_controller_1.TutorApplicationController.rejectApplication);
/**
 * @route   PATCH /api/v1/applications/:id/revision
 * @desc    Send application for revision (ask applicant to fix something)
 * @access  Admin only
 * @body    { revisionNote: string }
 */
router.patch('/:id/revision', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(tutorApplication_validation_1.TutorApplicationValidation.sendForRevisionZodSchema), tutorApplication_controller_1.TutorApplicationController.sendForRevision);
/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete application (hard delete)
 * @access  Admin only
 */
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), tutorApplication_controller_1.TutorApplicationController.deleteApplication);
exports.TutorApplicationRoutes = router;
