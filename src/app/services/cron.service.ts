
import { logger, errorLogger } from '../../shared/logger';
import cron from 'node-cron';

const TEST_MODE = true;

import { MonthlyBillingService } from '../modules/monthlyBilling/monthlyBilling.service';
import { TutorEarningsService } from '../modules/tutorEarnings/tutorEarnings.service';
import { SessionService } from '../modules/session/session.service';
import { InterviewSlotService } from '../modules/interviewSlot/interviewSlot.service';
import { TutorSessionFeedbackService } from '../modules/tutorSessionFeedback/tutorSessionFeedback.service';
import { TrialRequest } from '../modules/trialRequest/trialRequest.model';
import { TRIAL_REQUEST_STATUS } from '../modules/trialRequest/trialRequest.interface';
import { Session } from '../modules/session/session.model';
import { SESSION_STATUS } from '../modules/session/session.interface';

export const expireTrialRequests = async () => {
  try {
    const now = new Date();

    const expiredRequests = await TrialRequest.updateMany(
      {
        status: TRIAL_REQUEST_STATUS.PENDING,
        expiresAt: { $lte: now },
      },
      {
        $set: { status: TRIAL_REQUEST_STATUS.EXPIRED },
      }
    );

    if (expiredRequests.modifiedCount > 0) {
      logger.info(`Expired ${expiredRequests.modifiedCount} trial requests`);
    }
  } catch (error) {
    errorLogger.error('Failed to expire trial requests', { error });
  }
};

export const autoTransitionSessions = async () => {
  try {
    const result = await SessionService.autoTransitionSessionStatuses();

    const totalChanges = result.startingSoon + result.inProgress + result.completed + result.noShow + result.expired;

    if (totalChanges > 0) {
      logger.info(`Session auto-transition: ${result.startingSoon} starting soon, ${result.inProgress} in progress, ${result.completed} completed, ${result.noShow} no-show, ${result.expired} expired`);
    }
  } catch (error) {
    errorLogger.error('Failed to auto-transition sessions', { error });
  }
};

export const autoCompleteSessions = async () => {
  await autoTransitionSessions();
};

export const sendSessionReminders = async () => {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const sessionsIn24Hours = await Session.find({
      status: SESSION_STATUS.SCHEDULED,
      startTime: {
        $gte: twentyFourHoursLater,
        $lte: new Date(twentyFourHoursLater.getTime() + 60 * 60 * 1000),
      },
    })
      .populate('studentId', 'name email')
      .populate('tutorId', 'name email');

    const sessionsIn1Hour = await Session.find({
      status: SESSION_STATUS.SCHEDULED,
      startTime: {
        $gte: oneHourLater,
        $lte: new Date(oneHourLater.getTime() + 10 * 60 * 1000),
      },
    })
      .populate('studentId', 'name email')
      .populate('tutorId', 'name email');

    if (sessionsIn24Hours.length > 0) {
      logger.info(`Sent 24-hour reminders for ${sessionsIn24Hours.length} sessions`);
    }

    if (sessionsIn1Hour.length > 0) {
      logger.info(`Sent 1-hour reminders for ${sessionsIn1Hour.length} sessions`);
    }
  } catch (error) {
    errorLogger.error('Failed to send session reminders', { error });
  }
};

export const generateMonthlyBillings = async () => {
  try {
    const now = new Date();
    const lastMonth = now.getMonth();
    const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonth === 0 ? 12 : lastMonth;

    const result = await MonthlyBillingService.generateMonthlyBillings(month, year);

    logger.info(`Generated ${result.length} monthly billings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate monthly billings', { error });
  }
};

export const generateTutorEarnings = async () => {
  try {
    const now = new Date();
    const lastMonth = now.getMonth();
    const year = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonth === 0 ? 12 : lastMonth;

    const result = await TutorEarningsService.generateTutorEarnings(month, year, 0.2);

    logger.info(`Generated ${result.length} tutor earnings for ${year}-${month}`);
  } catch (error) {
    errorLogger.error('Failed to generate tutor earnings', { error });
  }
};

export const processForfeitedFeedbacks = async () => {
  try {
    const result = await TutorSessionFeedbackService.processForfeitedFeedbacks();
    logger.info(`Processed ${result.processed} forfeited feedbacks. Total forfeited: €${result.totalForfeited}`);
  } catch (error) {
    errorLogger.error('Failed to process forfeited feedbacks', { error });
  }
};

export const sendFeedbackReminders = async () => {
  try {
    const count = await TutorSessionFeedbackService.sendDeadlineReminders();
    logger.info(`Sent deadline reminders for ${count} pending feedbacks`);
  } catch (error) {
    errorLogger.error('Failed to send feedback reminders', { error });
  }
};

export const sendFinalFeedbackReminders = async () => {
  try {
    const count = await TutorSessionFeedbackService.sendFinalReminders();
    logger.info(`Sent final reminders for ${count} pending feedbacks`);
  } catch (error) {
    errorLogger.error('Failed to send final feedback reminders', { error });
  }
};

export const cleanupExpiredInterviewSlots = async () => {
  try {
    const deletedCount = await InterviewSlotService.cleanupExpiredAvailableSlots();

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired available interview slots`);
    }
  } catch (error) {
    errorLogger.error('Failed to cleanup expired interview slots', { error });
  }
};

export const initializeCronJobs = () => {

  cron.schedule('0 * * * *', () => {
    logger.info('Running cron: Expire trial requests');
    expireTrialRequests();
  });

  const sessionTransitionSchedule = TEST_MODE ? '* * * * *' : '*/5 * * * *';
  cron.schedule(sessionTransitionSchedule, () => {
    logger.info(`Running cron: Auto-transition sessions (TEST_MODE: ${TEST_MODE})`);
    autoTransitionSessions();
  });

  cron.schedule('0 * * * *', () => {
    logger.info('Running cron: Send session reminders');
    sendSessionReminders();
  });

  cron.schedule('0 2 1 * *', () => {
    logger.info('Running cron: Generate monthly billings');
    generateMonthlyBillings();
  });

  cron.schedule('0 10 1 * *', () => {
    logger.info('Running cron: Send feedback deadline reminders');
    sendFeedbackReminders();
  });

  cron.schedule('0 10 2 * *', () => {
    logger.info('Running cron: Send final feedback reminders');
    sendFinalFeedbackReminders();
  });

  cron.schedule('0 1 4 * *', () => {
    logger.info('Running cron: Process forfeited feedbacks');
    processForfeitedFeedbacks();
  });

  cron.schedule('0 3 4 * *', () => {
    logger.info('Running cron: Generate tutor earnings');
    generateTutorEarnings();
  });

  cron.schedule('0 0 * * *', () => {
    logger.info('Running cron: Cleanup expired interview slots');
    cleanupExpiredInterviewSlots();
  });

  logger.info(`✅ Cron jobs initialized (TEST_MODE: ${TEST_MODE})`);
  if (TEST_MODE) {
    logger.info('🧪 TEST MODE: Session auto-transition runs every 1 minute');
  }
};

export const CronService = {
  initializeCronJobs,
  expireTrialRequests,
  autoCompleteSessions,
  autoTransitionSessions,
  sendSessionReminders,
  generateMonthlyBillings,
  generateTutorEarnings,
  cleanupExpiredInterviewSlots,
  processForfeitedFeedbacks,
  sendFeedbackReminders,
  sendFinalFeedbackReminders,
};
