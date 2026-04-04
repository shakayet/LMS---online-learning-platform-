import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { Message } from '../message/message.model';
import { MessageService } from '../message/message.service';
import { USER_ROLES } from '../../../enums/user';
import { ISession, ISessionAttendance, SESSION_STATUS, RESCHEDULE_STATUS, COMPLETION_STATUS } from './session.interface';
import { Session } from './session.model';
import { Call } from '../call/call.model';
import { TutorSessionFeedbackService } from '../tutorSessionFeedback/tutorSessionFeedback.service';
import { UserService } from '../user/user.service';
import { ActivityLogService } from '../activityLog/activityLog.service';
import { logger } from '../../../shared/logger';
import { StudentSubscriptionService } from '../studentSubscription/studentSubscription.service';

const TEST_MODE = true;

const TEST_SESSION_DURATION_MINUTES = 5;
const MINIMUM_ATTENDANCE_PERCENTAGE = 80;

const proposeSession = async (
  tutorId: string,
  payload: {
    chatId: string;
    subject: string;
    startTime: string;
    endTime: string;
    description?: string;
  }
) => {

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can propose sessions');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can propose sessions');
  }

  const chat = await Chat.findById(payload.chatId);
  if (!chat) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
  }

  const isTutorParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === tutorId
  );
  if (!isTutorParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  const otherParticipantId = chat.participants.find(
    (p: Types.ObjectId) => p.toString() !== tutorId
  );
  if (!otherParticipantId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No other participant found in chat');
  }

  const student = await User.findById(otherParticipantId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Other participant not found');
  }

  if (student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposals can only be sent to students');
  }

  const pendingProposal = await Message.findOne({
    chatId: chat._id,
    type: 'session_proposal',
    'sessionProposal.status': 'PROPOSED',
  });

  if (pendingProposal) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'There is already a pending session proposal. Please wait for a response before creating a new one.'
    );
  }

  const activeSession = await Session.findOne({
    chatId: chat._id,
    status: {
      $in: [
        SESSION_STATUS.SCHEDULED,
        SESSION_STATUS.STARTING_SOON,
        SESSION_STATUS.IN_PROGRESS,
      ],
    },
  });

  if (activeSession) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'There is already an active session in this chat. Please wait for it to complete before scheduling a new one.'
    );
  }

  const studentId = otherParticipantId;

  const startTime = new Date(payload.startTime);
  const endTime = new Date(payload.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  let pricePerHour = 30;
  if (student.studentProfile?.currentPlan === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.currentPlan === 'LONG_TERM') {
    pricePerHour = 25;
  }

  const totalPrice = pricePerHour;

  const message = await MessageService.sendMessageToDB({
    chatId: payload.chatId,
    sender: tutorId,
    type: 'session_proposal',
    text: `Session proposal: ${payload.subject}`,
    sessionProposal: {
      subject: payload.subject,
      startTime,
      endTime,
      duration,
      price: totalPrice,
      description: payload.description,
      status: 'PROPOSED',
      expiresAt: startTime,
    },
  });

  return message;
};

