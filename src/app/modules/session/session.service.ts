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
// import { generateGoogleMeetLink } from '../../../helpers/googleMeetHelper'; // Phase 8

// ============================================
// 🧪 TEST MODE CONFIGURATION
// ============================================
// Set to true for testing with 5 minute sessions
// Set to false for production (60 minute sessions)
const TEST_MODE = true;

// Test mode: 5 min session, 80% = 4 min (240 seconds)
// Production: 60 min session, 80% = 48 min (2880 seconds)
const TEST_SESSION_DURATION_MINUTES = 5;
const MINIMUM_ATTENDANCE_PERCENTAGE = 80;
// ============================================

/**
 * Propose session (Tutor sends proposal in chat)
 * Creates a message with type: 'session_proposal'
 */
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
  // Verify tutor
  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can propose sessions');
  }

  if (!tutor.tutorProfile?.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only verified tutors can propose sessions');
  }

  // Verify chat exists and tutor is participant
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

  // Get the other participant from chat (should be a student)
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

  // Verify the other participant is actually a student (not admin or other role)
  if (student.role !== USER_ROLES.STUDENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposals can only be sent to students');
  }

  // Check if there's already a pending proposal in this chat
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

  // Check if there's already an active session in this chat (Rule 2: One Session Per Chat)
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

  // Calculate duration
  const startTime = new Date(payload.startTime);
  const endTime = new Date(payload.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

  // Get price based on student's subscription tier
  let pricePerHour = 30; // Default: Flexible
  if (student.studentProfile?.currentPlan === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.currentPlan === 'LONG_TERM') {
    pricePerHour = 25;
  }

  // Fixed price per session (not based on duration)
  // 1 session = 1 session price, regardless of duration
  const totalPrice = pricePerHour;

  // Create session proposal message using MessageService for real-time socket notification
  // expiresAt = startTime (proposal expires when session time passes)
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
      expiresAt: startTime, // Expires when session start time passes
    },
  });

  return message;
};

/**
 * Accept session proposal (Student or Tutor accepts)
 * Student accepts tutor's proposal OR Tutor accepts student's counter-proposal
 * Creates actual session and Google Meet link
 */
const acceptSessionProposal = async (
  messageId: string,
  userId: string
) => {
  // Get proposal message
  const message = await Message.findById(messageId).populate('chatId');
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (message.type !== 'session_proposal' || !message.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  // Verify user is participant
  const chat = message.chatId as any;
  const isParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // User cannot accept their own proposal
  if (message.sender.toString() === userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot accept your own proposal');
  }

  // Check if proposal is still valid
  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  // Check if expired
  if (new Date() > message.sessionProposal.expiresAt) {
    message.sessionProposal.status = 'EXPIRED';
    await message.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposal has expired');
  }

  // Determine student and tutor IDs based on who sent the proposal
  // If proposal sender is the tutor, then accepter is the student (normal flow)
  // If proposal sender is the student (counter-proposal), then accepter is the tutor
  const proposalSender = await User.findById(message.sender);
  const accepter = await User.findById(userId);

  if (!proposalSender || !accepter) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  let studentId: Types.ObjectId;
  let tutorId: Types.ObjectId;

  if (proposalSender.role === USER_ROLES.TUTOR) {
    // Normal flow: Tutor proposed, Student accepts
    tutorId = message.sender;
    studentId = new Types.ObjectId(userId);
  } else if (proposalSender.role === USER_ROLES.STUDENT) {
    // Counter-proposal flow: Student counter-proposed, Tutor accepts
    studentId = message.sender;
    tutorId = new Types.ObjectId(userId);
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid proposal sender role');
  }

  // Check if this is a trial session (chat linked to a trial request)
  const trialRequestId = chat.trialRequestId;
  const isTrial = !!trialRequestId;

  // Create session
  // Note: message.chatId is populated (full Chat object), so we need to extract the _id
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

  // TODO: Generate Google Meet link
  // session.googleMeetLink = await generateGoogleMeetLink({
  //   summary: `Tutoring Session: ${session.subject}`,
  //   description: session.description,
  //   startTime: session.startTime,
  //   endTime: session.endTime,
  //   attendees: [student.email, tutor.email]
  // });
  // await session.save();

  // Update proposal message
  message.sessionProposal.status = 'ACCEPTED';
  message.sessionProposal.sessionId = session._id as Types.ObjectId;
  await message.save();

  // Emit socket event for real-time update
  //@ts-ignore
  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(message._id),
      chatId: chatIdStr,
      status: 'ACCEPTED',
      sessionId: String(session._id),
    };
    // Emit to chat room
    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);
    // Also emit to each participant's user room for guaranteed delivery
    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  // Log activity - Session scheduled
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

  // TODO: Send notifications
  // const otherPartyId = userId === studentId.toString() ? tutorId : studentId;
  // io.to(otherPartyId.toString()).emit('sessionAccepted', {
  //   accepterName: accepter.name,
  //   sessionId: session._id,
  //   meetLink: session.googleMeetLink
  // });

  return session;
};

