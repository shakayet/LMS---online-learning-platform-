import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TutorSessionFeedbackService } from './tutorSessionFeedback.service';

// Submit feedback for a session (tutor action)
const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TutorSessionFeedbackService.submitFeedback(tutorId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Feedback submitted successfully',
    data: result,
  });
});

// Get pending feedbacks for logged-in tutor
const getPendingFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TutorSessionFeedbackService.getPendingFeedbacks(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pending feedbacks retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get all submitted feedbacks for logged-in tutor
const getTutorFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const tutorId = req.user!.id as string;
  const result = await TutorSessionFeedbackService.getTutorFeedbacks(tutorId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Feedbacks retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Get feedback for a specific session
const getFeedbackBySession = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const userId = req.user!.id as string;
  const result = await TutorSessionFeedbackService.getFeedbackBySession(sessionId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Feedback retrieved successfully',
    data: result,
  });
});

// Get feedbacks received by logged-in student
const getMyReceivedFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await TutorSessionFeedbackService.getStudentFeedbacks(studentId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Received feedbacks retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

// Admin: Get forfeited payments summary
const getForfeitedPaymentsSummary = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.query;
  const result = await TutorSessionFeedbackService.getForfeitedPaymentsSummary({
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Forfeited payments summary retrieved successfully',
    data: result,
  });
});

// Admin: Get list of forfeited feedbacks
const getForfeitedFeedbacksList = catchAsync(async (req: Request, res: Response) => {
  const result = await TutorSessionFeedbackService.getForfeitedFeedbacksList(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Forfeited feedbacks list retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

export const TutorSessionFeedbackController = {
  submitFeedback,
  getPendingFeedbacks,
  getTutorFeedbacks,
  getFeedbackBySession,
  getMyReceivedFeedbacks,
  getForfeitedPaymentsSummary,
  getForfeitedFeedbacksList,
};
