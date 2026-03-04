import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SupportTicketService } from './supportTicket.service';

// ============ USER ROUTES (Student/Tutor) ============

// Create a new support ticket
const createSupportTicket = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id!;
  const userRole = req.user!.role === 'STUDENT' ? 'STUDENT' : 'TUTOR';

  const result = await SupportTicketService.createSupportTicket(
    userId,
    userRole,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Support ticket created successfully',
    data: result,
  });
});

// Get my tickets (for logged-in user)
const getMyTickets = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id!;
  const result = await SupportTicketService.getMyTickets(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tickets retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

// Get single ticket (for logged-in user - only their own)
const getMyTicketById = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const userId = req.user!.id!;

  const result = await SupportTicketService.getMyTicketById(ticketId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket retrieved successfully',
    data: result,
  });
});

// Get ticket categories (public - for dropdown)
const getTicketCategories = catchAsync(async (_req: Request, res: Response) => {
  const result = SupportTicketService.getTicketCategories();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Categories retrieved successfully',
    data: result,
  });
});

// ============ ADMIN ROUTES ============

// Get all tickets (admin only)
const getAllTickets = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportTicketService.getAllTickets(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All tickets retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

// Get single ticket by ID (admin only)
const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const result = await SupportTicketService.getTicketById(ticketId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket retrieved successfully',
    data: result,
  });
});

// Update ticket status (admin only)
const updateTicketStatus = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { status, adminNotes } = req.body;

  const result = await SupportTicketService.updateTicketStatus(
    ticketId,
    status,
    adminNotes
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket status updated successfully',
    data: result,
  });
});

// Update ticket priority (admin only)
const updateTicketPriority = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { priority } = req.body;

  const result = await SupportTicketService.updateTicketPriority(
    ticketId,
    priority
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket priority updated successfully',
    data: result,
  });
});

// Assign ticket to admin
const assignTicket = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { assignedTo } = req.body;

  const result = await SupportTicketService.assignTicket(ticketId, assignedTo);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket assigned successfully',
    data: result,
  });
});

// Add admin notes
const addAdminNotes = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { adminNotes } = req.body;

  const result = await SupportTicketService.addAdminNotes(ticketId, adminNotes);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Admin notes added successfully',
    data: result,
  });
});

// Get ticket statistics (admin dashboard)
const getTicketStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await SupportTicketService.getTicketStats();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Ticket statistics retrieved successfully',
    data: result,
  });
});

export const SupportTicketController = {
  createSupportTicket,
  getMyTickets,
  getMyTicketById,
  getTicketCategories,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  addAdminNotes,
  getTicketStats,
};