/**
 * Student counter-proposes alternative time for a session proposal
 * Creates new session_proposal message with the student's preferred time
 */
const counterProposeSession = async (
  originalMessageId: string,
  studentId: string,
  payload: {
    newStartTime: string;
    newEndTime: string;
    reason?: string;
  }
) => {
  // Get original proposal message
  const originalMessage = await Message.findById(originalMessageId).populate('chatId');
  if (!originalMessage) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session proposal not found');
  }

  if (originalMessage.type !== 'session_proposal' || !originalMessage.sessionProposal) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a session proposal');
  }

  // Verify student is participant
  const chat = originalMessage.chatId as any;
  const isStudentParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === studentId
  );
  if (!isStudentParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // Check if proposal is still valid
  if (originalMessage.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${originalMessage.sessionProposal.status.toLowerCase()}`
    );
  }

  // Check if expired
  if (new Date() > originalMessage.sessionProposal.expiresAt) {
    originalMessage.sessionProposal.status = 'EXPIRED';
    await originalMessage.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session proposal has expired');
  }

  // Validate new times
  const newStartTime = new Date(payload.newStartTime);
  const newEndTime = new Date(payload.newEndTime);

  if (newStartTime <= new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New start time must be in the future');
  }

  if (newEndTime <= newStartTime) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'End time must be after start time');
  }

  // Calculate duration
  const duration = (newEndTime.getTime() - newStartTime.getTime()) / (1000 * 60); // minutes

  // Get student for price calculation
  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Student not found');
  }

  // Get price based on student's subscription tier
  let pricePerHour = 30; // Default: Flexible
  if (student.studentProfile?.currentPlan === 'REGULAR') {
    pricePerHour = 28;
  } else if (student.studentProfile?.currentPlan === 'LONG_TERM') {
    pricePerHour = 25;
  }

  // Fixed price per session (not based on duration)
  // 1 session = 1 session price, regardless of duration
  const totalPrice = pricePerHour;

  // Mark original proposal as COUNTER_PROPOSED
  originalMessage.sessionProposal.status = 'COUNTER_PROPOSED';
  await originalMessage.save();

  // Emit socket event for original proposal status update
  //@ts-ignore
  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(originalMessage._id),
      chatId: chatIdStr,
      status: 'COUNTER_PROPOSED',
    };
    // Emit to chat room
    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);
    // Also emit to each participant's user room for guaranteed delivery
    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  // Create new counter-proposal message using MessageService for real-time socket notification
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
      status: 'PROPOSED', // Counter-proposal is also a proposal that tutor can accept
      expiresAt: newStartTime, // Expires when the proposed start time passes
      originalProposalId: originalMessage._id,
      counterProposalReason: payload.reason,
    },
  });

  return counterProposalMessage;
};

/**
 * Reject session proposal (Student or Tutor rejects)
 * Student rejects tutor's proposal OR Tutor rejects student's counter-proposal
 */
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

  // Verify user is participant
  const chat = message.chatId as any;
  const isParticipant = chat.participants.some(
    (p: Types.ObjectId) => p.toString() === userId
  );
  if (!isParticipant) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not a participant in this chat');
  }

  // User cannot reject their own proposal
  if (message.sender.toString() === userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You cannot reject your own proposal');
  }

  // Check if proposal can be rejected
  if (message.sessionProposal.status !== 'PROPOSED') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Session proposal is already ${message.sessionProposal.status.toLowerCase()}`
    );
  }

  // Update proposal
  message.sessionProposal.status = 'REJECTED';
  message.sessionProposal.rejectionReason = rejectionReason;
  await message.save();

  // Emit socket event for real-time update
  //@ts-ignore
  const io = global.io;
  if (io) {
    const chatIdStr = String(chat._id);
    const proposalPayload = {
      messageId: String(message._id),
      chatId: chatIdStr,
      status: 'REJECTED',
      rejectionReason,
    };
    // Emit to chat room
    io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);
    // Also emit to each participant's user room for guaranteed delivery
    for (const participant of chat.participants) {
      io.to(`user::${String(participant)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  return message;
};

/**
 * Get all sessions with filtering
 */
const getAllSessions = async (
  query: Record<string, unknown>,
  userId?: string,
  userRole?: string
) => {
  let filter = {};

  // Filter based on role
  if (userRole === USER_ROLES.STUDENT) {
    filter = { studentId: new Types.ObjectId(userId) };
  } else if (userRole === USER_ROLES.TUTOR) {
    filter = { tutorId: new Types.ObjectId(userId) };
  }
  // SUPER_ADMIN sees all

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

/**
 * Get single session
 */
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

/**
 * Cancel session (Student or Tutor)
 */
const cancelSession = async (
  sessionId: string,
  userId: string,
  cancellationReason: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is student or tutor
  if (
    session.studentId.toString() !== userId &&
    session.tutorId.toString() !== userId
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to cancel this session'
    );
  }

  // Can only cancel SCHEDULED sessions
  if (session.status !== SESSION_STATUS.SCHEDULED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel session with status: ${session.status}`
    );
  }

  // Update session
  session.status = SESSION_STATUS.CANCELLED;
  session.cancellationReason = cancellationReason;
  session.cancelledBy = new Types.ObjectId(userId);
  session.cancelledAt = new Date();
  await session.save();

  // Update the related message's sessionProposal status to reflect cancellation
  if (session.messageId) {
    await Message.findByIdAndUpdate(session.messageId, {
      'sessionProposal.status': 'CANCELLED',
    });

    // Emit socket event for real-time update
    //@ts-ignore
    const io = global.io;
    if (io && session.chatId) {
      const chatIdStr = String(session.chatId);
      const proposalPayload = {
        messageId: String(session.messageId),
        chatId: chatIdStr,
        status: 'CANCELLED',
      };
      // Emit to chat room
      io.to(`chat::${chatIdStr}`).emit('PROPOSAL_UPDATED', proposalPayload);
      // Also emit to student and tutor user rooms for guaranteed delivery
      io.to(`user::${String(session.studentId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
      io.to(`user::${String(session.tutorId)}`).emit('PROPOSAL_UPDATED', proposalPayload);
    }
  }

  // Log activity - Session cancelled
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

  // TODO: Send notifications
  // TODO: Cancel Google Calendar event

  return session;
};

/**
 * Mark session as completed (Manual - for testing, cron job automates this)
 */
const markAsCompleted = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  // Update session
  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  // TODO: Send review request email to student

  return session;
};

/**
 * Auto-complete sessions (Cron job)
 * Marks sessions as COMPLETED after endTime passes
 * Includes SCHEDULED, STARTING_SOON, and IN_PROGRESS sessions
 */
const autoCompleteSessions = async (): Promise<number> => {
  const now = new Date();

  // Find all sessions that should be completed
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

  // Complete each session with proper feedback creation
  for (const session of sessionsToComplete) {
    try {
      session.status = SESSION_STATUS.COMPLETED;
      session.completedAt = now;
      await session.save();

      // Create pending tutor feedback record
      try {
        await TutorSessionFeedbackService.createPendingFeedback(
          session._id.toString(),
          session.tutorId.toString(),
          session.studentId.toString(),
          now
        );
      } catch {
        // Feedback creation failed, but session is still completed
      }

      // Update tutor level after session completion
      try {
        await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
      } catch {
        // Level update failed, but session is still completed
      }

      completedCount++;
    } catch {
      // Continue with next session if one fails
    }
  }

  return completedCount;
};

/**
 * Get upcoming sessions for user
 * Includes: SCHEDULED, STARTING_SOON, IN_PROGRESS, AWAITING_RESPONSE, RESCHEDULE_REQUESTED
 */
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

/**
 * Get completed sessions for user
 * Includes: COMPLETED, CANCELLED, EXPIRED, NO_SHOW
 * Also includes review status information
 */
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

  // Add review status flags
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

/**
 * Request session reschedule
 * Can be requested by student or tutor up to 10 minutes before start
 */
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

  // Verify user is student or tutor
  const isStudent = session.studentId.toString() === userId;
  const isTutor = session.tutorId.toString() === userId;

  if (!isStudent && !isTutor) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not authorized to reschedule this session'
    );
  }

  // Check if session can be rescheduled
  if (
    session.status !== SESSION_STATUS.SCHEDULED &&
    session.status !== SESSION_STATUS.STARTING_SOON
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot reschedule session with status: ${session.status}`
    );
  }

  // Check if already has pending reschedule request
  if (
    session.rescheduleRequest &&
    session.rescheduleRequest.status === RESCHEDULE_STATUS.PENDING
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This session already has a pending reschedule request'
    );
  }

  // Check if within 10 minutes of start
  const now = new Date();
  const tenMinutesBefore = new Date(session.startTime.getTime() - 10 * 60 * 1000);

  if (now >= tenMinutesBefore) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot reschedule within 10 minutes of session start'
    );
  }

  // Calculate new end time (maintain same duration)
  const newStartTime = new Date(payload.newStartTime);
  const newEndTime = new Date(newStartTime.getTime() + session.duration * 60 * 1000);

  // Validate new time is in future
  if (newStartTime <= now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New start time must be in the future');
  }

  // Store previous times
  session.previousStartTime = session.startTime;
  session.previousEndTime = session.endTime;

  // Create reschedule request
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

  // TODO: Send notification to other party
  // const otherPartyId = isStudent ? session.tutorId : session.studentId;
  // io.to(otherPartyId.toString()).emit('rescheduleRequested', {...});

  return session;
};