const acceptSessionProposal = async (
  messageId: string,
  userId: string
) => {

  const message = await Message.findById(messageId).populate('chatId');
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (message.type !== 'session_proposal' || !message.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  const chat = message.chatId as any;
  const isParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  if (message.sender.toString() === userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot accept your own proposal');
  }

  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  if (new Date() > message.sessionProposal.expiresAt) {
    message.sessionProposal.status = 'EXPIRED';
    await message.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposal has expired');
  }

  const proposalSender = await User.findById(message.sender);
  const accepter = await User.findById(userId);

  if (!proposalSender || !accepter) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  let studentId: Types.ObjectId;
  let tutorId: Types.ObjectId;

  if (proposalSender.role === USER_ROLES.TUTOR) {

    tutorId = message.sender;
    studentId = new Types.ObjectId(userId);
  } else if (proposalSender.role === USER_ROLES.STUDENT) {

    studentId = message.sender;
    tutorId = new Types.ObjectId(userId);
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid proposal sender role');
  }

  const trialRequestId = chat.trialRequestId;
  const isTrial = !!trialRequestId;

  const chatIdForSession = typeof chat._id !== 'undefined' ? chat._id : message.chatId;
  const session = await Session.create({
    studentId,
    tutorId,
    subject: message.sessionProposal.subject,
    description: message.sessionProposal.description,
    startTime: message.sessionProposal.startTime,
    endTime: message.sessionProposal.endTime,
    duration: message.sessionProposal.duration,
    pricePerHour: message.sessionProposal.price / (message.sessionProposal.duration / 60),
    totalPrice: message.sessionProposal.price,
    status: SESSION_STATUS.SCHEDULED,
    messageId: message._id as Types.ObjectId,
    chatId: chatIdForSession as Types.ObjectId,
    isTrial,
    trialRequestId,
  });

  message.sessionProposal.status = 'ACCEPTED';
  message.sessionProposal.sessionId = session._id as Types.ObjectId;
  await message.save();

  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(message._id),
      chatId: chatIdStr,
      status: 'ACCEPTED',
      sessionId: String(session._id),
    };

    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  const student = await User.findById(studentId);
  ActivityLogService.logActivity({
    userId: studentId,
    actionType: 'SESSION_SCHEDULED',
    title: 'Session Scheduled',
    description: `${student?.name || 'Student'} scheduled a ${session.subject} session`,
    entityType: 'SESSION',
    entityId: session._id as Types.ObjectId,
    status: 'success',
  });

  return session;
};

