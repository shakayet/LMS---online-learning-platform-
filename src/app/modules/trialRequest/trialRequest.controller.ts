import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TrialRequestService } from './trialRequest.service';

const createTrialRequest = catchAsync(async (req: Request, res: Response) => {

  const studentId = req.user?.id || null;
  const result = await TrialRequestService.createTrialRequest(studentId, req.body);

  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Trial request created successfully. Matching tutors will be notified.',
    data: {
      trialRequest: result.trialRequest,
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

const getAvailableTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TrialRequestService.getAvailableTrialRequests(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Available trial requests retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getMyAcceptedTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TrialRequestService.getMyAcceptedTrialRequests(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Accepted trial requests retrieved successfully',
    pagination: result.pagination,
    data: result.data,
  });
});

const getSingleTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TrialRequestService.getSingleTrialRequest(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request retrieved successfully',
    data: result,
  });
});

const acceptTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const tutorId = req.user!.id as string;
  const { introductoryMessage } = req.body;

  const result = await TrialRequestService.acceptTrialRequest(id, tutorId, introductoryMessage);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request accepted successfully. Chat created with student.',
    data: result,
  });
});

const cancelTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id as string;
  const { cancellationReason } = req.body;

  const result = await TrialRequestService.cancelTrialRequest(
    id,
    studentId,
    cancellationReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request cancelled successfully',
    data: result,
  });
});

const extendTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const studentIdOrEmail = req.user?.id || req.body.email || '';

  const result = await TrialRequestService.extendTrialRequest(id, studentIdOrEmail);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request extended by 7 days successfully',
    data: result,
  });
});

const sendExpirationReminders = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.sendExpirationReminders();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} reminder emails sent successfully`,
    data: { reminderCount: count },
  });
});

const autoDeleteExpiredRequests = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.autoDeleteExpiredRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} expired trial requests deleted successfully`,
    data: { deletedCount: count },
  });
});

const expireOldRequests = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.expireOldRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} trial requests expired successfully`,
    data: { expiredCount: count },
  });
});

export const TrialRequestController = {
  createTrialRequest,
  getAvailableTrialRequests,
  getMyAcceptedTrialRequests,
  getSingleTrialRequest,
  acceptTrialRequest,
  cancelTrialRequest,
  extendTrialRequest,
  sendExpirationReminders,
  autoDeleteExpiredRequests,
  expireOldRequests,
};