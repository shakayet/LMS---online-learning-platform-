import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { Chat } from '../chat/chat.model';
import { Message } from '../message/message.model';
import { Subject } from '../subject/subject.model';
import { TrialRequest } from '../trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../trialRequest/trialRequest.interface';
import {
  ISessionRequest,
  SESSION_REQUEST_STATUS,
} from './sessionRequest.interface';
import { SessionRequest } from './sessionRequest.model';

/**
 * Create session request (Returning Student only)
 * Must be logged in and have completed trial
 */
const createSessionRequest = async (
  studentId: string,
  payload: Partial<ISessionRequest>
): Promise<ISessionRequest> => {
  // Validate subject exists
  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

  // Verify student exists and has completed trial
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  if (student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Only students can create session requests'
    );
  }

  // Must have completed trial to create session request
  if (!student.studentProfile?.hasCompletedTrial) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You must complete a trial session before requesting more sessions. Please create a trial request first.'
    );
  }

  // Check if student has pending session request
  const pendingSessionRequest = await SessionRequest.findOne({
    studentId: new Types.ObjectId(studentId),
    status: SESSION_REQUEST_STATUS.PENDING,
  });

  if (pendingSessionRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You already have a pending session request. Please wait for a tutor to accept or cancel it.'
    );
  }

  // Also check for pending trial request (can't have both)
  const pendingTrialRequest = await TrialRequest.findOne({
    studentId: new Types.ObjectId(studentId),
    status: TRIAL_REQUEST_STATUS.PENDING,
  });

  if (pendingTrialRequest) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have a pending trial request. Please wait for it to be accepted or cancel it first.'
    );
  }

  // Create session request
  const sessionRequest = await SessionRequest.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    status: SESSION_REQUEST_STATUS.PENDING,
  });

  // Increment student session request count
  await User.findByIdAndUpdate(studentId, {
    $inc: { 'studentProfile.sessionRequestsCount': 1 },
  });

  // TODO: Send real-time notification to matching tutors
  // TODO: Send confirmation email to student

  return sessionRequest;
};

/**
 * Get matching requests for tutor (UNIFIED: Trial + Session)
 * Shows PENDING requests in tutor's subjects from both collections
 */
const getMatchingSessionRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  // Get tutor's subjects
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
  }

  const tutorSubjects = tutor.tutorProfile?.subjects || [];
  const now = new Date();

  // Pagination params
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter by requestType if provided
  const requestTypeFilter = query.requestType as string | undefined;

  // Base match conditions for session requests
  const sessionMatchConditions: Record<string, unknown> = {
    subject: { $in: tutorSubjects.map(s => new Types.ObjectId(String(s))) },
    status: SESSION_REQUEST_STATUS.PENDING,
    expiresAt: { $gt: now },
  };

  // Base match conditions for trial requests
  const trialMatchConditions: Record<string, unknown> = {
    subject: { $in: tutorSubjects.map(s => new Types.ObjectId(String(s))) },
    status: TRIAL_REQUEST_STATUS.PENDING,
    expiresAt: { $gt: now },
  };

  // Build aggregation pipeline
  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  // If filtering by specific type, skip the $unionWith
  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {
    // Query only trial requests
    const trialResults = await TrialRequest.aggregate([
      { $match: trialMatchConditions },
      { $addFields: { requestType: 'TRIAL' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentId',
          pipeline: [{ $project: { name: 1, profilePicture: 1, studentProfile: 1 } }],
        },
      },
      { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    ]);

    const totalTrialCount = await TrialRequest.countDocuments(trialMatchConditions);

    return {
      meta: {
        total: totalTrialCount,
        limit,
        page,
        totalPage: Math.ceil(totalTrialCount / limit),
      },
      data: trialResults,
    };
  } else {
    // Unified query: both session and trial requests
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } },
      {
        $unionWith: {
          coll: 'trialrequests',
          pipeline: [
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
          ],
        },
      }
    );
  }

  // Add sorting, pagination, and lookups for non-TRIAL-only queries
  if (requestTypeFilter !== 'TRIAL') {
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentId',
          pipeline: [{ $project: { name: 1, profilePicture: 1, studentProfile: 1 } }],
        },
      },
      { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } }
    );
  }

  const result = await SessionRequest.aggregate(pipeline);

  // Get total count for pagination
  let totalCount = 0;
  if (requestTypeFilter === 'SESSION') {
    totalCount = await SessionRequest.countDocuments(sessionMatchConditions);
  } else {
    const [sessionCount, trialCount] = await Promise.all([
      SessionRequest.countDocuments(sessionMatchConditions),
      TrialRequest.countDocuments(trialMatchConditions),
    ]);
    totalCount = sessionCount + trialCount;
  }

  return {
    meta: {
      total: totalCount,
      limit,
      page,
      totalPage: Math.ceil(totalCount / limit),
    },
    data: result,
  };
};

