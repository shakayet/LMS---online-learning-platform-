import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { InterviewSlotService } from './interviewSlot.service';

/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user?.id as string;
  const result = await InterviewSlotService.createInterviewSlot(adminId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Interview slot created successfully',
    data: result,
  });
});

/**
 * Get all interview slots
 * Admin: See all slots
 * Applicant: See only available slots
 */
const getAllInterviewSlots = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined;
  const userRole = req.user?.role as string | undefined;
  const result = await InterviewSlotService.getAllInterviewSlots(req.query, userId, userRole);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slots retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single interview slot
 */
const getSingleInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.getSingleInterviewSlot(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot retrieved successfully',
    data: result,
  });
});

/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const applicantId = req.user?.id as string;
  const { applicationId } = req.body;

  const result = await InterviewSlotService.bookInterviewSlot(
    id,
    applicantId,
    applicationId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot booked successfully',
    data: result,
  });
});

/**
 * Cancel interview slot
 */
const cancelInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id as string;
  const { cancellationReason } = req.body;

  const result = await InterviewSlotService.cancelInterviewSlot(
    id,
    userId,
    cancellationReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot cancelled successfully',
    data: result,
  });
});

/**
 * Reschedule interview slot (Applicant)
 */
const rescheduleInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const applicantId = req.user?.id as string;
  const { newSlotId } = req.body;

  const result = await InterviewSlotService.rescheduleInterviewSlot(
    id,
    newSlotId,
    applicantId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview rescheduled successfully',
    data: result,
  });
});

/**
 * Mark interview as completed (Admin only)
 */
const markAsCompleted = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.markAsCompleted(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview marked as completed successfully',
    data: result,
  });
});

/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.updateInterviewSlot(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot updated successfully',
    data: result,
  });
});

/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InterviewSlotService.deleteInterviewSlot(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Interview slot deleted successfully',
    data: result,
  });
});

/**
 * Get my booked interview slot (Applicant only)
 */
const getMyBookedInterview = catchAsync(async (req: Request, res: Response) => {
  const applicantId = req.user?.id as string;
  const result = await InterviewSlotService.getMyBookedInterview(applicantId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result
      ? 'Booked interview slot retrieved successfully'
      : 'No booked interview slot found',
    data: result,
  });
});

/**
 * Get all scheduled meetings (Admin only)
 */
const getScheduledMeetings = catchAsync(async (req: Request, res: Response) => {
  const result = await InterviewSlotService.getScheduledMeetings(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Scheduled meetings retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get meeting token for interview video call
 */
const getMeetingToken = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id as string;

  const result = await InterviewSlotService.getInterviewMeetingToken(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Meeting token generated successfully',
    data: result,
  });
});

export const InterviewSlotController = {
  createInterviewSlot,
  getAllInterviewSlots,
  getSingleInterviewSlot,
  bookInterviewSlot,
  cancelInterviewSlot,
  rescheduleInterviewSlot,
  markAsCompleted,
  updateInterviewSlot,
  deleteInterviewSlot,
  getMyBookedInterview,
  getScheduledMeetings,
  getMeetingToken,
};