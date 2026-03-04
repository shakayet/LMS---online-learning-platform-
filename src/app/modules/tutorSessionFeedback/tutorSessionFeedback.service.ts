import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { Session } from '../session/session.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../session/session.interface';
import { User } from '../user/user.model';
import { TutorSessionFeedback } from './tutorSessionFeedback.model';
import {
  ITutorSessionFeedback,
  FEEDBACK_STATUS,
  FEEDBACK_TYPE,
} from './tutorSessionFeedback.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { emailHelper } from '../../../helpers/emailHelper';
import { format } from 'date-fns';

// Helper to calculate due date (3rd of next month)
const calculateDueDate = (sessionDate: Date): Date => {
  const dueDate = new Date(sessionDate);
  dueDate.setMonth(dueDate.getMonth() + 1);
  dueDate.setDate(3);
  dueDate.setHours(23, 59, 59, 999); // End of day
  return dueDate;
};

// Create feedback record when session is completed
const createPendingFeedback = async (
  sessionId: string,
  tutorId: string,
  studentId: string,
  sessionCompletedAt: Date
): Promise<ITutorSessionFeedback> => {
  // Check if feedback already exists
  const existingFeedback = await TutorSessionFeedback.findOne({ sessionId });
  if (existingFeedback) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Feedback record already exists for this session'
    );
  }

  const dueDate = calculateDueDate(sessionCompletedAt);

  const feedback = await TutorSessionFeedback.create({
    sessionId,
    tutorId,
    studentId,
    dueDate,
    status: FEEDBACK_STATUS.PENDING,
    rating: 0, // Will be set when tutor submits
    feedbackType: FEEDBACK_TYPE.TEXT, // Default, will be set when tutor submits
  });

  // Increment tutor's pending feedback count
  await User.findByIdAndUpdate(tutorId, {
    $inc: { 'tutorProfile.pendingFeedbackCount': 1 },
  });

  return feedback;
};

