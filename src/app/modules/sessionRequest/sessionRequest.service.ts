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

const createSessionRequest = async (
  studentId: string,
  payload: Partial<ISessionRequest>
): Promise<ISessionRequest> => {

  const subjectExists = await Subject.findById(payload.subject);
  if (!subjectExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Subject not found');
  }

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

  if (!student.studentProfile?.hasCompletedTrial) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You must complete a trial session before requesting more sessions. Please create a trial request first.'
    );
  }

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

  const sessionRequest = await SessionRequest.create({
    ...payload,
    studentId: new Types.ObjectId(studentId),
    status: SESSION_REQUEST_STATUS.PENDING,
  });

  await User.findByIdAndUpdate(studentId, {
    $inc: { 'studentProfile.sessionRequestsCount': 1 },
  });

  return sessionRequest;
};

const getMatchingSessionRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can view matching requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can view session requests');
  }

  const tutorSubjects = tutor.tutorProfile?.subjects || [];
  const now = new Date();

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const requestTypeFilter = query.requestType as string | undefined;

  const sessionMatchConditions: Record<string, unknown> = {
    subject: { $in: tutorSubjects.map(s => new Types.ObjectId(String(s))) },
    status: SESSION_REQUEST_STATUS.PENDING,
    expiresAt: { $gt: now },
  };

  const trialMatchConditions: Record<string, unknown> = {
    subject: { $in: tutorSubjects.map(s => new Types.ObjectId(String(s))) },
    status: TRIAL_REQUEST_STATUS.PENDING,
    expiresAt: { $gt: now },
  };

  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {

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

const getMySessionRequests = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const studentObjectId = new Types.ObjectId(studentId);

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const requestTypeFilter = query.requestType as string | undefined;

  const statusFilter = query.status as string | undefined;

  const sessionMatchConditions: Record<string, unknown> = { studentId: studentObjectId };
  const trialMatchConditions: Record<string, unknown> = { studentId: studentObjectId };

  if (statusFilter) {
    sessionMatchConditions.status = statusFilter;
    trialMatchConditions.status = statusFilter;
  }

  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {

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

const getAllSessionRequests = async (query: Record<string, unknown>) => {

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const requestTypeFilter = query.requestType as string | undefined;

  const statusFilter = query.status as string | undefined;

  const searchTerm = query.searchTerm as string | undefined;

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

  const pipeline: Parameters<typeof SessionRequest.aggregate>[0] = [];

  if (requestTypeFilter === 'SESSION') {
    pipeline.push(
      { $match: sessionMatchConditions },
      { $addFields: { requestType: 'SESSION' } }
    );
  } else if (requestTypeFilter === 'TRIAL') {

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

const acceptSessionRequest = async (
  requestId: string,
  tutorId: string,
  introductoryMessage?: string
): Promise<ISessionRequest | null> => {

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

  if (new Date() > request.expiresAt) {
    request.status = SESSION_REQUEST_STATUS.EXPIRED;
    await request.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This session request has expired');
  }

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can accept requests');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can accept requests');
  }

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

  const chatParticipants = [request.studentId, new Types.ObjectId(tutorId)];
  let chat = await Chat.findOne({
    participants: { $all: chatParticipants },
  });

  if (chat) {

    chat.sessionRequestId = request._id;
    chat.trialRequestId = undefined;
    await chat.save();
  } else {

    chat = await Chat.create({
      participants: chatParticipants,
      sessionRequestId: request._id,
    });
  }

  if (introductoryMessage && introductoryMessage.trim()) {
    await Message.create({
      chatId: chat._id,
      sender: new Types.ObjectId(tutorId),
      text: introductoryMessage.trim(),
      type: 'text',
    });
  }

  request.status = SESSION_REQUEST_STATUS.ACCEPTED;
  request.acceptedTutorId = new Types.ObjectId(tutorId);
  request.chatId = chat._id as Types.ObjectId;
  request.acceptedAt = new Date();
  await request.save();

  return request;
};

const cancelSessionRequest = async (
  requestId: string,
  studentId: string
): Promise<{ deleted: boolean }> => {
  const request = await SessionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only cancel your own session requests'
    );
  }

  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending session requests can be cancelled'
    );
  }

  await SessionRequest.findByIdAndDelete(requestId);

  return { deleted: true };
};

const extendSessionRequest = async (
  requestId: string,
  studentId: string
): Promise<ISessionRequest | null> => {
  const request = await SessionRequest.findById(requestId);

  if (!request) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session request not found');
  }

  if (request.studentId.toString() !== studentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only extend your own session requests'
    );
  }

  if (request.status !== SESSION_REQUEST_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only pending session requests can be extended'
    );
  }

  if (request.extensionCount && request.extensionCount >= 1) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Session request can only be extended once'
    );
  }

  const timeRemaining = request.expiresAt.getTime() - Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  if (timeRemaining > oneDayInMs) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only extend when 1 day or less is remaining'
    );
  }

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

    reminderCount++;
  }

  return reminderCount;
};

const autoDeleteExpiredRequests = async (): Promise<number> => {
  const result = await SessionRequest.deleteMany({
    status: SESSION_REQUEST_STATUS.PENDING,
    finalExpiresAt: { $lt: new Date() },
  });

  return result.deletedCount;
};

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

const getMyAcceptedRequests = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const tutorObjectId = new Types.ObjectId(tutorId);

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access this endpoint');
  }

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const sessionMatchConditions = { acceptedTutorId: tutorObjectId };
  const trialMatchConditions = { acceptedTutorId: tutorObjectId };

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
