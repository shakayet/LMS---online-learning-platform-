import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SessionService } from './session.service';

/**
 * Propose session (Tutor sends in chat)
 */
const proposeSession = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await SessionService.proposeSession(tutorId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Session proposal sent successfully',
    data: result,
  });
});

/**
 * Accept session proposal (Student or Tutor accepts)
 * Student accepts tutor's proposal OR Tutor accepts student's counter-proposal
 */
const acceptSessionProposal = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.id as string;
  const result = await SessionService.acceptSessionProposal(messageId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Session booked successfully. Google Meet link will be generated.',
    data: result,
  });
});

/**
 * Counter-propose session (Student suggests alternative time)
 */
const counterProposeSession = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const studentId = req.user!.id as string;

  const result = await SessionService.counterProposeSession(
    messageId,
    studentId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Counter-proposal sent successfully',
    data: result,
  });
});

/**
 * Reject session proposal (Student or Tutor rejects)
 * Student rejects tutor's proposal OR Tutor rejects student's counter-proposal
 */
const rejectSessionProposal = catchAsync(async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = req.user!.id as string;
  const { rejectionReason } = req.body;

  const result = await SessionService.rejectSessionProposal(
    messageId,
    userId,
    rejectionReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session proposal rejected',
    data: result,
  });
});

/**
 * Get all sessions
 * Student: Own sessions
 * Tutor: Own sessions
 * Admin: All sessions
 */
const getAllSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined;
  const userRole = req.user?.role;
  const result = await SessionService.getAllSessions(req.query, userId, userRole);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Sessions retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single session
 */
const getSingleSession = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionService.getSingleSession(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session retrieved successfully',
    data: result,
  });
});

/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id as string;
  const { cancellationReason } = req.body;

  const result = await SessionService.cancelSession(id, userId, cancellationReason);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session cancelled successfully',
    data: result,
  });
});

/**
 * Mark session as completed (Admin/Manual)
 */
const markAsCompleted = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionService.markAsCompleted(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session marked as completed',
    data: result,
  });
});

/**
 * Auto-complete sessions (Cron job endpoint)
 */
const autoCompleteSessions = catchAsync(async (req: Request, res: Response) => {
  const count = await SessionService.autoCompleteSessions();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} sessions auto-completed successfully`,
    data: { completedCount: count },
  });
});

/**
 * Get upcoming sessions for logged-in user
 */
const getUpcomingSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id as string;
  const userRole = req.user!.role as string;
  const result = await SessionService.getUpcomingSessions(userId, userRole, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Upcoming sessions retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get completed sessions for logged-in user
 */
const getCompletedSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id as string;
  const userRole = req.user!.role as string;
  const result = await SessionService.getCompletedSessions(userId, userRole, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Completed sessions retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Request session reschedule
 */
const requestReschedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id as string;
  const result = await SessionService.requestReschedule(id, userId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reschedule request sent successfully',
    data: result,
  });
});

/**
 * Approve reschedule request
 */
const approveReschedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id as string;
  const result = await SessionService.approveReschedule(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reschedule approved successfully',
    data: result,
  });
});

/**
 * Reject reschedule request
 */
const rejectReschedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id as string;
  const result = await SessionService.rejectReschedule(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Reschedule rejected',
    data: result,
  });
});

/**
 * Auto-transition session statuses (Cron job endpoint)
 */
const autoTransitionStatuses = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionService.autoTransitionSessionStatuses();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session statuses transitioned successfully',
    data: result,
  });
});

export const SessionController = {
  proposeSession,
  acceptSessionProposal,
  counterProposeSession,
  rejectSessionProposal,
  getAllSessions,
  getSingleSession,
  cancelSession,
  markAsCompleted,
  autoCompleteSessions,
  getUpcomingSessions,
  getCompletedSessions,
  requestReschedule,
  approveReschedule,
  rejectReschedule,
  autoTransitionStatuses,
};