const counterProposeSession = async (
  originalMessageId: string,
  studentId: string,
  payload: {
    newStartTime: string;
    newEndTime: string;
    reason?: string;
  }
) => {

  const originalMessage = await Message.findById(originalMessageId).populate('chatId');
  if (!originalMessage) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (originalMessage.type !== 'session_proposal' || !originalMessage.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  const chat = originalMessage.chatId as any;
  const isStudentParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === studentId
  );
  if (!isStudentParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  if (originalMessage.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${originalMessage.sessionProposal.status.toLowerCase()}`
    );
  }

  if (new Date() > originalMessage.sessionProposal.expiresAt) {
    originalMessage.sessionProposal.status = 'EXPIRED';
    await originalMessage.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposal has expired');
  }

  const newStartTime = new Date(payload.newStartTime);
  const newEndTime = new Date(payload.newEndTime);

  if (newStartTime <= new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New start time must be in the future');
  }

  if (newEndTime <= newStartTime) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'End time must be after start time');
  }

  const duration = (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60);

  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  let pricePerHour = 30;
  if (student.studentProfile?.currentPlan === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.currentPlan === 'LONG_TERM') {
    pricePerHour = 25;
  }

  const totalPrice = pricePerHour;

  originalMessage.sessionProposal.status = 'COUNTER_PROPOSED';
  await originalMessage.save();

  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(originalMessage._id),
      chatId: chatIdStr,
      status: 'COUNTER_PROPOSED',
    };

    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  const counterProposalMessage = await MessageService.sendMessageToDB({
    chatId: chat._id.toString(),
    sender: studentId,
    type: 'session_proposal',
    text: `Counter-proposal: ${originalMessage.sessionProposal.subject}`,
    sessionProposal: {
      subject: originalMessage.sessionProposal.subject,
      startTime: newStartTime,
      endTime: newEndTime,
      duration,
      price: totalPrice,
      description: originalMessage.sessionProposal.description,
      status: 'PROPOSED',
      expiresAt: newStartTime,
      originalProposalId: originalMessage._id,
      counterProposalReason: payload.reason,
    },
  });

  return counterProposalMessage;
};

const rejectSessionProposal = async (
  messageId: string,
  userId: string,
  rejectionReason: string
) => {
  const message = await Message.findById(messageId).populate('chatId');
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (message.type !== 'session_proposal' || !message.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  const chat = message.chatId as any;
  const isParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  if (message.sender.toString() === userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot reject your own proposal');
  }

  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  message.sessionProposal.status = 'REJECTED';
  message.sessionProposal.rejectionReason = rejectionReason;
  await message.save();

  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(message._id),
      chatId: chatIdStr,
      status: 'REJECTED',
      rejectionReason,
    };

    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  return message;
};

const getAllSessions = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  if (userRole === USER_ROLES.STUDENT) {
    filter = { studentId: new Types.ObjectId(userId) };
  } else if (userRole === USER_ROLES.TUTOR) {
    filter = { tutorId: new Types.ObjectId(userId) };
  }

  const sessionQuery = new QueryBuilder(
    Session.find(filter)
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  return {
    meta,
    data: result,
  };
};

const getSingleSession = async (id: string): Promise<ISession | null> => {
  const session = await Session.findById(id)
    .populate('studentId', 'name email profilePicture phone')
    .populate('tutorId', 'name email profilePicture phone')
    .populate('chatId')
    .populate('messageId')
    .populate('reviewId');

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  return session;
};

const cancelSession = async (
  sessionId: string,
  userId: string,
  cancellationReason: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (
    session.studentId.toString() !== userId &&
    session.tutorId.toString() !== userId
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this session'
    );
  }

  if (session.status !== SESSION_STATUS.SCHEDULED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel session with status: ${session.status}`
    );
  }

  session.status = SESSION_STATUS.CANCELLED;
  session.cancellationReason = cancellationReason;
  session.cancelledBy = new Types.ObjectId(userId);
  session.cancelledAt = new Date();
  await session.save();

  if (session.messageId) {
    await Message.findByIdAndUpdate(session.messageId, {
      'sessionProposal.status': 'CANCELLED',
    });

    const io = global.io;
    if (io && session.chatId) {
      const chatIdStr = String(session.chatId);
      const proposalPayload = {
        messageId: String(session.messageId),
        chatId: chatIdStr,
        status: 'CANCELLED',
      };

      io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);

      io.to(`user::${String(session.studentId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(`user::${String(session.tutorId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  const cancellingUser = await User.findById(userId);
  ActivityLogService.logActivity({
    userId: new Types.ObjectId(userId),
    actionType: 'SESSION_CANCELLED',
    title: 'Session Cancelled',
    description: `${cancellingUser?.name || 'User'} cancelled a ${session.subject} session`,
    entityType: 'SESSION',
    entityId: session._id as Types.ObjectId,
    status: 'warning',
  });

  return session;
};

const markAsCompleted = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  return session;
};

const autoCompleteSessions = async (): Promise<number> => {
  const now = new Date();

  const sessionsToComplete = await Session.find({
    status: {
      $in: [
        SESSION_STATUS.SCHEDULED,
        SESSION_STATUS.STARTING_SOON,
        SESSION_STATUS.IN_PROGRESS,
      ],
    },
    endTime: { $lt: now },
  });

  let completedCount = 0;

  for (const session of sessionsToComplete) {
    try {
      session.status = SESSION_STATUS.COMPLETED;
      session.completedAt = now;
      await session.save();

      try {
        await TutorSessionFeedbackService.createPendingFeedback(
          session._id.toString(),
          session.tutorId.toString(),
          session.studentId.toString(),
          now
        );
      } catch {

      }

      try {
        await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
      } catch {

      }

      completedCount++;
    } catch {

    }
  }

  return completedCount;
};

const getUpcomingSessions = async (
  userId: string,
  userRole: string,
  query: Record<string, unknown>
) => {
  const now = new Date();
  const filterField = userRole === USER_ROLES.STUDENT ? 'studentId' : 'tutorId';

  const sessionQuery = new QueryBuilder(
    Session.find({
      [filterField]: new Types.ObjectId(userId),
      status: {
        $in: [
          SESSION_STATUS.SCHEDULED,
          SESSION_STATUS.STARTING_SOON,
          SESSION_STATUS.IN_PROGRESS,
          SESSION_STATUS.AWAITING_RESPONSE,
          SESSION_STATUS.RESCHEDULE_REQUESTED,
        ],
      },
      startTime: { $gte: now },
    })
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture averageRating')
      .populate('reviewId')
      .populate('tutorFeedbackId'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  return { data: result, meta };
};

const getCompletedSessions = async (
  userId: string,
  userRole: string,
  query: Record<string, unknown>
) => {
  const filterField = userRole === USER_ROLES.STUDENT ? 'studentId' : 'tutorId';

  const sessionQuery = new QueryBuilder(
    Session.find({
      [filterField]: new Types.ObjectId(userId),
      status: {
        $in: [
          SESSION_STATUS.COMPLETED,
          SESSION_STATUS.CANCELLED,
          SESSION_STATUS.EXPIRED,
          SESSION_STATUS.NO_SHOW,
        ],
      },
    })
      .populate('studentId', 'name email profilePicture')
      .populate('tutorId', 'name email profilePicture averageRating')
      .populate('reviewId')
      .populate('tutorFeedbackId'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const result = await sessionQuery.modelQuery;
  const meta = await sessionQuery.getPaginationInfo();

  const sessionsWithReviewStatus = result.map((session: any) => {
    const sessionObj = session.toObject();
    return {
      ...sessionObj,
      studentReviewStatus: session.reviewId ? 'COMPLETED' : 'PENDING',
      tutorFeedbackStatus: session.tutorFeedbackId ? 'COMPLETED' : 'PENDING',
    };
  });

  return { data: sessionsWithReviewStatus, meta };
};

const requestReschedule = async (
  sessionId: string,
  userId: string,
  payload: {
    newStartTime: string;
    reason?: string;
  }
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reschedule this session'
    );
  }

  if (
    session.status !== SESSION_STATUS.SCHEDULED &&
    session.status !== SESSION_STATUS.STARTING_SOON
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot reschedule session with status: ${session.status}`
    );
  }

  if (
    session.rescheduleRequest &&
    session.rescheduleRequest.status === RESCHEDULE_STATUS.PENDING
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session already has a pending reschedule request'
    );
  }

  const now = new Date();
  const tenMinutesBefore = new Date(session.startTime.getTime() - 10 * 60 * 1000);

  if (now >= tenMinutesBefore) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule within 10 minutes of session start'
    );
  }

  const newStartTime = new Date(payload.newStartTime);
  const newEndTime = new Date(newStartTime.getTime() + session.duration * 60 * 1000);

  if (newStartTime <= now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New start time must be in the future');
  }

  session.previousStartTime = session.startTime;
  session.previousEndTime = session.endTime;

  session.rescheduleRequest = {
    requestedBy: new Types.ObjectId(userId),
    requestedAt: now,
    newStartTime,
    newEndTime,
    reason: payload.reason,
    status: RESCHEDULE_STATUS.PENDING,
  };

  session.status = SESSION_STATUS.RESCHEDULE_REQUESTED;
  await session.save();

  return session;
};

const approveReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to approve this reschedule'
    );
  }

  if (!session.rescheduleRequest) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No reschedule request found');
  }

  if (session.rescheduleRequest.status !== RESCHEDULE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`
    );
  }

  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot approve your own reschedule request'
    );
  }

  session.startTime = session.rescheduleRequest.newStartTime;
  session.endTime = session.rescheduleRequest.newEndTime;

  session.rescheduleRequest.status = RESCHEDULE_STATUS.APPROVED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  return session;
};

const rejectReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reject this reschedule'
    );
  }

  if (!session.rescheduleRequest) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No reschedule request found');
  }

  if (session.rescheduleRequest.status !== RESCHEDULE_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reschedule request is already ${session.rescheduleRequest.status.toLowerCase()}`
    );
  }

  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot reject your own reschedule request'
    );
  }

  session.rescheduleRequest.status = RESCHEDULE_STATUS.REJECTED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  return session;
};

const autoTransitionSessionStatuses = async (): Promise<{
  startingSoon: number;
  inProgress: number;
  completed: number;
  noShow: number;
  expired: number;
}> => {
  const now = new Date();
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
  const io = global.io;

  logger.info(`[Cron] autoTransitionSessionStatuses started - io available: ${!!io}, time: ${now.toISOString()}`);

  const sessionsToStartingSoon = await Session.find({
    status: SESSION_STATUS.SCHEDULED,
    startTime: { $lte: tenMinutesFromNow, $gt: now },
  });
  logger.info(`[Cron] Found ${sessionsToStartingSoon.length} sessions for STARTING_SOON transition`);

  for (const session of sessionsToStartingSoon) {
    session.status = SESSION_STATUS.STARTING_SOON;
    await session.save();

    if (session.messageId) {
      await Message.findByIdAndUpdate(session.messageId, {
        'sessionProposal.status': SESSION_STATUS.STARTING_SOON,
      });
      logger.info(`[Cron] Message ${session.messageId} status updated to STARTING_SOON`);
    }

    if (io && session.chatId && session.messageId) {
      const chatIdStr = String(session.chatId);
      const studentRoom = `user::${String(session.studentId)}`;
      const tutorRoom = `user::${String(session.tutorId)}`;
      const chatRoom = `chat::${chatIdStr}`;

      const proposalPayload = {
        messageId: String(session.messageId),
        chatId: chatIdStr,
        status: SESSION_STATUS.STARTING_SOON,
        sessionId: String(session._id),
      };

      const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
      const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
      const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);

      logger.info(`[Cron] STARTING_SOON - Room sizes - student(${studentRoom}): ${studentRoomSockets?.size || 0}, tutor(${tutorRoom}): ${tutorRoomSockets?.size || 0}, chat(${chatRoom}): ${chatRoomSockets?.size || 0}`);

      io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      logger.info(`[Cron] STARTING_SOON socket emitted for session ${session._id}`);
    } else {
      logger.warn(`[Cron] Cannot emit STARTING_SOON - io: ${!!io}, chatId: ${!!session.chatId}, messageId: ${!!session.messageId}`);
    }
  }

  const allStartingSoonSessions = await Session.find({
    status: SESSION_STATUS.STARTING_SOON,
  });
  if (allStartingSoonSessions.length > 0) {
    logger.info(`[Cron Debug] All STARTING_SOON sessions:`);
    for (const s of allStartingSoonSessions) {
      logger.info(`[Cron Debug] Session ${s._id}: startTime=${s.startTime?.toISOString()}, endTime=${s.endTime?.toISOString()}, now=${now.toISOString()}, startTime <= now: ${s.startTime <= now}, endTime > now: ${s.endTime > now}`);
    }
  }

  const sessionsToInProgress = await Session.find({
    status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
    startTime: { $lte: now },
    endTime: { $gt: now },
  });
  logger.info(`[Cron] Found ${sessionsToInProgress.length} sessions for IN_PROGRESS transition`);

  for (const session of sessionsToInProgress) {
    session.status = SESSION_STATUS.IN_PROGRESS;
    session.startedAt = now;
    await session.save();

    if (session.messageId) {
      await Message.findByIdAndUpdate(session.messageId, {
        'sessionProposal.status': SESSION_STATUS.IN_PROGRESS,
      });
      logger.info(`[Cron] Message ${session.messageId} status updated to IN_PROGRESS`);
    }

    if (io && session.chatId && session.messageId) {
      const chatIdStr = String(session.chatId);
      const studentRoom = `user::${String(session.studentId)}`;
      const tutorRoom = `user::${String(session.tutorId)}`;
      const chatRoom = `chat::${chatIdStr}`;

      const proposalPayload = {
        messageId: String(session.messageId),
        chatId: chatIdStr,
        status: SESSION_STATUS.IN_PROGRESS,
        sessionId: String(session._id),
      };

      const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
      const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
      const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);

      logger.info(`[Cron] IN_PROGRESS - Room sizes - student(${studentRoom}): ${studentRoomSockets?.size || 0}, tutor(${tutorRoom}): ${tutorRoomSockets?.size || 0}, chat(${chatRoom}): ${chatRoomSockets?.size || 0}`);

      io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      logger.info(`[Cron] IN_PROGRESS socket emitted for session ${session._id}`);
    } else {
      logger.warn(`[Cron] Cannot emit IN_PROGRESS - io: ${!!io}, chatId: ${!!session.chatId}, messageId: ${!!session.messageId}`);
    }
  }

  const sessionsToComplete = await Session.find({
    status: SESSION_STATUS.IN_PROGRESS,
    endTime: { $lte: now },
  });

  let completedCount = 0;
  let noShowCount = 0;
  let expiredCount = 0;

  for (const session of sessionsToComplete) {
    try {

      const result = await completeSessionWithAttendanceCheck(session._id.toString());

      if (result.session.status === SESSION_STATUS.COMPLETED) {
        completedCount++;
      } else if (result.session.status === SESSION_STATUS.NO_SHOW) {
        noShowCount++;
      } else if (result.session.status === SESSION_STATUS.EXPIRED) {
        expiredCount++;
      }
    } catch {

    }
  }

  const missedSessions = await Session.find({
    status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.STARTING_SOON] },
    endTime: { $lte: now },
  });
  logger.info(`[Cron] Found ${missedSessions.length} missed sessions (SCHEDULED/STARTING_SOON but endTime passed)`);

  for (const session of missedSessions) {
    try {
      const chatIdStr = session.chatId ? String(session.chatId) : '';
      const studentRoom = `user::${String(session.studentId)}`;
      const tutorRoom = `user::${String(session.tutorId)}`;
      const chatRoom = `chat::${chatIdStr}`;

      session.status = SESSION_STATUS.IN_PROGRESS;
      session.startedAt = session.startTime;
      await session.save();

      if (session.messageId) {
        await Message.findByIdAndUpdate(session.messageId, {
          'sessionProposal.status': SESSION_STATUS.IN_PROGRESS,
        });
        logger.info(`[Cron] Missed session ${session._id} transitioned to IN_PROGRESS first`);
      }

      if (io && session.chatId && session.messageId) {
        const inProgressPayload = {
          messageId: String(session.messageId),
          chatId: chatIdStr,
          status: SESSION_STATUS.IN_PROGRESS,
          sessionId: String(session._id),
        };

        io.to(chatRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
        io.to(studentRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
        io.to(tutorRoom).emit('PROPOSAL_UPDATED', inProgressPayload);
        logger.info(`[Cron] IN_PROGRESS socket emitted for missed session ${session._id}`);
      }

      const result = await completeSessionWithAttendanceCheck(session._id.toString());

      if (result.session.status === SESSION_STATUS.COMPLETED) {
        completedCount++;
      } else if (result.session.status === SESSION_STATUS.NO_SHOW) {
        noShowCount++;
      } else if (result.session.status === SESSION_STATUS.EXPIRED) {
        expiredCount++;
      }

      logger.info(`[Cron] Missed session ${session._id} completed with status: ${result.session.status}`);
    } catch (error) {
      logger.error(`[Cron] Failed to process missed session ${session._id}:`, error);
    }
  }

  return {
    startingSoon: sessionsToStartingSoon.length,
    inProgress: sessionsToInProgress.length,
    completed: completedCount,
    noShow: noShowCount,
    expired: expiredCount,
  };
};

const markAsCompletedEnhanced = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  try {
    await TutorSessionFeedbackService.createPendingFeedback(
      sessionId,
      session.tutorId.toString(),
      session.studentId.toString(),
      session.completedAt
    );
  } catch {

  }

  try {
    await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
  } catch {

  }

  const tutor = await User.findById(session.tutorId);
  const student = await User.findById(session.studentId);
  ActivityLogService.logActivity({
    userId: session.studentId,
    actionType: 'SESSION_COMPLETED',
    title: 'Session Completed',
    description: `${student?.name || 'Student'} completed a ${session.subject} session with ${tutor?.name || 'Tutor'}`,
    entityType: 'SESSION',
    entityId: session._id as Types.ObjectId,
    status: 'success',
  });

  return session;
};

const calculateAttendancePercentage = (
  totalDurationSeconds: number,
  sessionDurationMinutes: number
): number => {
  const sessionDurationSeconds = sessionDurationMinutes * 60;
  if (sessionDurationSeconds <= 0) return 0;
  const percentage = (totalDurationSeconds / sessionDurationSeconds) * 100;
  return Math.min(100, Math.round(percentage * 100) / 100);
};

const syncAttendanceFromCall = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);
  if (!session) return null;

  const call = await Call.findOne({ sessionId: new Types.ObjectId(sessionId) });
  if (!call) {

    session.tutorAttendance = {
      odId: session.tutorId,
      totalDurationSeconds: 0,
      attendancePercentage: 0,
      joinCount: 0,
    };
    session.studentAttendance = {
      odId: session.studentId,
      totalDurationSeconds: 0,
      attendancePercentage: 0,
      joinCount: 0,
    };
    await session.save();
    return session;
  }

  if (!session.callId) {
    session.callId = call._id;
  }

  const now = new Date();
  const sessionEndTime = session.endTime;

  const tutorSessions = call.participantSessions.filter(
    p => p.userId.toString() === session.tutorId.toString()
  );

  let tutorTotalSeconds = 0;
  let tutorFirstJoined: Date | undefined;
  let tutorLastLeft: Date | undefined;

  tutorSessions.forEach(ps => {

    if (ps.joinedAt && !ps.leftAt) {
      const endPoint = sessionEndTime < now ? sessionEndTime : now;
      const duration = Math.floor((endPoint.getTime() - ps.joinedAt.getTime()) / 1000);
      tutorTotalSeconds += Math.max(0, duration);
    } else if (ps.duration) {
      tutorTotalSeconds += ps.duration;
    }

    if (!tutorFirstJoined || (ps.joinedAt && ps.joinedAt < tutorFirstJoined)) {
      tutorFirstJoined = ps.joinedAt;
    }
    if (!tutorLastLeft || (ps.leftAt && ps.leftAt > tutorLastLeft)) {
      tutorLastLeft = ps.leftAt;
    }
  });

  const studentSessions = call.participantSessions.filter(
    p => p.userId.toString() === session.studentId.toString()
  );

  let studentTotalSeconds = 0;
  let studentFirstJoined: Date | undefined;
  let studentLastLeft: Date | undefined;

  studentSessions.forEach(ps => {
    if (ps.joinedAt && !ps.leftAt) {
      const endPoint = sessionEndTime < now ? sessionEndTime : now;
      const duration = Math.floor((endPoint.getTime() - ps.joinedAt.getTime()) / 1000);
      studentTotalSeconds += Math.max(0, duration);
    } else if (ps.duration) {
      studentTotalSeconds += ps.duration;
    }

    if (!studentFirstJoined || (ps.joinedAt && ps.joinedAt < studentFirstJoined)) {
      studentFirstJoined = ps.joinedAt;
    }
    if (!studentLastLeft || (ps.leftAt && ps.leftAt > studentLastLeft)) {
      studentLastLeft = ps.leftAt;
    }
  });

  const effectiveDuration = TEST_MODE ? TEST_SESSION_DURATION_MINUTES : session.duration;

  session.tutorAttendance = {
    odId: session.tutorId,
    firstJoinedAt: tutorFirstJoined,
    lastLeftAt: tutorLastLeft,
    totalDurationSeconds: tutorTotalSeconds,
    attendancePercentage: calculateAttendancePercentage(tutorTotalSeconds, effectiveDuration),
    joinCount: tutorSessions.length,
  };

  session.studentAttendance = {
    odId: session.studentId,
    firstJoinedAt: studentFirstJoined,
    lastLeftAt: studentLastLeft,
    totalDurationSeconds: studentTotalSeconds,
    attendancePercentage: calculateAttendancePercentage(studentTotalSeconds, effectiveDuration),
    joinCount: studentSessions.length,
  };

  await session.save();
  return session;
};

const checkAttendanceRequirement = (session: ISession): {
  canComplete: boolean;
  tutorPercentage: number;
  studentPercentage: number;
  noShowBy?: 'tutor' | 'student';
  reason?: string;
} => {

  const MINIMUM_ATTENDANCE = MINIMUM_ATTENDANCE_PERCENTAGE;

  const tutorPercentage = session.tutorAttendance?.attendancePercentage || 0;
  const studentPercentage = session.studentAttendance?.attendancePercentage || 0;

  if (tutorPercentage >= MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: true,
      tutorPercentage,
      studentPercentage,
    };
  }

  if (tutorPercentage < MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: false,
      tutorPercentage,
      studentPercentage,
      noShowBy: 'tutor',
      reason: `Tutor attendance (${tutorPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
    };
  }

  if (studentPercentage < MINIMUM_ATTENDANCE && tutorPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: false,
      tutorPercentage,
      studentPercentage,
      noShowBy: 'student',
      reason: `Student attendance (${studentPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
    };
  }

  return {
    canComplete: false,
    tutorPercentage,
    studentPercentage,
    reason: `Both participants have low attendance - Tutor: ${tutorPercentage.toFixed(1)}%, Student: ${studentPercentage.toFixed(1)}%`,
  };
};

const completeSessionWithAttendanceCheck = async (
  sessionId: string
): Promise<{
  session: ISession;
  attendanceCheck: ReturnType<typeof checkAttendanceRequirement>;
}> => {

  await syncAttendanceFromCall(sessionId);

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const now = new Date();

  const tutorJoined = (session.tutorAttendance?.joinCount || 0) > 0;
  const studentJoined = (session.studentAttendance?.joinCount || 0) > 0;

  session.set('tutorJoined', tutorJoined);
  session.set('studentJoined', studentJoined);
  session.completedAt = now;

  const attendanceCheck = checkAttendanceRequirement(session);

  if (!tutorJoined) {

    session.set('studentCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherFeedbackRequired', false);
    session.status = SESSION_STATUS.NO_SHOW;
    session.noShowBy = 'tutor';
  } else {

    session.set('studentCompletionStatus', COMPLETION_STATUS.COMPLETED);
    session.set('studentCompletedAt', now);
    session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherFeedbackRequired', true);

    if (studentJoined) {
      session.status = SESSION_STATUS.COMPLETED;
    } else {
      session.status = SESSION_STATUS.NO_SHOW;
      session.noShowBy = 'student';
    }

    try {
      await TutorSessionFeedbackService.createPendingFeedback(
        sessionId,
        session.tutorId.toString(),
        session.studentId.toString(),
        now
      );
    } catch {

    }

    try {
      await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
    } catch {

    }

    try {
      const sessionDurationMinutes =
        (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
      const sessionDurationHours = sessionDurationMinutes / 60;
      await StudentSubscriptionService.incrementHoursTaken(
        session.studentId.toString(),
        sessionDurationHours
      );
      logger.info(`[Subscription] Deducted ${sessionDurationHours} hours from student ${session.studentId}`);
    } catch (err) {
      logger.error(`[Subscription] Failed to deduct hours for session ${session._id}:`, err);

    }
  }

  await session.save();

  logger.info(`[Session Complete] sessionId: ${session._id}, status: ${session.status}, messageId: ${session.messageId}, chatId: ${session.chatId}`);

  if (session.messageId) {
    const finalStatus = session.status;

    const updateResult = await Message.findByIdAndUpdate(
      session.messageId,
      {
        'sessionProposal.status': finalStatus,
        'sessionProposal.noShowBy': session.noShowBy,
      },
      { new: true }
    );

    logger.info(`[Message Update] messageId: ${session.messageId}, newStatus: ${updateResult?.sessionProposal?.status || 'UPDATE FAILED'}`);

    const io = global.io;
    if (io && session.chatId) {
      const chatIdStr = String(session.chatId);
      const studentRoom = `user::${String(session.studentId)}`;
      const tutorRoom = `user::${String(session.tutorId)}`;
      const chatRoom = `chat::${chatIdStr}`;

      const proposalPayload = {
        messageId: String(session.messageId),
        chatId: chatIdStr,
        status: finalStatus,
        sessionId: String(session._id),
        noShowBy: session.noShowBy,
      };

      const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
      const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
      const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);

      logger.info(`[Socket Debug] Room sizes - student(${studentRoom}): ${studentRoomSockets?.size || 0}, tutor(${tutorRoom}): ${tutorRoomSockets?.size || 0}, chat(${chatRoom}): ${chatRoomSockets?.size || 0}`);

      io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);

      io.to(studentRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(tutorRoom).emit('PROPOSAL_UPDATED', proposalPayload);

      logger.info(`[Socket Emit] PROPOSAL_UPDATED (${finalStatus}) sent to ${chatRoom}, ${studentRoom}, ${tutorRoom}`);
      logger.info(`[Socket Emit] Payload: ${JSON.stringify(proposalPayload)}`);
    } else {
      logger.warn(`[Socket Emit] No socket.io instance (io: ${!!io}) or chatId (${session.chatId}) available`);
    }
  } else {
    logger.warn(`[Session Complete] No messageId found for session ${session._id} - cannot update proposal status`);
  }

  return { session: session.toObject() as ISession, attendanceCheck };
};

export const SessionService = {
  proposeSession,
  acceptSessionProposal,
  counterProposeSession,
  rejectSessionProposal,
  getAllSessions,
  getSingleSession,
  cancelSession,
  markAsCompleted,
  autoCompleteSessions,
  getUpcomingSessions,
  getCompletedSessions,
  requestReschedule,
  approveReschedule,
  rejectReschedule,
  autoTransitionSessionStatuses,
  markAsCompletedEnhanced,

  syncAttendanceFromCall,
  checkAttendanceRequirement,
  completeSessionWithAttendanceCheck,
};