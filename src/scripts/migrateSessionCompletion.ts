/**
 * Migration Script: Session Completion Status
 *
 * This script updates existing sessions with the new completion tracking fields:
 * - studentCompletionStatus
 * - studentCompletedAt
 * - studentJoined
 * - teacherCompletionStatus
 * - teacherCompletedAt
 * - teacherJoined
 * - teacherFeedbackRequired
 *
 * Run with: npx ts-node src/scripts/migrateSessionCompletion.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Session } from '../app/modules/session/session.model';
import { TutorSessionFeedback } from '../app/modules/tutorSessionFeedback/tutorSessionFeedback.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../app/modules/session/session.interface';
import { FEEDBACK_STATUS } from '../app/modules/tutorSessionFeedback/tutorSessionFeedback.interface';

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/lms';

const migrateSessionCompletionData = async () => {
  console.log('🚀 Starting Session Completion Migration...\n');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find all sessions that have ended
  const sessions = await Session.find({
    status: {
      $in: [
        SESSION_STATUS.COMPLETED,
        SESSION_STATUS.NO_SHOW,
        SESSION_STATUS.EXPIRED,
      ],
    },
  });

  console.log(`📊 Found ${sessions.length} sessions to migrate\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const session of sessions) {
    try {
      // Skip if already migrated
      if (session.studentCompletionStatus && session.studentCompletionStatus !== COMPLETION_STATUS.NOT_APPLICABLE) {
        skippedCount++;
        continue;
      }

      // Determine join status from existing attendance data
      const tutorJoined = (session.tutorAttendance?.joinCount || 0) > 0;
      const studentJoined = (session.studentAttendance?.joinCount || 0) > 0;

      session.set('tutorJoined', tutorJoined);
      session.set('studentJoined', studentJoined);

      // If tutor didn't show up
      if (session.noShowBy === 'tutor' || !tutorJoined) {
        session.set('studentCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherFeedbackRequired', false);
      } else {
        // Tutor was present - check feedback status
        session.set('studentCompletionStatus', COMPLETION_STATUS.COMPLETED);
        session.set('studentCompletedAt', session.completedAt || session.endTime);

        // Check if feedback exists and is submitted
        const feedback = await TutorSessionFeedback.findOne({
          sessionId: session._id,
        });

        if (feedback?.status === FEEDBACK_STATUS.SUBMITTED) {
          session.set('teacherCompletionStatus', COMPLETION_STATUS.COMPLETED);
          session.set('teacherCompletedAt', feedback.submittedAt);
          session.set('teacherFeedbackRequired', false);
        } else {
          session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
          session.set('teacherFeedbackRequired', feedback ? true : false);
        }
      }

      await session.save();
      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`⏳ Migrated ${migratedCount}/${sessions.length} sessions...`);
      }
    } catch (error: any) {
      console.error(`❌ Error migrating session ${session._id}:`, error.message);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   - Migrated: ${migratedCount} sessions`);
  console.log(`   - Skipped (already migrated): ${skippedCount} sessions`);

  // Disconnect
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

// Run migration
migrateSessionCompletionData()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
