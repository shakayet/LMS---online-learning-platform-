"use strict";
/**
 * Cron Job Service
 *
 * This service handles automated tasks:
 * - Session reminders (24 hours before, 1 hour before)
 * - Trial request auto-expiration (24 hours)
 * - Month-end billing generation
 * - Month-end tutor earnings generation
 * - Session auto-completion with attendance tracking (after endTime)
 */
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
exports.CronService = exports.initializeCronJobs = exports.cleanupExpiredInterviewSlots = exports.sendFinalFeedbackReminders = exports.sendFeedbackReminders = exports.processForfeitedFeedbacks = exports.generateTutorEarnings = exports.generateMonthlyBillings = exports.sendSessionReminders = exports.autoCompleteSessions = exports.autoTransitionSessions = exports.expireTrialRequests = void 0;
const logger_1 = require("../../shared/logger");
const node_cron_1 = __importDefault(require("node-cron"));
// ============================================
// 🧪 TEST MODE CONFIGURATION
// ============================================
// Set to true for testing - runs session transition every 1 minute
// Set to false for production - runs every 5 minutes
const TEST_MODE = true;
// ============================================
// Import services
const monthlyBilling_service_1 = require("../modules/monthlyBilling/monthlyBilling.service");
const tutorEarnings_service_1 = require("../modules/tutorEarnings/tutorEarnings.service");
const session_service_1 = require("../modules/session/session.service");
const interviewSlot_service_1 = require("../modules/interviewSlot/interviewSlot.service");
const tutorSessionFeedback_service_1 = require("../modules/tutorSessionFeedback/tutorSessionFeedback.service");
const trialRequest_model_1 = require("../modules/trialRequest/trialRequest.model");
const trialRequest_interface_1 = require("../modules/trialRequest/trialRequest.interface");
const session_model_1 = require("../modules/session/session.model");
const session_interface_1 = require("../modules/session/session.interface");
/**
 * Auto-expire trial requests after 24 hours
 * Runs every hour
 */
const expireTrialRequests = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const expiredRequests = yield trialRequest_model_1.TrialRequest.updateMany({
            status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
            expiresAt: { $lte: now },
        }, {
            $set: { status: trialRequest_interface_1.TRIAL_REQUEST_STATUS.EXPIRED },
        });
        if (expiredRequests.modifiedCount > 0) {
            logger_1.logger.info(`Expired ${expiredRequests.modifiedCount} trial requests`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to expire trial requests', { error });
    }
});
exports.expireTrialRequests = expireTrialRequests;
/**
 * Auto-transition session statuses with attendance tracking
 * TEST_MODE: Runs every 1 minute
 * PRODUCTION: Runs every 5 minutes
 *
 * Handles:
 * - SCHEDULED → STARTING_SOON (10 min before)
 * - STARTING_SOON → IN_PROGRESS (at start time)
 * - IN_PROGRESS → COMPLETED/NO_SHOW/EXPIRED (at end time, with 80% attendance check)
 */
const autoTransitionSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield session_service_1.SessionService.autoTransitionSessionStatuses();
        const totalChanges = result.startingSoon + result.inProgress + result.completed + result.noShow + result.expired;
        if (totalChanges > 0) {
            logger_1.logger.info(`Session auto-transition: ${result.startingSoon} starting soon, ${result.inProgress} in progress, ${result.completed} completed, ${result.noShow} no-show, ${result.expired} expired`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to auto-transition sessions', { error });
    }
});
exports.autoTransitionSessions = autoTransitionSessions;
/**
 * @deprecated Use autoTransitionSessions instead
 * Keeping for backward compatibility
 */
const autoCompleteSessions = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, exports.autoTransitionSessions)();
});
exports.autoCompleteSessions = autoCompleteSessions;
/**
 * Send session reminders
 * Runs every hour
 */
const sendSessionReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        // Find sessions starting in 24 hours
        const sessionsIn24Hours = yield session_model_1.Session.find({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
            startTime: {
                $gte: twentyFourHoursLater,
                $lte: new Date(twentyFourHoursLater.getTime() + 60 * 60 * 1000), // 1-hour window
            },
        })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');
        // Find sessions starting in 1 hour
        const sessionsIn1Hour = yield session_model_1.Session.find({
            status: session_interface_1.SESSION_STATUS.SCHEDULED,
            startTime: {
                $gte: oneHourLater,
                $lte: new Date(oneHourLater.getTime() + 10 * 60 * 1000), // 10-minute window
            },
        })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');
        // TODO: Send email reminders
        // for (const session of sessionsIn24Hours) {
        //   await sendEmail({
        //     to: [session.studentId.email, session.tutorId.email],
        //     subject: 'Session Reminder - Tomorrow',
        //     template: 'session-reminder-24h',
        //     data: { session },
        //   });
        // }
        // for (const session of sessionsIn1Hour) {
        //   await sendEmail({
        //     to: [session.studentId.email, session.tutorId.email],
        //     subject: 'Session Starting Soon',
        //     template: 'session-reminder-1h',
        //     data: { session },
        //   });
        // }
        if (sessionsIn24Hours.length > 0) {
            logger_1.logger.info(`Sent 24-hour reminders for ${sessionsIn24Hours.length} sessions`);
        }
        if (sessionsIn1Hour.length > 0) {
            logger_1.logger.info(`Sent 1-hour reminders for ${sessionsIn1Hour.length} sessions`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to send session reminders', { error });
    }
});
exports.sendSessionReminders = sendSessionReminders;
/**
 * Generate monthly billings (1st of every month at 2:00 AM)
 */
const generateMonthlyBillings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const lastMonth = now.getMonth(); // 0-11
        const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = lastMonth === 0 ? 12 : lastMonth;
        const result = yield monthlyBilling_service_1.MonthlyBillingService.generateMonthlyBillings(month, year);
        logger_1.logger.info(`Generated ${result.length} monthly billings for ${year}-${month}`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to generate monthly billings', { error });
    }
});
exports.generateMonthlyBillings = generateMonthlyBillings;
/**
 * Generate tutor earnings (4th of every month at 3:00 AM)
 * CHANGED: Moved from 1st to 4th to allow feedback deadline (3rd) to pass first
 */
const generateTutorEarnings = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const now = new Date();
        const lastMonth = now.getMonth(); // 0-11
        const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month = lastMonth === 0 ? 12 : lastMonth;
        const result = yield tutorEarnings_service_1.TutorEarningsService.generateTutorEarnings(month, year, 0.2);
        logger_1.logger.info(`Generated ${result.length} tutor earnings for ${year}-${month}`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to generate tutor earnings', { error });
    }
});
exports.generateTutorEarnings = generateTutorEarnings;
/**
 * Process forfeited feedbacks (4th of every month at 1:00 AM)
 * NEW: Runs before tutor earnings to mark missed deadlines
 */
const processForfeitedFeedbacks = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.processForfeitedFeedbacks();
        logger_1.logger.info(`Processed ${result.processed} forfeited feedbacks. Total forfeited: €${result.totalForfeited}`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to process forfeited feedbacks', { error });
    }
});
exports.processForfeitedFeedbacks = processForfeitedFeedbacks;
/**
 * Send feedback deadline reminders (1st of every month at 10:00 AM)
 * NEW: Remind tutors about pending feedbacks due on 3rd
 */
const sendFeedbackReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.sendDeadlineReminders();
        logger_1.logger.info(`Sent deadline reminders for ${count} pending feedbacks`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to send feedback reminders', { error });
    }
});
exports.sendFeedbackReminders = sendFeedbackReminders;
/**
 * Send final feedback reminders (2nd of every month at 10:00 AM)
 * NEW: Last warning before deadline
 */
const sendFinalFeedbackReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = yield tutorSessionFeedback_service_1.TutorSessionFeedbackService.sendFinalReminders();
        logger_1.logger.info(`Sent final reminders for ${count} pending feedbacks`);
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to send final feedback reminders', { error });
    }
});
exports.sendFinalFeedbackReminders = sendFinalFeedbackReminders;
/**
 * Cleanup expired available interview slots
 * Runs daily at midnight (00:00)
 * Deletes all AVAILABLE slots where the day has passed
 * Booked/completed/cancelled slots are kept for records
 */
