import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { TutorEarnings } from './tutorEarnings.model';
import { IEarningLineItem, ITutorEarnings, PAYOUT_STATUS } from './tutorEarnings.interface';
import { Session } from '../session/session.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../session/session.interface';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enums/user';
import { TUTOR_LEVEL } from '../user/user.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import { stripe } from '../../../config/stripe';
import { StripeAccount } from '../payment/payment.model';
import { emailHelper } from '../../../helpers/emailHelper';

// Level configuration
const LEVEL_CONFIG = {
  [TUTOR_LEVEL.STARTER]: { minSessions: 0, maxSessions: 20, hourlyRate: 15, levelNumber: 1 },
  [TUTOR_LEVEL.INTERMEDIATE]: { minSessions: 21, maxSessions: 50, hourlyRate: 17, levelNumber: 2 },
  [TUTOR_LEVEL.EXPERT]: { minSessions: 51, maxSessions: Infinity, hourlyRate: 20, levelNumber: 3 },
};

// Get next level info
const getNextLevel = (currentLevel: TUTOR_LEVEL): { level: TUTOR_LEVEL; hourlyRate: number; levelNumber: number } | null => {
  if (currentLevel === TUTOR_LEVEL.STARTER) {
    return {
      level: TUTOR_LEVEL.INTERMEDIATE,
      hourlyRate: LEVEL_CONFIG[TUTOR_LEVEL.INTERMEDIATE].hourlyRate,
      levelNumber: LEVEL_CONFIG[TUTOR_LEVEL.INTERMEDIATE].levelNumber,
    };
  }
  if (currentLevel === TUTOR_LEVEL.INTERMEDIATE) {
    return {
      level: TUTOR_LEVEL.EXPERT,
      hourlyRate: LEVEL_CONFIG[TUTOR_LEVEL.EXPERT].hourlyRate,
      levelNumber: LEVEL_CONFIG[TUTOR_LEVEL.EXPERT].levelNumber,
    };
  }
  return null; // Already at max level
};

/**
 * Generate tutor earnings for all tutors (called at month-end after billing)
 */
const generateTutorEarnings = async (
  month: number,
  year: number,
  commissionRate: number = 0 // No commission - tutor gets 100%
): Promise<ITutorEarnings[]> => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  // Get all active tutors
  const tutors = await User.find({ role: USER_ROLES.TUTOR });

  const earnings: ITutorEarnings[] = [];

  for (const tutor of tutors) {
    // Check if payout already exists
    const existingPayout = await TutorEarnings.findOne({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
    });

    if (existingPayout) {
      continue; // Skip if already generated
    }

    // Get completed sessions for this tutor in billing period
    // NEW: Query by teacherCompletionStatus - only sessions where feedback was submitted
    const sessions = await Session.find({
      tutorId: tutor._id,
      teacherCompletionStatus: COMPLETION_STATUS.COMPLETED,
      isTrial: false,  // Exclude free trial sessions - teacher doesn't get paid for trials
      teacherCompletedAt: { $gte: periodStart, $lte: periodEnd },
    }).populate('studentId', 'name');

    if (sessions.length === 0) {
      continue; // Skip tutors with no sessions
    }

    // Build line items - use teacherCompletedAt for date
    const lineItems: IEarningLineItem[] = sessions.map(session => ({
      sessionId: session._id as Types.ObjectId,
      studentName: (session.studentId as any).name,
      subject: session.subject,
      completedAt: session.teacherCompletedAt || session.completedAt!,
      duration: session.duration,
      sessionPrice: session.totalPrice,
      tutorEarning: session.totalPrice * (1 - commissionRate),
    }));

    // Create earnings record
    const earning = await TutorEarnings.create({
      tutorId: tutor._id,
      payoutMonth: month,
      payoutYear: year,
      periodStart,
      periodEnd,
      lineItems,
      commissionRate,
      status: PAYOUT_STATUS.PENDING,
    });

    earnings.push(earning);
  }

  return earnings;
};

/**
 * Get tutor's earnings history
 */