/**
 * Get student's own requests (UNIFIED: Trial + Session)
 * Returns both trial and session requests for the student
 */
const getMySessionRequests = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const studentObjectId = new Types.ObjectId(studentId);

  // Pagination params
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter by requestType if provided
  const requestTypeFilter = query.requestType as string | undefined;
  // Filter by status if provided
  const statusFilter = query.status as string | undefined;

  // Base match conditions
  const sessionMatchConditions: Record<string, unknown> = { studentId: studentObjectId };
  const trialMatchConditions: Record<string, unknown> = { studentId: studentObjectId };

  if (statusFilter) {
    sessionMatchConditions.status = statusFilter;
    trialMatchConditions.status = statusFilter;
  }

  // Build aggregation pipeline
  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {
    // Query only trial requests
    const trialResults = await TrialRequest.aggregate([
      { $match: trialMatchConditions },
      { $addFields: { requestType: 'TRIAL' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'acceptedTutorId',
          foreignField: '_id',
          as: 'acceptedTutorId',
          pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'chats',
          localField: 'chatId',
          foreignField: '_id',
          as: 'chatId',
        },
      },
      { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } },
    ]);

    const totalTrialCount = await TrialRequest.countDocuments(trialMatchConditions);

    return {
      meta: {
        total: totalTrialCount,
        limit,
        page,
        totalPage: Math.ceil(totalTrialCount / limit),
      },
      data: trialResults,
    };
  } else {
    // Unified query: both session and trial requests
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } },
      {
        $unionWith: {
          coll: 'trialrequests',
          pipeline: [
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
          ],
        },
      }
    );
  }

  // Add sorting, pagination, and lookups for non-TRIAL-only queries
  if (requestTypeFilter !== 'TRIAL') {
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'acceptedTutorId',
          foreignField: '_id',
          as: 'acceptedTutorId',
          pipeline: [{ $project: { name: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'chats',
          localField: 'chatId',
          foreignField: '_id',
          as: 'chatId',
        },
      },
      { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } }
    );
  }

  const result = await SessionRequest.aggregate(pipeline);

  // Get total count for pagination
  let totalCount = 0;
  if (requestTypeFilter === 'SESSION') {
    totalCount = await SessionRequest.countDocuments(sessionMatchConditions);
  } else {
    const [sessionCount, trialCount] = await Promise.all([
      SessionRequest.countDocuments(sessionMatchConditions),
      TrialRequest.countDocuments(trialMatchConditions),
    ]);
    totalCount = sessionCount + trialCount;
  }

  return {
    meta: {
      total: totalCount,
      limit,
      page,
      totalPage: Math.ceil(totalCount / limit),
    },
    data: result,
  };
};

/**
 * Get all requests (Admin) - UNIFIED: Trial + Session
 * Returns all trial and session requests for admin dashboard
 */
