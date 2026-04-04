import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { InterviewSlotService } from './interviewSlot.service';

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