const getMyEarnings = async (tutorId: string, query: Record<string, unknown>) => {
  const earningsQuery = new QueryBuilder(
    TutorEarnings.find({ tutorId }),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await earningsQuery.modelQuery;
  const meta = await earningsQuery.getPaginationInfo();

  return { data: result, meta };
};

/**
 * Get all earnings (Admin)
 */
const getAllEarnings = async (query: Record<string, unknown>) => {
  const earningsQuery = new QueryBuilder(
    TutorEarnings.find().populate('tutorId', 'name email'),
    query
  )
    .search(['payoutReference'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await earningsQuery.modelQuery;
  const meta = await earningsQuery.getPaginationInfo();

  return { data: result, meta };
};

/**
 * Get single earnings record
 */
const getSingleEarning = async (id: string): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id)
    .populate('tutorId', 'name email')
    .populate('lineItems.sessionId');

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  return earning;
};

/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = async (
  id: string,
  payload: { notes?: string }
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id).populate('tutorId');

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  if (earning.status !== PAYOUT_STATUS.PENDING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot initiate payout. Current status: ${earning.status}`
    );
  }

  if (earning.netEarnings <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot initiate payout with zero or negative earnings'
    );
  }

  const tutor = earning.tutorId as any;

  // Look up tutor's Stripe Connect account
  const stripeAccount = await StripeAccount.findOne({ userId: tutor._id });
  if (!stripeAccount || !stripeAccount.onboardingCompleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tutor has not completed Stripe onboarding. Cannot initiate payout.'
    );
  }

  if (!stripeAccount.payoutsEnabled) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tutor Stripe account does not have payouts enabled yet.'
    );
  }

  // Create Stripe Connect transfer
  const transfer = await stripe.transfers.create({
    amount: Math.round(earning.netEarnings * 100), // Convert to cents
    currency: 'eur',
    destination: stripeAccount.stripeAccountId,
    transfer_group: earning.payoutReference,
    metadata: {
      tutorId: tutor._id.toString(),
      payoutMonth: String(earning.payoutMonth),
      payoutYear: String(earning.payoutYear),
    },
  });

  earning.stripeTransferId = transfer.id;
  earning.status = PAYOUT_STATUS.PROCESSING;
  if (payload.notes) {
    earning.notes = payload.notes;
  }

  await earning.save();

  return earning;
};

/**
 * Mark payout as completed (Called by Stripe webhook or manual)
 */
const markAsPaid = async (
  id: string,
  payload: {
    stripePayoutId?: string;
    paymentMethod?: string;
  }
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id);

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  earning.status = PAYOUT_STATUS.PAID;
  earning.paidAt = new Date();

  if (payload.stripePayoutId) {
    earning.stripePayoutId = payload.stripePayoutId;
  }

  if (payload.paymentMethod) {
    earning.paymentMethod = payload.paymentMethod;
  }

  await earning.save();

  // Send email notification to tutor
  const tutor = await User.findById(earning.tutorId);
  if (tutor?.email) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    await emailHelper.sendEmail({
      to: tutor.email,
      subject: 'Payout Completed - ' + monthNames[earning.payoutMonth - 1] + ' ' + earning.payoutYear,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Payout Completed</h2>
          <p>Hi ${tutor.name},</p>
          <p>Your payout has been successfully processed.</p>
          <div style="background: #e8f5e9; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Period:</strong> ${monthNames[earning.payoutMonth - 1]} ${earning.payoutYear}</p>
            <p style="margin: 4px 0;"><strong>Sessions:</strong> ${earning.totalSessions}</p>
            <p style="margin: 4px 0;"><strong>Amount:</strong> €${earning.netEarnings.toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Reference:</strong> ${earning.payoutReference}</p>
          </div>
          <p>The funds should appear in your bank account within 2-3 business days.</p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">Schaefer Tutoring</p>
        </div>
      `,
    }).catch(err => console.error('Failed to send payout email:', err));
  }

  return earning;
};

/**
 * Mark payout as failed
 */
