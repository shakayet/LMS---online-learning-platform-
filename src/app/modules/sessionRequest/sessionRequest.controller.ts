import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SessionRequestService } from './sessionRequest.service';

// Create session request (Student only - must be logged in and have completed trial)
const createSessionRequest = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user?.id;

  if (!studentId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'You must be logged in to create a session request',
    });
  }

  const result = await SessionRequestService.createSessionRequest(studentId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Session request created successfully. Matching tutors will be notified.',
    data: result,
  });
});

// Get matching session requests (Tutor)
const getMatchingSessionRequests = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user?.id;

  if (!tutorId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Unauthorized',
    });
  }

  const result = await SessionRequestService.getMatchingSessionRequests(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Matching session requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get my session requests (Student)
const getMySessionRequests = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user?.id;

  if (!studentId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Unauthorized',
    });
  }

  const result = await SessionRequestService.getMySessionRequests(studentId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your session requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get all session requests (Admin)
const getAllSessionRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await SessionRequestService.getAllSessionRequests(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All session requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get single session request
const getSingleSessionRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SessionRequestService.getSingleSessionRequest(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session request retrieved successfully',
    data: result,
  });
});

// Accept session request (Tutor)
const acceptSessionRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tutorId = req.user?.id;
  const { introductoryMessage } = req.body;

  if (!tutorId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Unauthorized',
    });
  }

  const result = await SessionRequestService.acceptSessionRequest(
    id,
    tutorId,
    introductoryMessage
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session request accepted successfully. Chat has been created.',
    data: result,
  });
});

// Cancel session request (Student)
const cancelSessionRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user?.id;

  if (!studentId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Unauthorized',
    });
  }

  const result = await SessionRequestService.cancelSessionRequest(id, studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session request cancelled successfully',
    data: result,
  });
});

// Extend session request (Student)
const extendSessionRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user?.id;

  if (!studentId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'You must be logged in to extend a session request',
    });
  }

  const result = await SessionRequestService.extendSessionRequest(id, studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Session request extended by 7 days successfully',
    data: result,
  });
});

// Send expiration reminders (Admin/Cron)
const sendExpirationReminders = catchAsync(async (req: Request, res: Response) => {
  const count = await SessionRequestService.sendExpirationReminders();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} reminder emails sent successfully`,
    data: { reminderCount: count },
  });
});

// Auto-delete expired requests (Admin/Cron)
const autoDeleteExpiredRequests = catchAsync(async (req: Request, res: Response) => {
  const count = await SessionRequestService.autoDeleteExpiredRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} expired session requests deleted successfully`,
    data: { deletedCount: count },
  });
});

// Expire old session requests (Admin/Cron)
const expireOldRequests = catchAsync(async (req: Request, res: Response) => {
  const expiredCount = await SessionRequestService.expireOldRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${expiredCount} session requests expired`,
    data: { expiredCount },
  });
});

// Get my accepted requests - unified trial + session (Tutor)
const getMyAcceptedRequests = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user?.id;

  if (!tutorId) {
    return sendResponse(res, {
      success: false,
      statusCode: StatusCodes.UNAUTHORIZED,
      message: 'Unauthorized',
    });
  }

  const result = await SessionRequestService.getMyAcceptedRequests(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Accepted requests retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

export const SessionRequestController = {
  createSessionRequest,
  getMatchingSessionRequests,
  getMySessionRequests,
  getMyAcceptedRequests,
  getAllSessionRequests,
  getSingleSessionRequest,
  acceptSessionRequest,
  cancelSessionRequest,
  extendSessionRequest,
  sendExpirationReminders,
  autoDeleteExpiredRequests,
  expireOldRequests,
};
