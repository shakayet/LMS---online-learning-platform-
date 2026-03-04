"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const supportTicket_controller_1 = require("./supportTicket.controller");
const supportTicket_validation_1 = require("./supportTicket.validation");
const router = express_1.default.Router();
// ============ PUBLIC ROUTES ============
/**
 * @route   GET /api/v1/support-tickets/categories
 * @desc    Get all ticket categories for dropdown
 * @access  Public
 */
router.get('/categories', supportTicket_controller_1.SupportTicketController.getTicketCategories);
// ============ USER ROUTES (Student/Tutor) ============
/**
 * @route   POST /api/v1/support-tickets
 * @desc    Create a new support ticket
 * @access  Student, Tutor
 * @body    { category, subject, message, attachments? }
 */
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.createSupportTicketZodSchema), supportTicket_controller_1.SupportTicketController.createSupportTicket);
/**
 * @route   GET /api/v1/support-tickets/my-tickets
 * @desc    Get all tickets for logged-in user
 * @access  Student, Tutor
 * @query   ?page=1&limit=10&status=OPEN&category=TECHNICAL_ISSUE
 */
router.get('/my-tickets', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), supportTicket_controller_1.SupportTicketController.getMyTickets);
/**
 * @route   GET /api/v1/support-tickets/my-tickets/:ticketId
 * @desc    Get single ticket by ID (user's own ticket only)
 * @access  Student, Tutor
 */
router.get('/my-tickets/:ticketId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), supportTicket_controller_1.SupportTicketController.getMyTicketById);
// ============ ADMIN ROUTES ============
/**
 * @route   GET /api/v1/support-tickets/admin/stats
 * @desc    Get ticket statistics for admin dashboard
 * @access  Admin only
 */
router.get('/admin/stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getTicketStats);
/**
 * @route   GET /api/v1/support-tickets/admin
 * @desc    Get all tickets (admin view)
 * @access  Admin only
 * @query   ?page=1&limit=10&status=OPEN&category=TECHNICAL_ISSUE&priority=HIGH&searchTerm=payment
 */
router.get('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getAllTickets);
/**
 * @route   GET /api/v1/support-tickets/admin/:ticketId
 * @desc    Get single ticket by ID (admin view)
 * @access  Admin only
 */
router.get('/admin/:ticketId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getTicketById);
/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/status
 * @desc    Update ticket status
 * @access  Admin only
 * @body    { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', adminNotes? }
 */
router.patch('/admin/:ticketId/status', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.updateTicketStatusZodSchema), supportTicket_controller_1.SupportTicketController.updateTicketStatus);
/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/priority
 * @desc    Update ticket priority
 * @access  Admin only
 * @body    { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }
 */
router.patch('/admin/:ticketId/priority', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.updateTicketPriorityZodSchema), supportTicket_controller_1.SupportTicketController.updateTicketPriority);
/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/assign
 * @desc    Assign ticket to an admin
 * @access  Admin only
 * @body    { assignedTo: 'adminUserId' }
 */
router.patch('/admin/:ticketId/assign', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.assignTicketZodSchema), supportTicket_controller_1.SupportTicketController.assignTicket);
/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/notes
 * @desc    Add admin notes to ticket
 * @access  Admin only
 * @body    { adminNotes: 'string' }
 */
router.patch('/admin/:ticketId/notes', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.addAdminNoteZodSchema), supportTicket_controller_1.SupportTicketController.addAdminNotes);
exports.SupportTicketRoutes = router;
