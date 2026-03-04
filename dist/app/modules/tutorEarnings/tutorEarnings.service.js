"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TutorEarningsService = void 0;
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const tutorEarnings_model_1 = require("./tutorEarnings.model");
const tutorEarnings_interface_1 = require("./tutorEarnings.interface");
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../../enums/user");
const user_interface_1 = require("../user/user.interface");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const stripe_1 = require("../../../config/stripe");
const payment_model_1 = require("../payment/payment.model");
const emailHelper_1 = require("../../../helpers/emailHelper");
// Level configuration
const LEVEL_CONFIG = {
    [user_interface_1.TUTOR_LEVEL.STARTER]: { minSessions: 0, maxSessions: 20, hourlyRate: 15, levelNumber: 1 },
    [user_interface_1.TUTOR_LEVEL.INTERMEDIATE]: { minSessions: 21, maxSessions: 50, hourlyRate: 17, levelNumber: 2 },
    [user_interface_1.TUTOR_LEVEL.EXPERT]: { minSessions: 51, maxSessions: Infinity, hourlyRate: 20, levelNumber: 3 },
};
// Get next level info
const getNextLevel = (currentLevel) => {
    if (currentLevel === user_interface_1.TUTOR_LEVEL.STARTER) {
        return {
            level: user_interface_1.TUTOR_LEVEL.INTERMEDIATE,
            hourlyRate: LEVEL_CONFIG[user_interface_1.TUTOR_LEVEL.INTERMEDIATE].hourlyRate,
            levelNumber: LEVEL_CONFIG[user_interface_1.TUTOR_LEVEL.INTERMEDIATE].levelNumber,
        };
    }
    if (currentLevel === user_interface_1.TUTOR_LEVEL.INTERMEDIATE) {
        return {
            level: user_interface_1.TUTOR_LEVEL.EXPERT,
            hourlyRate: LEVEL_CONFIG[user_interface_1.TUTOR_LEVEL.EXPERT].hourlyRate,
            levelNumber: LEVEL_CONFIG[user_interface_1.TUTOR_LEVEL.EXPERT].levelNumber,
        };
    }
    return null; // Already at max level
};
/**
 * Generate tutor earnings for all tutors (called at month-end after billing)
 */
const generateTutorEarnings = (month_1, year_1, ...args_1) => __awaiter(void 0, [month_1, year_1, ...args_1], void 0, function* (month, year, commissionRate = 0 // No commission - tutor gets 100%
) {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    // Get all active tutors
    const tutors = yield user_model_1.User.find({ role: user_1.USER_ROLES.TUTOR });
    const earnings = [];
    for (const tutor of tutors) {
        // Check if payout already exists
        const existingPayout = yield tutorEarnings_model_1.TutorEarnings.findOne({
            tutorId: tutor._id,
            payoutMonth: month,
            payoutYear: year,
        });
        if (existingPayout) {
            continue; // Skip if already generated
        }
        // Get completed sessions for this tutor in billing period
        // NEW: Query by teacherCompletionStatus - only sessions where feedback was submitted
        const sessions = yield session_model_1.Session.find({
            tutorId: tutor._id,
            teacherCompletionStatus: session_interface_1.COMPLETION_STATUS.COMPLETED,
            isTrial: false, // Exclude free trial sessions - teacher doesn't get paid for trials
            teacherCompletedAt: { $gte: periodStart, $lte: periodEnd },
        }).populate('studentId', 'name');
        if (sessions.length === 0) {
            continue; // Skip tutors with no sessions
        }
        // Build line items - use teacherCompletedAt for date
        const lineItems = sessions.map(session => ({
            sessionId: session._id,
            studentName: session.studentId.name,
            subject: session.subject,
            completedAt: session.teacherCompletedAt || session.completedAt,
            duration: session.duration,
            sessionPrice: session.totalPrice,
            tutorEarning: session.totalPrice * (1 - commissionRate),
        }));
        // Create earnings record
        const earning = yield tutorEarnings_model_1.TutorEarnings.create({
            tutorId: tutor._id,
            payoutMonth: month,
            payoutYear: year,
            periodStart,
            periodEnd,
            lineItems,
            commissionRate,
            status: tutorEarnings_interface_1.PAYOUT_STATUS.PENDING,
        });
        earnings.push(earning);
    }
    return earnings;
});
/**
 * Get tutor's earnings history
 */
