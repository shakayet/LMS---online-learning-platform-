import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CallService } from './call.service';

const initiateCall = catchAsync(async (req: Request, res: Response) => {
  const { receiverId, callType, chatId } = req.body;
  const initiatorId = req.user?.id;

  const result = await CallService.initiateCall(
    initiatorId,
    receiverId,
    callType,
    chatId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Call initiated successfully',
    data: result,
  });
});

const acceptCall = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.acceptCall(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call accepted successfully',
    data: result,
  });
});

const rejectCall = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.rejectCall(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call rejected successfully',
    data: result,
  });
});

const endCall = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.endCall(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call ended successfully',
    data: result,
  });
});

const cancelCall = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.cancelCall(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call cancelled successfully',
    data: result,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.refreshToken(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Token refreshed successfully',
    data: result,
  });
});

const getCallHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await CallService.getCallHistory(userId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call history retrieved successfully',
    data: result.calls,
    pagination: {
      page: result.page,
      limit,
      total: result.total,
      totalPage: result.totalPages,
    },
  });
});

const getCallById = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await CallService.getCallById(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Call retrieved successfully',
    data: result,
  });
});

const getActiveParticipants = catchAsync(
  async (req: Request, res: Response) => {
    const { callId } = req.params;

    const result = await CallService.getActiveParticipants(callId);

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Active participants retrieved successfully',
      data: result,
    });
  }
);

export const CallController = {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  cancelCall,
  refreshToken,
  getCallHistory,
  getCallById,
  getActiveParticipants,
};