/**
 * Approve reschedule request
 */
const approveReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is the OTHER party (not the one who requested)
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

  // Verify approver is NOT the requester
  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot approve your own reschedule request'
    );
  }

  // Update session times
  session.startTime = session.rescheduleRequest.newStartTime;
  session.endTime = session.rescheduleRequest.newEndTime;

  // Update reschedule request
  session.rescheduleRequest.status = RESCHEDULE_STATUS.APPROVED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  // Reset status to SCHEDULED
  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  // TODO: Update Google Calendar event
  // TODO: Send notification to requester

  return session;
};

/**
 * Reject reschedule request
 */
const rejectReschedule = async (
  sessionId: string,
  userId: string
): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Verify user is the OTHER party
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

  // Verify rejector is NOT the requester
  if (session.rescheduleRequest.requestedBy.toString() === userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You cannot reject your own reschedule request'
    );
  }

  // Update reschedule request
  session.rescheduleRequest.status = RESCHEDULE_STATUS.REJECTED;
  session.rescheduleRequest.respondedAt = new Date();
  session.rescheduleRequest.respondedBy = new Types.ObjectId(userId);

  // Reset status to SCHEDULED (keep original times)
  session.status = SESSION_STATUS.SCHEDULED;

  await session.save();

  // TODO: Send notification to requester

  return session;
};