const getMyEarnings = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const earningsQuery = new QueryBuilder_1.default(tutorEarnings_model_1.TutorEarnings.find({ tutorId }), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield earningsQuery.modelQuery;
    const meta = yield earningsQuery.getPaginationInfo();
    return { data: result, meta };
});
/**
 * Get all earnings (Admin)
 */
const getAllEarnings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const earningsQuery = new QueryBuilder_1.default(tutorEarnings_model_1.TutorEarnings.find().populate('tutorId', 'name email'), query)
        .search(['payoutReference'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield earningsQuery.modelQuery;
    const meta = yield earningsQuery.getPaginationInfo();
    return { data: result, meta };
});
/**
 * Get single earnings record
 */
const getSingleEarning = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id)
        .populate('tutorId', 'name email')
        .populate('lineItems.sessionId');
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    return earning;
});
/**
 * Initiate payout to tutor (Stripe Connect transfer)
 */
const initiatePayout = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id).populate('tutorId');
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    if (earning.status !== tutorEarnings_interface_1.PAYOUT_STATUS.PENDING) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot initiate payout. Current status: ${earning.status}`);
    }
    if (earning.netEarnings <= 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot initiate payout with zero or negative earnings');
    }
    const tutor = earning.tutorId;
    // Look up tutor's Stripe Connect account
    const stripeAccount = yield payment_model_1.StripeAccount.findOne({ userId: tutor._id });
    if (!stripeAccount || !stripeAccount.onboardingCompleted) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Tutor has not completed Stripe onboarding. Cannot initiate payout.');
    }
    if (!stripeAccount.payoutsEnabled) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Tutor Stripe account does not have payouts enabled yet.');
    }
    // Create Stripe Connect transfer
    const transfer = yield stripe_1.stripe.transfers.create({
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
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.PROCESSING;
    if (payload.notes) {
        earning.notes = payload.notes;
    }
    yield earning.save();
    return earning;
});
/**
 * Mark payout as completed (Called by Stripe webhook or manual)
 */
const markAsPaid = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id);
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.PAID;
    earning.paidAt = new Date();
    if (payload.stripePayoutId) {
        earning.stripePayoutId = payload.stripePayoutId;
    }
    if (payload.paymentMethod) {
        earning.paymentMethod = payload.paymentMethod;
    }
    yield earning.save();
    // Send email notification to tutor
    const tutor = yield user_model_1.User.findById(earning.tutorId);
    if (tutor === null || tutor === void 0 ? void 0 : tutor.email) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        yield emailHelper_1.emailHelper.sendEmail({
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
});
/**
 * Mark payout as failed
 */
const markAsFailed = (id, failureReason) => __awaiter(void 0, void 0, void 0, function* () {
    const earning = yield tutorEarnings_model_1.TutorEarnings.findById(id);
    if (!earning) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    earning.status = tutorEarnings_interface_1.PAYOUT_STATUS.FAILED;
    earning.failureReason = failureReason;
    yield earning.save();
    // Send email notification to tutor
    const tutor = yield user_model_1.User.findById(earning.tutorId);
    if (tutor === null || tutor === void 0 ? void 0 : tutor.email) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        yield emailHelper_1.emailHelper.sendEmail({
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
});
// ============ PAYOUT SETTINGS ============
/**
 * Get tutor's payout settings
 */
const getPayoutSettings = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access payout settings');
    }
    return {
        recipient: ((_a = tutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.payoutRecipient) || '',
        iban: ((_b = tutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.payoutIban) || '',
    };
});
/**
 * Update tutor's payout settings
 */
const updatePayoutSettings = (tutorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can update payout settings');
    }
    const updatedTutor = yield user_model_1.User.findByIdAndUpdate(tutorId, {
        'tutorProfile.payoutRecipient': payload.recipient,
        'tutorProfile.payoutIban': payload.iban,
    }, { new: true });
    return {
        recipient: ((_a = updatedTutor === null || updatedTutor === void 0 ? void 0 : updatedTutor.tutorProfile) === null || _a === void 0 ? void 0 : _a.payoutRecipient) || '',
        iban: ((_b = updatedTutor === null || updatedTutor === void 0 ? void 0 : updatedTutor.tutorProfile) === null || _b === void 0 ? void 0 : _b.payoutIban) || '',
    };
});
/**
 * Get tutor's comprehensive stats including level progress
 */
const getMyStats = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const tutor = yield user_model_1.User.findById(tutorId);
    if (!tutor || tutor.role !== user_1.USER_ROLES.TUTOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only tutors can access stats');
    }
    const tutorProfile = tutor.tutorProfile;
    const currentLevel = (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.level) || user_interface_1.TUTOR_LEVEL.STARTER;
    const completedSessions = (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.completedSessions) || 0;
    // Calculate level progress
    const currentLevelConfig = LEVEL_CONFIG[currentLevel];
    const nextLevelInfo = getNextLevel(currentLevel);
    let nextLevelData = null;
    if (nextLevelInfo) {
        const sessionsForNextLevel = LEVEL_CONFIG[nextLevelInfo.level].minSessions;
        const sessionsNeeded = Math.max(0, sessionsForNextLevel - completedSessions);
        const progressPercent = Math.min(100, Math.round(((completedSessions - currentLevelConfig.minSessions) /
            (currentLevelConfig.maxSessions - currentLevelConfig.minSessions + 1)) * 100));
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
    const currentMonthEarnings = yield tutorEarnings_model_1.TutorEarnings.findOne({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        payoutMonth: now.getMonth() + 1,
        payoutYear: now.getFullYear(),
    });
    // Get pending payouts total
    const pendingPayouts = yield tutorEarnings_model_1.TutorEarnings.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
                status: tutorEarnings_interface_1.PAYOUT_STATUS.PENDING,
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
    const trialStats = yield session_model_1.Session.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
                isTrial: true,
            },
        },
        {
            $group: {
                _id: null,
                totalTrials: { $sum: 1 },
                convertedTrials: {
                    $sum: {
                        $cond: [{ $eq: ['$status', session_interface_1.SESSION_STATUS.COMPLETED] }, 1, 0],
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
            totalSessions: (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.totalSessions) || 0,
            completedSessions: (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.completedSessions) || 0,
            totalHours: (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.totalHoursTaught) || 0,
            totalStudents: (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.totalStudents) || 0,
        },
        earnings: {
            currentMonth: (currentMonthEarnings === null || currentMonthEarnings === void 0 ? void 0 : currentMonthEarnings.netEarnings) || 0,
            totalEarnings: (tutorProfile === null || tutorProfile === void 0 ? void 0 : tutorProfile.totalEarnings) || 0,
            pendingPayout: ((_a = pendingPayouts[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
        },
        trialStats: {
            totalTrials: trialData.totalTrials,
            convertedTrials: trialData.convertedTrials,
            conversionRate,
        },
    };
});
/**
 * Get earnings history formatted for frontend display
 */
const getEarningsHistory = (tutorId_1, ...args_1) => __awaiter(void 0, [tutorId_1, ...args_1], void 0, function* (tutorId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const earnings = yield tutorEarnings_model_1.TutorEarnings.find({ tutorId: new mongoose_1.Types.ObjectId(tutorId) })
        .sort({ payoutYear: -1, payoutMonth: -1 })
        .skip(skip)
        .limit(limit);
    const total = yield tutorEarnings_model_1.TutorEarnings.countDocuments({ tutorId: new mongoose_1.Types.ObjectId(tutorId) });
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
});
exports.TutorEarningsService = {
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
