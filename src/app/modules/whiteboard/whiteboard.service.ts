import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { WhiteboardRoom } from './whiteboard.model';
import { IWhiteboardRoom, WhiteboardRole } from './whiteboard.interface';
import {
  createAgoraWhiteboardRoom,
  generateWhiteboardRoomToken,
  closeWhiteboardRoom,
  takeWhiteboardSnapshot,
} from './whiteboard.helper';
import ApiError from '../../../errors/ApiError';

/**
 * নতুন Whiteboard Room তৈরি করে
 */
const createRoom = async (
  userId: string | null | undefined,
  name: string,
  callId?: string
): Promise<{ room: IWhiteboardRoom; token: string }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  // Create room in Agora
  const { uuid } = await createAgoraWhiteboardRoom(name);

  // Get token for creator
  const token = await generateWhiteboardRoomToken(uuid, 'admin');

  // Save to database
  const room = await WhiteboardRoom.create({
    uuid,
    name,
    createdBy: userId,
    participants: [userId],
    callId: callId ? new Types.ObjectId(callId) : undefined,
    isActive: true,
  });

  return { room: room.toObject() as IWhiteboardRoom, token };
};

/**
 * Room Token নেয়
 */
const getRoomToken = async (
  roomId: string,
  userId: string | null | undefined,
  role: WhiteboardRole = 'writer'
): Promise<{ token: string; room: IWhiteboardRoom }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const room = await WhiteboardRoom.findById(roomId);

  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Whiteboard room not found');
  }

  if (!room.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Whiteboard room is closed');
  }

  // Add user to participants if not already
  const isParticipant = room.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    room.participants.push(new Types.ObjectId(userId));
    await room.save();
  }

  const token = await generateWhiteboardRoomToken(room.uuid, role);

  return { token, room: room.toObject() as IWhiteboardRoom };
};

/**
 * Room Token নেয় by UUID (for Call integration)
 */
const getRoomTokenByUuid = async (
  uuid: string,
  userId: string,
  role: WhiteboardRole = 'writer'
): Promise<{ token: string; room: IWhiteboardRoom }> => {
  const room = await WhiteboardRoom.findOne({ uuid });

  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Whiteboard room not found');
  }

  if (!room.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Whiteboard room is closed');
  }

  // Add user to participants if not already
  const isParticipant = room.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    room.participants.push(new Types.ObjectId(userId));
    await room.save();
  }

  const token = await generateWhiteboardRoomToken(uuid, role);

  return { token, room: room.toObject() as IWhiteboardRoom };
};

/**
 * User এর rooms দেখায়
 */
const getUserRooms = async (
  userId: string | null | undefined,
  page: number = 1,
  limit: number = 20
): Promise<{ rooms: IWhiteboardRoom[]; total: number; page: number; totalPages: number }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    WhiteboardRoom.find({
      $or: [{ createdBy: userId }, { participants: userId }],
    })
      .populate('createdBy', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WhiteboardRoom.countDocuments({
      $or: [{ createdBy: userId }, { participants: userId }],
    }),
  ]);

  return {
    rooms: rooms as IWhiteboardRoom[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Room delete/close করে
 */
const deleteRoom = async (roomId: string, userId: string | null | undefined): Promise<void> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const room = await WhiteboardRoom.findById(roomId);

  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Whiteboard room not found');
  }

  if (room.createdBy.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only room creator can delete this room'
    );
  }

  // Close in Agora
  await closeWhiteboardRoom(room.uuid);

  // Update in database
  room.isActive = false;
  await room.save();
};

/**
 * Snapshot নেয়
 */
const takeSnapshot = async (
  roomId: string,
  userId: string | null | undefined,
  scenePath?: string
): Promise<{ snapshotUrl: string }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const room = await WhiteboardRoom.findById(roomId);

  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Whiteboard room not found');
  }

  const isParticipant = room.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not a participant of this room'
    );
  }

  const snapshotUrl = await takeWhiteboardSnapshot(room.uuid, scenePath);

  // Save snapshot to room
  room.snapshots.push({
    url: snapshotUrl,
    takenAt: new Date(),
    takenBy: new Types.ObjectId(userId),
  });
  room.lastSavedAt = new Date();
  await room.save();

  return { snapshotUrl };
};

/**
 * Room snapshots দেখায়
 */
const getRoomSnapshots = async (
  roomId: string,
  userId: string | null | undefined
): Promise<IWhiteboardRoom['snapshots']> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const room = await WhiteboardRoom.findById(roomId)
    .populate('snapshots.takenBy', 'name profilePicture')
    .lean();

  if (!room) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Whiteboard room not found');
  }

  const isParticipant = room.participants.some(
    (p: any) => p.toString() === userId
  );

  if (!isParticipant && room.createdBy.toString() !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You do not have access to this room'
    );
  }

  return room.snapshots;
};

/**
 * Call এর জন্য whiteboard তৈরি বা আনা
 */
const getOrCreateRoomForCall = async (
  callId: string,
  userId: string | null | undefined
): Promise<{ room: IWhiteboardRoom; token: string; isNew: boolean }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  // Check if room already exists for this call
  let room = await WhiteboardRoom.findOne({ callId });

  if (room) {
    const token = await generateWhiteboardRoomToken(room.uuid, 'writer');

    // Add user to participants if not already
    const isParticipant = room.participants.some(
      p => p.toString() === userId
    );

    if (!isParticipant) {
      room.participants.push(new Types.ObjectId(userId));
      await room.save();
    }

    return { room: room.toObject() as IWhiteboardRoom, token, isNew: false };
  }

  // Create new room
  const { room: newRoom, token } = await createRoom(
    userId,
    `Call Whiteboard - ${callId}`,
    callId
  );

  return { room: newRoom, token, isNew: true };
};

export const WhiteboardService = {
  createRoom,
  getRoomToken,
  getRoomTokenByUuid,
  getUserRooms,
  deleteRoom,
  takeSnapshot,
  getRoomSnapshots,
  getOrCreateRoomForCall,
};
