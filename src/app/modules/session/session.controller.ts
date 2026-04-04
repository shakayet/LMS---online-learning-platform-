import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SessionService } from './session.service';

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

const autoCompleteSessions = catchAsync(async (req: Request, res: Response) => {
  const count = await SessionService.autoCompleteSessions();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} sessions auto-completed successfully`,
    data: { completedCount: count },
  });
});

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