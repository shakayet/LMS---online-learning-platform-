import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import { Call } from './call.model';
import { ICall, CallType } from './call.interface';
import {
  generateRtcToken,
  generateChannelName,
  generateSessionChannelName,
  userIdToAgoraUid,
} from './agora.helper';
import ApiError from '../../../errors/ApiError';

/**
 * নতুন Call শুরু করে
 */
const initiateCall = async (
  initiatorId: string | null | undefined,
  receiverId: string,
  callType: CallType,
  chatId?: string
): Promise<{ call: ICall; token: string; channelName: string; uid: number }> => {
  if (!initiatorId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const channelName = generateChannelName();
  const uid = userIdToAgoraUid(initiatorId);

  const call = await Call.create({
    channelName,
    callType,
    participants: [initiatorId, receiverId],
    initiator: initiatorId,
    receiver: receiverId,
    status: 'pending',
    chatId: chatId ? new Types.ObjectId(chatId) : undefined,
  });

  const token = generateRtcToken(channelName, uid);

  return { call: call.toObject() as ICall, token, channelName, uid };
};

/**
 * Call Accept করলে token দেয়
 */
const acceptCall = async (
  callId: string,
  userId: string | null | undefined
): Promise<{ call: ICall; token: string; uid: number }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.receiver.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot accept this call');
  }

  if (call.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call is no longer pending');
  }

  call.status = 'active';
  call.startTime = new Date();
  await call.save();

  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(call.channelName, uid);

  return { call: call.toObject() as ICall, token, uid };
};

/**
 * Call Reject করে
 */
const rejectCall = async (callId: string, userId: string | null | undefined): Promise<ICall> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.receiver.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot reject this call');
  }

  if (call.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call is no longer pending');
  }

  call.status = 'rejected';
  call.endTime = new Date();
  await call.save();

  return call.toObject() as ICall;
};

/**
 * Call End করে
 */
const endCall = async (callId: string, userId: string | null | undefined): Promise<ICall> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not in this call');
  }

  call.status = 'ended';
  call.endTime = new Date();

  if (call.startTime) {
    call.duration = Math.floor(
      (call.endTime.getTime() - call.startTime.getTime()) / 1000
    );
  }

  await call.save();

  return call.toObject() as ICall;
};

/**
 * Call Cancel করে (Initiator রিং হওয়ার আগে cancel করলে)
 */
const cancelCall = async (callId: string, userId: string | null | undefined): Promise<ICall> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  if (call.initiator.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only initiator can cancel');
  }

  if (call.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call cannot be cancelled');
  }

  call.status = 'cancelled';
  call.endTime = new Date();
  await call.save();

  return call.toObject() as ICall;
};

/**
 * Token Refresh করে (Call চলাকালীন)
 */
const refreshToken = async (
  callId: string,
  userId: string | null | undefined
): Promise<{ token: string; uid: number }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not in this call');
  }

  if (call.status !== 'active') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Call is not active');
  }

  const uid = userIdToAgoraUid(userId);
  const token = generateRtcToken(call.channelName, uid);

  return { token, uid };
};

/**
 * User এর Call History
 */
const getCallHistory = async (
  userId: string | null | undefined,
  page: number = 1,
  limit: number = 20
): Promise<{ calls: ICall[]; total: number; page: number; totalPages: number }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const skip = (page - 1) * limit;

  const [calls, total] = await Promise.all([
    Call.find({ participants: userId })
      .populate('participants', 'name profilePicture')
      .populate('initiator', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Call.countDocuments({ participants: userId }),
  ]);

  return {
    calls: calls as ICall[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Single Call Details
 */
const getCallById = async (callId: string, userId: string | null | undefined): Promise<ICall> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const call = await Call.findById(callId)
    .populate('participants', 'name profilePicture')
    .populate('initiator', 'name profilePicture')
    .populate('receiver', 'name profilePicture')
    .lean();

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const isParticipant = call.participants.some(
    (p: any) => p._id.toString() === userId
  );

  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot view this call');
  }

  return call as ICall;
};

/**
 * Call এর active participants দেখায়
 */
const getActiveParticipants = async (
  callId: string
): Promise<{ count: number; participants: any[] }> => {
  const call = await Call.findById(callId).populate(
    'participantSessions.userId',
    'name profilePicture'
  );

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const activeParticipants = call.participantSessions
    .filter(p => p.joinedAt && !p.leftAt)
    .map(p => ({
      user: p.userId,
      agoraUid: p.agoraUid,
      joinedAt: p.joinedAt,
    }));

  return {
    count: activeParticipants.length,
    participants: activeParticipants,
  };
};

/**
 * Participant join tracking
 */
const recordParticipantJoin = async (
  callId: string,
  userId: string,
  agoraUid: number
): Promise<{ call: ICall; activeCount: number }> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  call.participantSessions.push({
    userId: new Types.ObjectId(userId),
    agoraUid,
    joinedAt: new Date(),
  });

  const activeCount = call.participantSessions.filter(
    p => p.joinedAt && !p.leftAt
  ).length;

  if (activeCount > call.maxConcurrentParticipants) {
    call.maxConcurrentParticipants = activeCount;
  }

  await call.save();

  return { call: call.toObject() as ICall, activeCount };
};