// Submit feedback (tutor action)
const submitFeedback = async (
  tutorId: string,
  payload: {
    sessionId: string;
    rating: number;
    feedbackType: FEEDBACK_TYPE;
    feedbackText?: string;
    feedbackAudioUrl?: string;
    audioDuration?: number;
  }
): Promise<ITutorSessionFeedback> => {
  const { sessionId, rating, feedbackType, feedbackText, feedbackAudioUrl, audioDuration } =
    payload;

  // Verify session exists and is completed
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  // Auto-complete session if endTime has passed (handles cron delay)
  const now = new Date();
  const eligibleStatuses = [
    SESSION_STATUS.SCHEDULED,
    SESSION_STATUS.STARTING_SOON,
    SESSION_STATUS.IN_PROGRESS,
  ];
  if (eligibleStatuses.includes(session.status) && session.endTime <= now) {
    session.status = SESSION_STATUS.COMPLETED;
    session.completedAt = now;
    if (!session.startedAt) {
      session.startedAt = session.startTime; // Mark as started if wasn't
    }
    await session.save();
  }

  if (session.status !== SESSION_STATUS.COMPLETED && session.status !== SESSION_STATUS.NO_SHOW) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Can only submit feedback for completed sessions'
    );
  }

  // Verify tutor owns this session
  if (session.tutorId.toString() !== tutorId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only submit feedback for your own sessions'
    );
  }

  // Check if feedback already exists
  let feedback = await TutorSessionFeedback.findOne({ sessionId });

  const dueDate = feedback?.dueDate || calculateDueDate(session.completedAt || now);

  // ❌ NEW: Check deadline - cannot submit after deadline
  if (now > dueDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Feedback deadline has passed. You can no longer submit feedback for this session.'
    );
  }

  if (feedback) {
    // Update existing feedback record
    if (feedback.status === FEEDBACK_STATUS.SUBMITTED) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Feedback already submitted');
    }

    // Check if already forfeited
    if (feedback.paymentForfeited) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This feedback has been forfeited due to missed deadline. Payment cannot be recovered.'
      );
    }

    feedback.rating = rating;
    feedback.feedbackType = feedbackType;
    feedback.feedbackText = feedbackText;
    feedback.feedbackAudioUrl = feedbackAudioUrl;
    feedback.audioDuration = audioDuration;
    feedback.submittedAt = now;
    feedback.isLate = false; // Since we block late submissions, this will always be false
    feedback.status = FEEDBACK_STATUS.SUBMITTED;

    await feedback.save();
  } else {
    // Create new feedback record
    feedback = await TutorSessionFeedback.create({
      sessionId,
      tutorId,
      studentId: session.studentId,
      rating,
      feedbackType,
      feedbackText,
      feedbackAudioUrl,
      audioDuration,
      dueDate,
      submittedAt: now,
      isLate: false,
      status: FEEDBACK_STATUS.SUBMITTED,
      paymentForfeited: false,
    });
  }

  // Update session with feedback reference and teacher completion status
  await Session.findByIdAndUpdate(sessionId, {
    tutorFeedbackId: feedback._id,
    teacherCompletionStatus: COMPLETION_STATUS.COMPLETED,
    teacherCompletedAt: now,
    teacherFeedbackRequired: false,
  });

  // Decrement tutor's pending feedback count
  await User.findByIdAndUpdate(tutorId, {
    $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
  });

  // Update tutor's average rating
  await updateTutorRating(tutorId);

  // Emit socket event for real-time update
  const io = global.io;
  if (io && session.chatId) {
    const chatIdStr = String(session.chatId);
    const feedbackPayload = {
      sessionId,
      chatId: chatIdStr,
      feedbackId: feedback._id,
      status: 'SUBMITTED',
      rating: feedback.rating,
      feedbackType: feedback.feedbackType,
      feedbackText: feedback.feedbackText,
    };

    // Emit to chat room and both users
    io.to(`chat::${chatIdStr}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);
    io.to(`user::${String(session.studentId)}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);
    io.to(`user::${tutorId}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);

    console.log(`[Socket Emit] FEEDBACK_SUBMITTED sent for session ${sessionId}`);
  }

  return feedback;
};

// Update tutor's average rating based on their feedback ratings
const updateTutorRating = async (tutorId: string): Promise<void> => {
  const result = await TutorSessionFeedback.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
        status: FEEDBACK_STATUS.SUBMITTED,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await User.findByIdAndUpdate(tutorId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10, // Round to 1 decimal
      ratingsCount: result[0].count,
    });
  }
};

// Get pending feedbacks for a tutor
const getPendingFeedbacks = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      tutorId: new Types.ObjectId(tutorId),
      status: FEEDBACK_STATUS.PENDING,
    })
      .populate('sessionId', 'subject startTime endTime studentId')
      .populate('studentId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get all feedbacks for a tutor (submitted)
const getTutorFeedbacks = async (
  tutorId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      tutorId: new Types.ObjectId(tutorId),
      status: FEEDBACK_STATUS.SUBMITTED,
    })
      .populate('sessionId', 'subject startTime endTime')
      .populate('studentId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get feedback for a specific session
const getFeedbackBySession = async (
  sessionId: string,
  userId: string
): Promise<ITutorSessionFeedback | null> => {
  const feedback = await TutorSessionFeedback.findOne({ sessionId })
    .populate('sessionId', 'subject startTime endTime tutorId studentId')
    .populate('studentId', 'name email profilePicture')
    .populate('tutorId', 'name email profilePicture');

  if (!feedback) {
    return null;
  }

  // Verify user is either the tutor or student of this session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Session not found');
  }

  const isAuthorized =
    session.tutorId.toString() === userId || session.studentId.toString() === userId;

  if (!isAuthorized) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not authorized to view this feedback');
  }

  return feedback;
};

// Get feedbacks received by a student
const getStudentFeedbacks = async (
  studentId: string,
  query: Record<string, unknown>
) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      studentId: new Types.ObjectId(studentId),
      status: FEEDBACK_STATUS.SUBMITTED,
    })
      .populate('sessionId', 'subject startTime endTime')
      .populate('tutorId', 'name email profilePicture'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

// Get feedbacks due soon (for reminder cron job)
const getFeedbacksDueSoon = async (
  daysUntilDue: number
): Promise<ITutorSessionFeedback[]> => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysUntilDue);

  return TutorSessionFeedback.find({
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lte: targetDate },
  })
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime')
    .populate('studentId', 'name');
};

// Get overdue feedbacks
const getOverdueFeedbacks = async (): Promise<ITutorSessionFeedback[]> => {
  const now = new Date();

  return TutorSessionFeedback.find({
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lt: now },
  })
    .populate('tutorId', 'name email')
    .populate('sessionId', 'subject startTime')
    .populate('studentId', 'name');
};

/**
 * Process feedbacks that missed deadline - Payment forfeit to platform
 * Called by cron on 4th of every month at 1:00 AM
 */
const processForfeitedFeedbacks = async (): Promise<{
  processed: number;
  totalForfeited: number;
}> => {
  const now = new Date();
  let processed = 0;
  let totalForfeited = 0;

  // Find all PENDING feedbacks past deadline that haven't been forfeited yet
  const overdueFeedbacks = await TutorSessionFeedback.find({
    status: FEEDBACK_STATUS.PENDING,
    dueDate: { $lt: now },
    paymentForfeited: { $ne: true },
  }).populate('sessionId');

  for (const feedback of overdueFeedbacks) {
    try {
      const session = feedback.sessionId as any;
      const forfeitedAmount = session?.totalPrice || 0;

      // Mark feedback as forfeited
      feedback.paymentForfeited = true;
      feedback.forfeitedAmount = forfeitedAmount;
      feedback.forfeitedAt = now;
      await feedback.save();

      // Update session - teacher will never complete
      if (session?._id) {
        await Session.findByIdAndUpdate(session._id, {
          teacherCompletionStatus: COMPLETION_STATUS.NOT_APPLICABLE,
          teacherFeedbackRequired: false,
        });
      }

      // Decrement tutor's pending feedback count
      await User.findByIdAndUpdate(feedback.tutorId, {
        $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
      });

      processed++;
      totalForfeited += forfeitedAmount;

      console.log(
        `Payment forfeited: Session ${session?._id}, Tutor ${feedback.tutorId}, Amount €${forfeitedAmount}`
      );
    } catch (error) {
      console.error(`Error processing forfeited feedback ${feedback._id}:`, error);
    }
  }

  console.log(`Processed ${processed} forfeited feedbacks. Total forfeited: €${totalForfeited}`);

  return { processed, totalForfeited };
};

/**
 * Get forfeited payments summary (for admin dashboard)
 */
const getForfeitedPaymentsSummary = async (query?: {
  month?: number;
  year?: number;
}) => {
  const matchStage: any = { paymentForfeited: true };

  if (query?.month && query?.year) {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0, 23, 59, 59);
    matchStage.forfeitedAt = { $gte: startDate, $lte: endDate };
  }

  const summary = await TutorSessionFeedback.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$forfeitedAt' },
          month: { $month: '$forfeitedAt' },
        },
        totalAmount: { $sum: '$forfeitedAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
  ]);

  const grandTotal = await TutorSessionFeedback.aggregate([
    { $match: { paymentForfeited: true } },
    {
      $group: {
        _id: null,
        total: { $sum: '$forfeitedAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    monthly: summary,
    grandTotal: grandTotal[0] || { total: 0, count: 0 },
  };
};

/**
 * Send deadline reminders to tutors with pending feedbacks
 * Called by cron on 1st of month at 10:00 AM
 */
const sendDeadlineReminders = async (): Promise<number> => {
  const feedbacksDueSoon = await getFeedbacksDueSoon(3); // Due within 3 days
  let sent = 0;

  for (const feedback of feedbacksDueSoon) {
    const tutor = feedback.tutorId as any;
    const session = feedback.sessionId as any;
    if (!tutor?.email) continue;

    const dueDate = format(new Date(feedback.dueDate), 'MMMM d, yyyy');
    const sessionSubject = session?.subject || 'N/A';
    const sessionDate = session?.startTime
      ? format(new Date(session.startTime), 'MMMM d, yyyy')
      : 'N/A';

    try {
      await emailHelper.sendEmail({
        to: tutor.email,
        subject: 'Feedback Reminder - Submit by ' + dueDate,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Feedback Reminder</h2>
            <p>Hi ${tutor.name},</p>
            <p>This is a reminder that your session feedback is due soon.</p>
            <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Session:</strong> ${sessionSubject}</p>
              <p style="margin: 4px 0;"><strong>Session Date:</strong> ${sessionDate}</p>
              <p style="margin: 4px 0;"><strong>Feedback Deadline:</strong> ${dueDate}</p>
            </div>
            <p style="color: #e65100;"><strong>Please submit your feedback before the deadline to receive your payment for this session.</strong></p>
            <p>If you miss the deadline, the payment for this session will be forfeited.</p>
            <a href="${process.env.FRONTEND_URL}/teacher/overview" style="display: inline-block; background: #0B31BD; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">Submit Feedback</a>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">Schaefer Tutoring</p>
          </div>
        `,
      });
      sent++;
      console.log(`Reminder sent to ${tutor.email} for session ${session?._id}`);
    } catch (error) {
      console.error(`Failed to send reminder to ${tutor.email}:`, error);
    }
  }

  console.log(`Sent ${sent}/${feedbacksDueSoon.length} deadline reminders`);
  return sent;
};