/**
 * Session status auto-transitions (Cron job)
 * SCHEDULED -> STARTING_SOON (10 min before)
 * STARTING_SOON -> IN_PROGRESS (at start time)
 * IN_PROGRESS -> COMPLETED (at end time - with feedback creation)
 */
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

  // Debug: Log at start of function
  logger.info(`[Cron] autoTransitionSessionStatuses started - io available: ${!!io}, time: ${now.toISOString()}`);

  // SCHEDULED -> STARTING_SOON (10 minutes before start)
  // Find sessions first to emit socket events, then update
  const sessionsToStartingSoon = await Session.find({
    status: SESSION_STATUS.SCHEDULED,
    startTime: { $lte: tenMinutesFromNow, $gt: now },
  });
  logger.info(`[Cron] Found ${sessionsToStartingSoon.length} sessions for STARTING_SOON transition`);

  for (const session of sessionsToStartingSoon) {
    session.status = SESSION_STATUS.STARTING_SOON;
    await session.save();

    // Update message's sessionProposal.status to match session status
    if (session.messageId) {
      await Message.findByIdAndUpdate(session.messageId, {
        'sessionProposal.status': SESSION_STATUS.STARTING_SOON,
      });
      logger.info(`[Cron] Message ${session.messageId} status updated to STARTING_SOON`);
    }

    // Emit socket event for real-time UI update
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

      // Debug: Check how many sockets are in each room
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

  // STARTING_SOON/SCHEDULED -> IN_PROGRESS (at start time)
  // Find sessions first to emit socket events, then update

  // Debug: Log all STARTING_SOON sessions to see their times
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

    // Update message's sessionProposal.status to match session status
    if (session.messageId) {
      await Message.findByIdAndUpdate(session.messageId, {
        'sessionProposal.status': SESSION_STATUS.IN_PROGRESS,
      });
      logger.info(`[Cron] Message ${session.messageId} status updated to IN_PROGRESS`);
    }

    // Emit socket event for real-time UI update
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

      // Debug: Check how many sockets are in each room
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

  // IN_PROGRESS -> COMPLETED/NO_SHOW/EXPIRED (at end time)
  // Find sessions to complete and process them with attendance check
  const sessionsToComplete = await Session.find({
    status: SESSION_STATUS.IN_PROGRESS,
    endTime: { $lte: now },
  });

  let completedCount = 0;
  let noShowCount = 0;
  let expiredCount = 0;

  for (const session of sessionsToComplete) {
    try {
      // Use attendance-based completion
      const result = await completeSessionWithAttendanceCheck(session._id.toString());

      if (result.session.status === SESSION_STATUS.COMPLETED) {
        completedCount++;
      } else if (result.session.status === SESSION_STATUS.NO_SHOW) {
        noShowCount++;
      } else if (result.session.status === SESSION_STATUS.EXPIRED) {
        expiredCount++;
      }
    } catch {
      // Continue with next session
    }
  }

  // FALLBACK: Handle sessions that missed the transition window
  // These are SCHEDULED or STARTING_SOON sessions whose endTime has already passed
  // This can happen if cron missed the window between startTime and endTime
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

      // STEP 1: First transition to IN_PROGRESS and emit socket
      // This ensures frontend receives IN_PROGRESS status update
      session.status = SESSION_STATUS.IN_PROGRESS;
      session.startedAt = session.startTime; // Use original start time
      await session.save();

      if (session.messageId) {
        await Message.findByIdAndUpdate(session.messageId, {
          'sessionProposal.status': SESSION_STATUS.IN_PROGRESS,
        });
        logger.info(`[Cron] Missed session ${session._id} transitioned to IN_PROGRESS first`);
      }

      // Emit IN_PROGRESS socket event
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

      // STEP 2: Now complete the session with attendance check
      // This will emit NO_SHOW/COMPLETED socket
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

/**
 * Mark session as completed (Enhanced - with tutor feedback creation)
 */
const markAsCompletedEnhanced = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Session is already completed');
  }

  // Update session
  session.status = SESSION_STATUS.COMPLETED;
  session.completedAt = new Date();
  await session.save();

  // Create pending tutor feedback record
  try {
    await TutorSessionFeedbackService.createPendingFeedback(
      sessionId,
      session.tutorId.toString(),
      session.studentId.toString(),
      session.completedAt
    );
  } catch {
    // Feedback creation failed, but session is still completed
    // Log error but don't fail the completion
  }

  // Update tutor level after session completion
  try {
    await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
  } catch {
    // Level update failed, but session is still completed
    // Log error but don't fail the completion
  }

  // Log activity - Session completed
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

  // TODO: Send review request email to student
  // TODO: Send feedback reminder to tutor

  return session;
};