/**
 * Participant leave tracking
 */
const recordParticipantLeave = async (
  callId: string,
  userId: string
): Promise<{ call: ICall; activeCount: number }> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Call not found');
  }

  const session = call.participantSessions.find(
    p => p.userId.toString() === userId && !p.leftAt
  );

  if (session) {
    session.leftAt = new Date();
    session.duration = Math.floor(
      (session.leftAt.getTime() - session.joinedAt.getTime()) / 1000
    );
  }

  await call.save();

  const activeCount = call.participantSessions.filter(
    p => p.joinedAt && !p.leftAt
  ).length;

  // Auto-end call if no one left
  if (activeCount === 0 && call.status === 'active') {
    call.status = 'ended';
    call.endTime = new Date();
    if (call.startTime) {
      call.duration = Math.floor(
        (call.endTime.getTime() - call.startTime.getTime()) / 1000
      );
    }
    await call.save();
  }

  return { call: call.toObject() as ICall, activeCount };
};

/**
 * Session-based Call Join করে
 * Session এর জন্য call থাকলে join করবে, না থাকলে নতুন তৈরি করবে
 * Both participants will join the SAME channel based on sessionId
 */
const joinSessionCall = async (
  userId: string | null | undefined,
  sessionId: string,
  otherUserId: string,
  callType: CallType = 'video'
): Promise<{ call: ICall; token: string; channelName: string; uid: number; isNew: boolean }> => {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }

  // Generate deterministic channel name from sessionId
  const channelName = generateSessionChannelName(sessionId);
  const uid = userIdToAgoraUid(userId);

  // Check if a call already exists for this session (any status)
  let call = await Call.findOne({ channelName });

  let isNew = false;

  if (!call) {
    // Create new call for this session
    call = await Call.create({
      channelName,
      callType,
      participants: [userId, otherUserId],
      initiator: userId,
      receiver: otherUserId,
      status: 'active', // Session calls start as active immediately
      startTime: new Date(),
      sessionId: new Types.ObjectId(sessionId),
    });
    isNew = true;
  } else if (call.status === 'ended' || call.status === 'cancelled' || call.status === 'missed' || call.status === 'rejected') {
    // Re-activate ended/cancelled call for this session (user rejoining)
    call.status = 'active';
    call.startTime = new Date();
    call.endTime = undefined;
    call.duration = undefined;
    // Make sure this user is a participant
    const isParticipant = call.participants.some(
      p => p.toString() === userId
    );
    if (!isParticipant) {
      call.participants.push(new Types.ObjectId(userId));
    }
    await call.save();
  } else {
    // Call is pending or active - just make sure user is participant
    const isParticipant = call.participants.some(
      p => p.toString() === userId
    );
    if (!isParticipant) {
      call.participants.push(new Types.ObjectId(userId));
      await call.save();
    }
  }

  const token = generateRtcToken(channelName, uid);

  return { call: call.toObject() as ICall, token, channelName, uid, isNew };
};

export const CallService = {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  cancelCall,
  refreshToken,
  getCallHistory,
  getCallById,
  getActiveParticipants,
  recordParticipantJoin,
  recordParticipantLeave,
  joinSessionCall,
};
