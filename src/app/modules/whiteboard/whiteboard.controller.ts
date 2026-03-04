import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { WhiteboardService } from './whiteboard.service';

const createRoom = catchAsync(async (req: Request, res: Response) => {
  const { name, callId } = req.body;
  const userId = req.user?.id;

  const result = await WhiteboardService.createRoom(userId, name, callId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Whiteboard room created successfully',
    data: result,
  });
});

const getRoomToken = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { role } = req.body;
  const userId = req.user?.id;

  const result = await WhiteboardService.getRoomToken(roomId, userId, role);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Room token retrieved successfully',
    data: result,
  });
});

const getUserRooms = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const result = await WhiteboardService.getUserRooms(userId, page, limit);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Rooms retrieved successfully',
    data: result.rooms,
    pagination: {
      page: result.page,
      limit,
      total: result.total,
      totalPage: result.totalPages,
    },
  });
});

const deleteRoom = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  await WhiteboardService.deleteRoom(roomId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Whiteboard room deleted successfully',
    data: null,
  });
});

const takeSnapshot = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { scenePath } = req.body;
  const userId = req.user?.id;

  const result = await WhiteboardService.takeSnapshot(roomId, userId, scenePath);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Snapshot taken successfully',
    data: result,
  });
});

const getRoomSnapshots = catchAsync(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user?.id;

  const result = await WhiteboardService.getRoomSnapshots(roomId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Snapshots retrieved successfully',
    data: result,
  });
});

const getOrCreateForCall = catchAsync(async (req: Request, res: Response) => {
  const { callId } = req.params;
  const userId = req.user?.id;

  const result = await WhiteboardService.getOrCreateRoomForCall(callId, userId);

  sendResponse(res, {
    success: true,
    statusCode: result.isNew ? StatusCodes.CREATED : StatusCodes.OK,
    message: result.isNew
      ? 'Whiteboard room created for call'
      : 'Whiteboard room retrieved for call',
    data: result,
  });
});

export const WhiteboardController = {
  createRoom,
  getRoomToken,
  getUserRooms,
  deleteRoom,
  takeSnapshot,
  getRoomSnapshots,
  getOrCreateForCall,
};