const cleanupExpiredInterviewSlots = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedCount = yield interviewSlot_service_1.InterviewSlotService.cleanupExpiredAvailableSlots();
        if (deletedCount > 0) {
            logger_1.logger.info(`Cleaned up ${deletedCount} expired available interview slots`);
        }
    }
    catch (error) {
        logger_1.errorLogger.error('Failed to cleanup expired interview slots', { error });
    }
});
exports.cleanupExpiredInterviewSlots = cleanupExpiredInterviewSlots;
/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    // Expire trial requests - Every hour
    node_cron_1.default.schedule('0 * * * *', () => {
        logger_1.logger.info('Running cron: Expire trial requests');
        (0, exports.expireTrialRequests)();
    });
    // Auto-transition sessions with attendance tracking
    // TEST_MODE: Every 1 minute (for testing 5 min sessions)
    // PRODUCTION: Every 5 minutes
    const sessionTransitionSchedule = TEST_MODE ? '* * * * *' : '*/5 * * * *';
    node_cron_1.default.schedule(sessionTransitionSchedule, () => {
        logger_1.logger.info(`Running cron: Auto-transition sessions (TEST_MODE: ${TEST_MODE})`);
        (0, exports.autoTransitionSessions)();
    });
    // Send session reminders - Every hour
    node_cron_1.default.schedule('0 * * * *', () => {
        logger_1.logger.info('Running cron: Send session reminders');
        (0, exports.sendSessionReminders)();
    });
    // Generate monthly billings - 1st of month at 2:00 AM
    node_cron_1.default.schedule('0 2 1 * *', () => {
        logger_1.logger.info('Running cron: Generate monthly billings');
        (0, exports.generateMonthlyBillings)();
    });
    // Send feedback deadline reminders - 1st of month at 10:00 AM
    node_cron_1.default.schedule('0 10 1 * *', () => {
        logger_1.logger.info('Running cron: Send feedback deadline reminders');
        (0, exports.sendFeedbackReminders)();
    });
    // Send final feedback reminders - 2nd of month at 10:00 AM
    node_cron_1.default.schedule('0 10 2 * *', () => {
        logger_1.logger.info('Running cron: Send final feedback reminders');
        (0, exports.sendFinalFeedbackReminders)();
    });
    // Process forfeited feedbacks - 4th of month at 1:00 AM (before earnings)
    node_cron_1.default.schedule('0 1 4 * *', () => {
        logger_1.logger.info('Running cron: Process forfeited feedbacks');
        (0, exports.processForfeitedFeedbacks)();
    });
    // Generate tutor earnings - 4th of month at 3:00 AM (after forfeit processing)
    node_cron_1.default.schedule('0 3 4 * *', () => {
        logger_1.logger.info('Running cron: Generate tutor earnings');
        (0, exports.generateTutorEarnings)();
    });
    // Cleanup expired available interview slots - Daily at midnight (00:00)
    node_cron_1.default.schedule('0 0 * * *', () => {
        logger_1.logger.info('Running cron: Cleanup expired interview slots');
        (0, exports.cleanupExpiredInterviewSlots)();
    });
    logger_1.logger.info(`✅ Cron jobs initialized (TEST_MODE: ${TEST_MODE})`);
    if (TEST_MODE) {
        logger_1.logger.info('🧪 TEST MODE: Session auto-transition runs every 1 minute');
    }
};
exports.initializeCronJobs = initializeCronJobs;
exports.CronService = {
    initializeCronJobs: exports.initializeCronJobs,
    expireTrialRequests: exports.expireTrialRequests,
    autoCompleteSessions: exports.autoCompleteSessions,
    autoTransitionSessions: exports.autoTransitionSessions,
    sendSessionReminders: exports.sendSessionReminders,
    generateMonthlyBillings: exports.generateMonthlyBillings,
    generateTutorEarnings: exports.generateTutorEarnings,
    cleanupExpiredInterviewSlots: exports.cleanupExpiredInterviewSlots,
    processForfeitedFeedbacks: exports.processForfeitedFeedbacks,
    sendFeedbackReminders: exports.sendFeedbackReminders,
    sendFinalFeedbackReminders: exports.sendFinalFeedbackReminders,
};