const markAsFailed = async (
  id: string,
  failureReason: string
): Promise<ITutorEarnings | null> => {
  const earning = await TutorEarnings.findById(id);

  if (!earning) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Earnings record not found');
  }

  earning.status = PAYOUT_STATUS.FAILED;
  earning.failureReason = failureReason;

  await earning.save();

  // Send email notification to tutor
  const tutor = await User.findById(earning.tutorId);
  if (tutor?.email) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    await emailHelper.sendEmail({
      to: tutor.email,
      subject: 'Payout Failed - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #d32f2f;">Payout Failed</h2>
          <p>Hi ${tutor.name},</p>
          <p>Unfortunately, your payout could not be processed.</p>
          <div style="background: #fce4ec; border: 1px solid #ef9a9a; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Period:</strong> ${monthNames[earning.payoutMonth - 1]} ${earning.payoutYear}</p>
            <p style="margin: 4px 0;"><strong>Amount:</strong> €${earning.netEarnings.toFixed(2)}</p>
            <p style="margin: 4px 0;"><strong>Reason:</strong> ${failureReason}</p>
          </div>
          <p>Please check your Stripe account settings and ensure your bank details are correct. Our team will retry the payout once the issue is resolved.</p>
          <p>If you need help, please contact support.</p>
          <p style="color: #666; font-size: 12px; margin-top: 24px;">Schaefer Tutoring</p>
        </div>
      `,
    }).catch(err => console.error('Failed to send payout failure email:', err));
  }

  return earning;
};

// ============ PAYOUT SETTINGS ============

/**
 * Get tutor's payout settings
 */
const getPayoutSettings = async (tutorId: string) => {
  const tutor = await User.findById(tutorId);

  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access payout settings');
  }

  return {
    recipient: tutor.tutorProfile?.payoutRecipient || '',
    iban: tutor.tutorProfile?.payoutIban || '',
  };
};

/**
 * Update tutor's payout settings
 */
const updatePayoutSettings = async (
  tutorId: string,
  payload: { recipient: string; iban: string }
) => {
  const tutor = await User.findById(tutorId);

  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can update payout settings');
  }

  const updatedTutor = await User.findByIdAndUpdate(
    tutorId,
    {
      'tutorProfile.payoutRecipient': payload.recipient,
      'tutorProfile.payoutIban': payload.iban,
    },
    { new: true }
  );

  return {
    recipient: updatedTutor?.tutorProfile?.payoutRecipient || '',
    iban: updatedTutor?.tutorProfile?.payoutIban || '',
  };
};

// ============ TUTOR STATS & LEVEL PROGRESS ============

/**
 * Response type for tutor stats
 */
type TutorStatsResponse = {
  // Level Progress
  level: {
    current: number; // 1, 2, 3
    name: string; // STARTER, INTERMEDIATE, EXPERT
    hourlyRate: number;
  };
  nextLevel: {
    level: number;
    name: string;
    hourlyRate: number;
    sessionsNeeded: number;
    progressPercent: number;
  } | null;

  // Stats
  stats: {
    totalSessions: number;
    completedSessions: number;
    totalHours: number;
    totalStudents: number;
  };

  // Earnings
  earnings: {
    currentMonth: number;
    totalEarnings: number;
    pendingPayout: number;
  };

  // Trial Sessions
  trialStats: {
    totalTrials: number;
    convertedTrials: number;
    conversionRate: number;
  };
};

/**
 * Get tutor's comprehensive stats including level progress
 */
const getMyStats = async (tutorId: string): Promise<TutorStatsResponse> => {
  const tutor = await User.findById(tutorId);

  if (!tutor || tutor.role !== USER_ROLES.TUTOR) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only tutors can access stats');
  }

  const tutorProfile = tutor.tutorProfile;
  const currentLevel = tutorProfile?.level || TUTOR_LEVEL.STARTER;
  const completedSessions = tutorProfile?.completedSessions || 0;

  // Calculate level progress
  const currentLevelConfig = LEVEL_CONFIG[currentLevel];
  const nextLevelInfo = getNextLevel(currentLevel);

  let nextLevelData = null;
  if (nextLevelInfo) {
    const sessionsForNextLevel = LEVEL_CONFIG[nextLevelInfo.level].minSessions;
    const sessionsNeeded = Math.max(0, sessionsForNextLevel - completedSessions);
    const progressPercent = Math.min(
      100,
      Math.round(((completedSessions - currentLevelConfig.minSessions) /
        (currentLevelConfig.maxSessions - currentLevelConfig.minSessions + 1)) * 100)
    );

    nextLevelData = {
      level: nextLevelInfo.levelNumber,
      name: nextLevelInfo.level,
      hourlyRate: nextLevelInfo.hourlyRate,
      sessionsNeeded,
      progressPercent,
    };
  }

  // Get current month dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get current month earnings
  const currentMonthEarnings = await TutorEarnings.findOne({
    tutorId: new Types.ObjectId(tutorId),
    payoutMonth: now.getMonth() + 1,
    payoutYear: now.getFullYear(),
  });

  // Get pending payouts total
  const pendingPayouts = await TutorEarnings.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
        status: PAYOUT_STATUS.PENDING,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$netEarnings' },
      },
    },
  ]);

  // Get trial session stats
  const trialStats = await Session.aggregate([
    {
      $match: {
        tutorId: new Types.ObjectId(tutorId),
        isTrial: true,
      },
    },
    {
      $group: {
        _id: null,
        totalTrials: { $sum: 1 },
        convertedTrials: {
          $sum: {
            $cond: [{ $eq: ['$status', SESSION_STATUS.COMPLETED] }, 1, 0],
          },
        },
      },
    },
  ]);

  const trialData = trialStats[0] || { totalTrials: 0, convertedTrials: 0 };
  const conversionRate = trialData.totalTrials > 0
    ? Math.round((trialData.convertedTrials / trialData.totalTrials) * 100)
    : 0;

  return {
    level: {
      current: currentLevelConfig.levelNumber,
      name: currentLevel,
      hourlyRate: currentLevelConfig.hourlyRate,
    },
    nextLevel: nextLevelData,
    stats: {
      totalSessions: tutorProfile?.totalSessions || 0,
      completedSessions: tutorProfile?.completedSessions || 0,
      totalHours: tutorProfile?.totalHoursTaught || 0,
      totalStudents: tutorProfile?.totalStudents || 0,
    },
    earnings: {
      currentMonth: currentMonthEarnings?.netEarnings || 0,
      totalEarnings: tutorProfile?.totalEarnings || 0,
      pendingPayout: pendingPayouts[0]?.total || 0,
    },
    trialStats: {
      totalTrials: trialData.totalTrials,
      convertedTrials: trialData.convertedTrials,
      conversionRate,
    },
  };
};

/**
 * Get earnings history formatted for frontend display
 */
const getEarningsHistory = async (tutorId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const earnings = await TutorEarnings.find({ tutorId: new Types.ObjectId(tutorId) })
    .sort({ payoutYear: -1, payoutMonth: -1 })
    .skip(skip)
    .limit(limit);

  const total = await TutorEarnings.countDocuments({ tutorId: new Types.ObjectId(tutorId) });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const formattedEarnings = earnings.map((earning) => ({
    id: earning._id,
    period: `${monthNames[earning.payoutMonth - 1]} ${String(earning.payoutYear).slice(-2)}`,
    sessions: earning.totalSessions,
    hours: earning.totalHours,
    grossEarnings: earning.grossEarnings,
    netEarnings: earning.netEarnings,
    status: earning.status,
    payoutReference: earning.payoutReference,
    paidAt: earning.paidAt,
  }));

  return {
    data: formattedEarnings,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const TutorEarningsService = {
  generateTutorEarnings,
  getMyEarnings,
  getAllEarnings,
  getSingleEarning,
  initiatePayout,
  markAsPaid,
  markAsFailed,
  // New methods
  getPayoutSettings,
  updatePayoutSettings,
  getMyStats,
  getEarningsHistory,
};
