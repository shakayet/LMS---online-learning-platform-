import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SupportTicketController } from './supportTicket.controller';
import { SupportTicketValidation } from './supportTicket.validation';

const router = express.Router();

// ============ PUBLIC ROUTES ============

/**
 * @route   GET /api/v1/support-tickets/categories
 * @desc    Get all ticket categories for dropdown
 * @access  Public
 */
router.get('/categories', SupportTicketController.getTicketCategories);

// ============ USER ROUTES (Student/Tutor) ============

/**
 * @route   POST /api/v1/support-tickets
 * @desc    Create a new support ticket
 * @access  Student, Tutor
 * @body    { category, subject, message, attachments? }
 */
router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SupportTicketValidation.createSupportTicketZodSchema),
  SupportTicketController.createSupportTicket
);

/**
 * @route   GET /api/v1/support-tickets/my-tickets
 * @desc    Get all tickets for logged-in user
 * @access  Student, Tutor
 * @query   ?page=1&limit=10&status=OPEN&category=TECHNICAL_ISSUE
 */
router.get(
  '/my-tickets',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTickets
);

/**
 * @route   GET /api/v1/support-tickets/my-tickets/:ticketId
 * @desc    Get single ticket by ID (user's own ticket only)
 * @access  Student, Tutor
 */
router.get(
  '/my-tickets/:ticketId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTicketById
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/v1/support-tickets/admin/stats
 * @desc    Get ticket statistics for admin dashboard
 * @access  Admin only
 */
router.get(
  '/admin/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketStats
);

/**
 * @route   GET /api/v1/support-tickets/admin
 * @desc    Get all tickets (admin view)
 * @access  Admin only
 * @query   ?page=1&limit=10&status=OPEN&category=TECHNICAL_ISSUE&priority=HIGH&searchTerm=payment
 */
router.get(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getAllTickets
);

/**
 * @route   GET /api/v1/support-tickets/admin/:ticketId
 * @desc    Get single ticket by ID (admin view)
 * @access  Admin only
 */
router.get(
  '/admin/:ticketId',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketById
);

/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/status
 * @desc    Update ticket status
 * @access  Admin only
 * @body    { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED', adminNotes? }
 */
router.patch(
  '/admin/:ticketId/status',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketStatusZodSchema),
  SupportTicketController.updateTicketStatus
);

/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/priority
 * @desc    Update ticket priority
 * @access  Admin only
 * @body    { priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }
 */
router.patch(
  '/admin/:ticketId/priority',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketPriorityZodSchema),
  SupportTicketController.updateTicketPriority
);

/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/assign
 * @desc    Assign ticket to an admin
 * @access  Admin only
 * @body    { assignedTo: 'adminUserId' }
 */
router.patch(
  '/admin/:ticketId/assign',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.assignTicketZodSchema),
  SupportTicketController.assignTicket
);

/**
 * @route   PATCH /api/v1/support-tickets/admin/:ticketId/notes
 * @desc    Add admin notes to ticket
 * @access  Admin only
 * @body    { adminNotes: 'string' }
 */
router.patch(
  '/admin/:ticketId/notes',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.addAdminNoteZodSchema),
  SupportTicketController.addAdminNotes
);

export const SupportTicketRoutes = router;