const getAllSessionRequests = async (query: Record<string, unknown>) => {
  // Pagination params
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter by requestType if provided
  const requestTypeFilter = query.requestType as string | undefined;
  // Filter by status if provided
  const statusFilter = query.status as string | undefined;
  // Search term
  const searchTerm = query.searchTerm as string | undefined;

  // Base match conditions
  const sessionMatchConditions: Record<string, unknown> = {};
  const trialMatchConditions: Record<string, unknown> = {};

  if (statusFilter) {
    sessionMatchConditions.status = statusFilter;
    trialMatchConditions.status = statusFilter;
  }

  if (searchTerm) {
    sessionMatchConditions.description = { $regex: searchTerm, $options: 'i' };
    trialMatchConditions.$or = [
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'studentInfo.name': { $regex: searchTerm, $options: 'i' } },
      { 'studentInfo.email': { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Build aggregation pipeline
  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {
    // Query only trial requests
    const trialResults = await TrialRequest.aggregate([
      { $match: trialMatchConditions },
      { $addFields: { requestType: 'TRIAL' } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentId',
          pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
        },
      },
      { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'acceptedTutorId',
          foreignField: '_id',
          as: 'acceptedTutorId',
          pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'chats',
          localField: 'chatId',
          foreignField: '_id',
          as: 'chatId',
        },
      },
      { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } },
    ]);

    const totalTrialCount = await TrialRequest.countDocuments(trialMatchConditions);

    return {
      meta: {
        total: totalTrialCount,
        limit,
        page,
        totalPage: Math.ceil(totalTrialCount / limit),
      },
      data: trialResults,
    };
  } else {
    // Unified query: both session and trial requests
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } },
      {
        $unionWith: {
          coll: 'trialrequests',
          pipeline: [
            { $match: trialMatchConditions },
            { $addFields: { requestType: 'TRIAL' } },
          ],
        },
      }
    );
  }

  // Add sorting, pagination, and lookups for non-TRIAL-only queries
  if (requestTypeFilter !== 'TRIAL') {
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentId',
          pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
        },
      },
      { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'acceptedTutorId',
          foreignField: '_id',
          as: 'acceptedTutorId',
          pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1 } }],
        },
      },
      { $unwind: { path: '$acceptedTutorId', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
          pipeline: [{ $project: { name: 1, icon: 1 } }],
        },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'chats',
          localField: 'chatId',
          foreignField: '_id',
          as: 'chatId',
        },
      },
      { $unwind: { path: '$chatId', preserveNullAndEmptyArrays: true } }
    );
  }

  const result = await SessionRequest.aggregate(pipeline);

  // Get total count for pagination
  let totalCount = 0;
  if (requestTypeFilter === 'SESSION') {
    totalCount = await SessionRequest.countDocuments(sessionMatchConditions);
  } else {
    const [sessionCount, trialCount] = await Promise.all([
      SessionRequest.countDocuments(sessionMatchConditions),
      TrialRequest.countDocuments(trialMatchConditions),
    ]);
    totalCount = sessionCount + trialCount;
  }

  return {
    meta: {
      total: totalCount,
      limit,
      page,
      totalPage: Math.ceil(totalCount / limit),
    },
    data: result,
  };
};

/**
 * Get single session request
 */
const getSingleSessionRequest = async (id: string): Promise<ISessionRequest | null> => {
  const request = await SessionRequest.findById(id)
    .populate('studentId', 'name email profilePicture phone studentProfile')
    .populate('acceptedTutorId', 'name email profilePicture phone')
    .populate('subject', 'name icon description')
    .populate('chatId');

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  return request;
};

/**
 * Accept session request (Tutor)
 * Creates chat and connects student with tutor
 * Sends introductory message to chat
 */
const acceptSessionRequest = async (
  requestId: string,
  tutorId: string,
  introductoryMessage?: string
): Promise<ISessionRequest | null> => {
  // Verify request exists and is pending
  const request = await SessionRequest.findById(requestId).populate('subject', 'name');
  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session request is no longer available'
    );
  }

  // Check if expired
  if (new Date() > request.expiresAt) {
    request.status = SESSION_REQUEST_STATUS.EXPIRED;
    await request.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This session request has expired');
  }

  // Verify tutor
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

  // Verify tutor teaches this subject (compare ObjectId)
  // Handle both populated and non-populated subject field
  const tutorSubjectIds = tutor.tutorProfile?.subjects?.map(s => s.toString()) || [];
  const requestSubjectId = typeof request.subject === 'object' && request.subject._id
    ? request.subject._id.toString()
    : request.subject.toString();
  if (!tutorSubjectIds.includes(requestSubjectId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You do not teach this subject'
    );
  }

  // Check if chat already exists between tutor and student (to avoid duplicate chats)
  const chatParticipants = [request.studentId, new Types.ObjectId(tutorId)];
  let chat = await Chat.findOne({
    participants: { $all: chatParticipants },
  });

  if (chat) {
    // Reuse existing chat, update session request reference
    chat.sessionRequestId = request._id;
    chat.trialRequestId = undefined; // Clear trial reference so new sessions aren't marked as trial
    await chat.save();
  } else {
    // Create new chat only if none exists
    chat = await Chat.create({
      participants: chatParticipants,
      sessionRequestId: request._id,
    });
  }

  // Send introductory message if provided
  if (introductoryMessage && introductoryMessage.trim()) {
    await Message.create({
      chatId: chat._id,
      sender: new Types.ObjectId(tutorId),
      text: introductoryMessage.trim(),
      type: 'text',
    });
  }

  // Update session request
  request.status = SESSION_REQUEST_STATUS.ACCEPTED;
  request.acceptedTutorId = new Types.ObjectId(tutorId);
  request.chatId = chat._id as Types.ObjectId;
  request.acceptedAt = new Date();
  await request.save();

  // TODO: Send real-time notification to student
  // TODO: Send email to student

  return request;
};

/**
 * Cancel session request (Student) - Permanently deletes the request
 */