/**
 * Calculate attendance percentage
 */
const calculateAttendancePercentage = (
  totalDurationSeconds: number,
  sessionDurationMinutes: number
): number => {
  const sessionDurationSeconds = sessionDurationMinutes * 60;
  if (sessionDurationSeconds <= 0) return 0;
  const percentage = (totalDurationSeconds / sessionDurationSeconds) * 100;
  return Math.min(100, Math.round(percentage * 100) / 100); // Cap at 100%, round to 2 decimals
};

/**
 * Sync attendance data from Call module to Session
 * Called when session is about to complete or when participant leaves
 */
const syncAttendanceFromCall = async (sessionId: string): Promise<ISession | null> => {
  const session = await Session.findById(sessionId);
  if (!session) return null;

  // Find call for this session
  const call = await Call.findOne({ sessionId: new Types.ObjectId(sessionId) });
  if (!call) {
    // No call record - set attendance to 0%
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

  // Link call to session if not already linked
  if (!session.callId) {
    session.callId = call._id;
  }

  const now = new Date();
  const sessionEndTime = session.endTime;

  // Calculate tutor attendance
  const tutorSessions = call.participantSessions.filter(
    p => p.userId.toString() === session.tutorId.toString()
  );

  let tutorTotalSeconds = 0;
  let tutorFirstJoined: Date | undefined;
  let tutorLastLeft: Date | undefined;

  tutorSessions.forEach(ps => {
    // If session is still open (no leftAt), calculate duration up to session end or now
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

  // Calculate student attendance
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

  // In TEST_MODE, use 5 min duration for attendance calculation
  // In production, use actual session duration (usually 60 min)
  const effectiveDuration = TEST_MODE ? TEST_SESSION_DURATION_MINUTES : session.duration;

  // Update session with attendance data
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

/**
 * Check if attendance meets requirement (80%) for completion
 */
const checkAttendanceRequirement = (session: ISession): {
  canComplete: boolean;
  tutorPercentage: number;
  studentPercentage: number;
  noShowBy?: 'tutor' | 'student';
  reason?: string;
} => {
  // Use global constant for minimum attendance percentage
  const MINIMUM_ATTENDANCE = MINIMUM_ATTENDANCE_PERCENTAGE;

  const tutorPercentage = session.tutorAttendance?.attendancePercentage || 0;
  const studentPercentage = session.studentAttendance?.attendancePercentage || 0;

  // Both have good attendance
  if (tutorPercentage >= MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: true,
      tutorPercentage,
      studentPercentage,
    };
  }

  // Tutor didn't show
  if (tutorPercentage < MINIMUM_ATTENDANCE && studentPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: false,
      tutorPercentage,
      studentPercentage,
      noShowBy: 'tutor',
      reason: `Tutor attendance (${tutorPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
    };
  }

  // Student didn't show
  if (studentPercentage < MINIMUM_ATTENDANCE && tutorPercentage >= MINIMUM_ATTENDANCE) {
    return {
      canComplete: false,
      tutorPercentage,
      studentPercentage,
      noShowBy: 'student',
      reason: `Student attendance (${studentPercentage.toFixed(1)}%) is below minimum ${MINIMUM_ATTENDANCE}%`,
    };
  }

  // Neither showed up properly
  return {
    canComplete: false,
    tutorPercentage,
    studentPercentage,
    reason: `Both participants have low attendance - Tutor: ${tutorPercentage.toFixed(1)}%, Student: ${studentPercentage.toFixed(1)}%`,
  };
};

/**
 * Complete session with attendance check
 * NEW LOGIC: Simple join check instead of 80% attendance
 * - If tutor joined: Student is COMPLETED, Teacher is pending feedback
 * - If tutor didn't join: Neither is completed (no charge to student)
 */
const completeSessionWithAttendanceCheck = async (
  sessionId: string
): Promise<{
  session: ISession;
  attendanceCheck: ReturnType<typeof checkAttendanceRequirement>;
}> => {
  // First sync attendance from call
  await syncAttendanceFromCall(sessionId);

  // Fetch fresh session document
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const now = new Date();

  // Simple join check - did they join at all? (No 80% attendance check)
  const tutorJoined = (session.tutorAttendance?.joinCount || 0) > 0;
  const studentJoined = (session.studentAttendance?.joinCount || 0) > 0;

  // Save join status using set() for Mongoose Document compatibility
  session.set('tutorJoined', tutorJoined);
  session.set('studentJoined', studentJoined);
  session.completedAt = now;

  // Check attendance requirement (for backward compatibility)
  const attendanceCheck = checkAttendanceRequirement(session);

  if (!tutorJoined) {
    // ❌ Tutor didn't join - Student NOT charged
    session.set('studentCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherFeedbackRequired', false);
    session.status = SESSION_STATUS.NO_SHOW;
    session.noShowBy = 'tutor';
  } else {
    // ✅ Tutor joined - Student is COMPLETED, Teacher pending feedback
    session.set('studentCompletionStatus', COMPLETION_STATUS.COMPLETED);
    session.set('studentCompletedAt', now);
    session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
    session.set('teacherFeedbackRequired', true);

    // Main status for backward compatibility
    if (studentJoined) {
      session.status = SESSION_STATUS.COMPLETED;
    } else {
      session.status = SESSION_STATUS.NO_SHOW;
      session.noShowBy = 'student';
    }

    // Create pending feedback record for tutor
    try {
      await TutorSessionFeedbackService.createPendingFeedback(
        sessionId,
        session.tutorId.toString(),
        session.studentId.toString(),
        now
      );
    } catch {
      // Feedback creation failed, but session is still processed
    }

    // Update tutor level
    try {
      await UserService.updateTutorLevelAfterSession(session.tutorId.toString());
    } catch {
      // Level update failed, but session is still processed
    }

    // Deduct hours from student's subscription
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
      // Hours deduction failed, but session is still processed
    }
  }

  await session.save();

  // DEBUG: Log session completion details
  logger.info(`[Session Complete] sessionId: ${session._id}, status: ${session.status}, messageId: ${session.messageId}, chatId: ${session.chatId}`);

  // Update the message's proposal status to match session status (COMPLETED, NO_SHOW, etc.)
  // This enables frontend to show correct calendar button state
  if (session.messageId) {
    const finalStatus = session.status; // COMPLETED, NO_SHOW, or EXPIRED

    // Update message with { new: true } to verify the update
    const updateResult = await Message.findByIdAndUpdate(
      session.messageId,
      {
        'sessionProposal.status': finalStatus,
        'sessionProposal.noShowBy': session.noShowBy,
      },
      { new: true }
    );

    logger.info(`[Message Update] messageId: ${session.messageId}, newStatus: ${updateResult?.sessionProposal?.status || 'UPDATE FAILED'}`);

    // Emit socket event for real-time update
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

      // Debug: Check how many sockets are in each room
      const studentRoomSockets = io.sockets.adapter.rooms.get(studentRoom);
      const tutorRoomSockets = io.sockets.adapter.rooms.get(tutorRoom);
      const chatRoomSockets = io.sockets.adapter.rooms.get(chatRoom);

      logger.info(`[Socket Debug] Room sizes - student(${studentRoom}): ${studentRoomSockets?.size || 0}, tutor(${tutorRoom}): ${tutorRoomSockets?.size || 0}, chat(${chatRoom}): ${chatRoomSockets?.size || 0}`);

      // Emit to chat room
      io.to(chatRoom).emit('PROPOSAL_UPDATED', proposalPayload);
      // Also emit to user rooms for reliability
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
  // Attendance tracking
  syncAttendanceFromCall,
  checkAttendanceRequirement,
  completeSessionWithAttendanceCheck,
};