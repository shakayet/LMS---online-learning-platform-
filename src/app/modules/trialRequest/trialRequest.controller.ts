import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TrialRequestService } from './trialRequest.service';

/**
 * Create trial request (Student or Guest)
 * Can be used by:
 * - Logged-in students (auth token required)
 * - Guest users (no auth required, studentInfo must be complete)
 */
const createTrialRequest = catchAsync(async (req: Request, res: Response) => {
  // studentId will be null for guest users
  const studentId = req.user?.id || null;
  const result = await TrialRequestService.createTrialRequest(studentId, req.body);

  // Set refresh token in cookie if new user was created (auto-login)
  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

// NOTE: getMatchingTrialRequests, getMyTrialRequests, getAllTrialRequests removed
// Use /session-requests endpoints instead (unified view with requestType filter)

/**
 * Get available trial requests matching tutor's subjects (Tutor)
 * Shows requests tutor can accept based on their teaching subjects
 */
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

/**
 * Get tutor's accepted trial requests (Tutor)
 * Shows requests the tutor has already accepted
 */
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

/**
 * Get single trial request
 */
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

/**
 * Accept trial request (Tutor)
 * Creates chat with student and sends introductory message
 */
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

/**
 * Cancel trial request (Student)
 */
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

/**
 * Extend trial request (Student)
 * Can be called by logged-in student or via email link (guest)
 */
const extendTrialRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  // Support both logged-in users and email-based extension
  const studentIdOrEmail = req.user?.id || req.body.email || '';

  const result = await TrialRequestService.extendTrialRequest(id, studentIdOrEmail);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Trial request extended by 7 days successfully',
    data: result,
  });
});

/**
 * Send expiration reminders (Cron job endpoint)
 */
const sendExpirationReminders = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.sendExpirationReminders();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} reminder emails sent successfully`,
    data: { reminderCount: count },
  });
});

/**
 * Auto-delete expired requests (Cron job endpoint)
 */
const autoDeleteExpiredRequests = catchAsync(async (req: Request, res: Response) => {
  const count = await TrialRequestService.autoDeleteExpiredRequests();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `${count} expired trial requests deleted successfully`,
    data: { deletedCount: count },
  });
});

/**
 * Expire old trial requests (Cron job endpoint - marks as EXPIRED)
 */
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