const cancelSessionRequest = async (
  requestId: string,
  studentId: string
): Promise<{ deleted: boolean }> => {
  const request = await SessionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  // Verify ownership
  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own session requests'
    );
  }

  // Can only cancel PENDING requests
  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending session requests can be cancelled'
    );
  }

  // Permanently delete the request
  await SessionRequest.findByIdAndDelete(requestId);

  return { deleted: true };
};

/**
 * Extend session request (Student)
 * Adds 7 more days to expiration (max 1 extension)
 * Can only extend when 1 day or less remaining (6+ days passed)
 */
const extendSessionRequest = async (
  requestId: string,
  studentId: string
): Promise<ISessionRequest | null> => {
  const request = await SessionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  // Verify ownership
  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only extend your own session requests'
    );
  }

  // Can only extend PENDING requests
  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending session requests can be extended'
    );
  }

  // Check extension limit (max 1)
  if (request.extensionCount && request.extensionCount >= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Session request can only be extended once'
    );
  }

  // Can only extend when 1 day or less remaining (6+ days passed)
  const timeRemaining = request.expiresAt.getTime() - Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  if (timeRemaining > oneDayInMs) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only extend when 1 day or less is remaining'
    );
  }

  // Extend by 7 days from now
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  request.expiresAt = newExpiresAt;
  request.isExtended = true;
  request.extensionCount = (request.extensionCount || 0) + 1;
  request.finalExpiresAt = undefined;
  request.reminderSentAt = undefined;
  await request.save();

  return request;
};

/**
 * Send reminders for expiring requests (Cron job)
 */
const sendExpirationReminders = async (): Promise<number> => {
  const now = new Date();

  const expiredRequests = await SessionRequest.find({
    status: SESSION_REQUEST_STATUS.PENDING,
    expiresAt: { $lt: now },
    reminderSentAt: { $exists: false },
  }).populate('studentId', 'email name');

  let reminderCount = 0;

  for (const request of expiredRequests) {
    const finalDeadline = new Date();
    finalDeadline.setDate(finalDeadline.getDate() + 3);

    request.reminderSentAt = now;
    request.finalExpiresAt = finalDeadline;
    await request.save();

    // TODO: Send email notification to student
    reminderCount++;
  }

  return reminderCount;
};

/**
 * Auto-delete requests after final deadline (Cron job)
 */
const autoDeleteExpiredRequests = async (): Promise<number> => {
  const result = await SessionRequest.deleteMany({
    status: SESSION_REQUEST_STATUS.PENDING,
    finalExpiresAt: { $lt: new Date() },
  });

  return result.deletedCount;
};

/**
 * Auto-expire session requests (Cron job)
 */
const expireOldRequests = async (): Promise<number> => {
  const result = await SessionRequest.updateMany(
    {
      status: SESSION_REQUEST_STATUS.PENDING,
      finalExpiresAt: { $lt: new Date() },
    },
    {
      $set: { status: SESSION_REQUEST_STATUS.EXPIRED },
    }
  );

  return result.modifiedCount;
};

/**
 * Get tutor's accepted requests (UNIFIED: Trial + Session)
 * Returns both trial and session requests accepted by this tutor
 */
const getMyAcceptedRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const tutorObjectId = new Types.ObjectId(tutorId);

  // Verify tutor exists
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  // Pagination params
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Match conditions
  const sessionMatchConditions = { acceptedTutorId: tutorObjectId };
  const trialMatchConditions = { acceptedTutorId: tutorObjectId };

  // Unified query: both session and trial requests
  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [
    { $match: sessionMatchConditions },
    { $addFields: { requestType: 'SESSION' } },
    {
      $unionWith: {
        coll: 'trialrequests',
        pipeline: [
          { $match: trialMatchConditions },
          { $addFields: { requestType: 'TRIAL' } },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'studentId',
        pipeline: [{ $project: { name: 1, email: 1, profilePicture: 1, studentProfile: 1 } }],
      },
    },
    { $unwind: { path: '$studentId', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'subjects',
        localField: 'subject',
        foreignField: '_id',
        as: 'subject',
        pipeline: [{ $project: { name: 1, icon: 1 } }],
      },
    },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
  ];

  const result = await SessionRequest.aggregate(pipeline);

  // Get total count for pagination
  const [sessionCount, trialCount] = await Promise.all([
    SessionRequest.countDocuments(sessionMatchConditions),
    TrialRequest.countDocuments(trialMatchConditions),
  ]);
  const totalCount = sessionCount + trialCount;

  return {
    meta: {
      total: totalCount,
      limit,
      page,
      totalPage: Math.ceil(totalCount / limit),
    },
    data: result,
  };
};

export const SessionRequestService = {
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