/**
 * Send final reminders to tutors (last day warning)
 * Called by cron on 2nd of month at 10:00 AM
 */
const sendFinalReminders = async (): Promise<number> => {
  const feedbacksDueSoon = await getFeedbacksDueSoon(1); // Due within 1 day
  let sent = 0;

  for (const feedback of feedbacksDueSoon) {
    const tutor = feedback.tutorId as any;
    const session = feedback.sessionId as any;
    if (!tutor?.email) continue;

    const dueDate = format(new Date(feedback.dueDate), 'MMMM d, yyyy');
    const sessionSubject = session?.subject || 'N/A';
    const forfeitAmount = (session as any)?.totalPrice || 0;

    try {
      await emailHelper.sendEmail({
        to: tutor.email,
        subject: 'URGENT: Feedback Due Tomorrow - Payment at Risk',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #d32f2f;">Urgent: Feedback Due Tomorrow</h2>
            <p>Hi ${tutor.name},</p>
            <p><strong>Your feedback deadline is tomorrow (${dueDate}).</strong></p>
            <div style="background: #fff3e0; border: 1px solid #ff9800; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Session:</strong> ${sessionSubject}</p>
              <p style="margin: 4px 0;"><strong>Deadline:</strong> ${dueDate}</p>
              <p style="margin: 4px 0; color: #d32f2f;"><strong>Amount at risk: €${forfeitAmount}</strong></p>
            </div>
            <p style="color: #d32f2f;"><strong>If you do not submit your feedback by the deadline, the payment of €${forfeitAmount} will be forfeited and you will not be able to recover it.</strong></p>
            <a href="${process.env.FRONTEND_URL}/teacher/overview" style="display: inline-block; background: #d32f2f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px;">Submit Feedback Now</a>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">Schaefer Tutoring</p>
          </div>
        `,
      });
      sent++;
      console.log(`FINAL reminder sent to ${tutor.email} for session ${session?._id}`);
    } catch (error) {
      console.error(`Failed to send final reminder to ${tutor.email}:`, error);
    }
  }

  console.log(`Sent ${sent}/${feedbacksDueSoon.length} final reminders`);
  return sent;
};

/**
 * Get list of forfeited feedbacks with details (for admin dashboard)
 */
const getForfeitedFeedbacksList = async (query: Record<string, unknown>) => {
  const feedbackQuery = new QueryBuilder(
    TutorSessionFeedback.find({
      paymentForfeited: true,
    })
      .populate('tutorId', 'name email profilePicture')
      .populate('studentId', 'name email')
      .populate('sessionId', 'subject startTime endTime totalPrice'),
    query
  )
    .sort()
    .paginate()
    .fields();

  const data = await feedbackQuery.modelQuery;
  const meta = await feedbackQuery.getPaginationInfo();

  return { data, meta };
};

export const TutorSessionFeedbackService = {
  createPendingFeedback,
  submitFeedback,
  updateTutorRating,
  getPendingFeedbacks,
  getTutorFeedbacks,
  getFeedbackBySession,
  getStudentFeedbacks,
  getFeedbacksDueSoon,
  getOverdueFeedbacks,
  processForfeitedFeedbacks,
  getForfeitedPaymentsSummary,
  getForfeitedFeedbacksList,
  sendDeadlineReminders,
  sendFinalReminders,
};
