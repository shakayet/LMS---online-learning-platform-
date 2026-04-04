import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { SupportTicketController } from './supportTicket.controller';
import { SupportTicketValidation } from './supportTicket.validation';

const router = express.Router();

router.get('/categories', SupportTicketController.getTicketCategories);

router.post(
  '/',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  validateRequest(SupportTicketValidation.createSupportTicketZodSchema),
  SupportTicketController.createSupportTicket
);

router.get(
  '/my-tickets',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTickets
);

router.get(
  '/my-tickets/:ticketId',
  auth(USER_ROLES.STUDENT, USER_ROLES.TUTOR),
  SupportTicketController.getMyTicketById
);

router.get(
  '/admin/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketStats
);

router.get(
  '/admin',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getAllTickets
);

router.get(
  '/admin/:ticketId',
  auth(USER_ROLES.SUPER_ADMIN),
  SupportTicketController.getTicketById
);

router.patch(
  '/admin/:ticketId/status',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketStatusZodSchema),
  SupportTicketController.updateTicketStatus
);

router.patch(
  '/admin/:ticketId/priority',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.updateTicketPriorityZodSchema),
  SupportTicketController.updateTicketPriority
);

router.patch(
  '/admin/:ticketId/assign',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.assignTicketZodSchema),
  SupportTicketController.assignTicket
);

router.patch(
  '/admin/:ticketId/notes',
  auth(USER_ROLES.SUPER_ADMIN),
  validateRequest(SupportTicketValidation.addAdminNoteZodSchema),
  SupportTicketController.addAdminNotes
);

export const SupportTicketRoutes = router;
