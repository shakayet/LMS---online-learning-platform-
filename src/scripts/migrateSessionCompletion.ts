
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import { Session } from '../app/modules/session/session.model';
import { TutorSessionFeedback } from '../app/modules/tutorSessionFeedback/tutorSessionFeedback.model';
import { SESSION_STATUS, COMPLETION_STATUS } from '../app/modules/session/session.interface';
import { FEEDBACK_STATUS } from '../app/modules/tutorSessionFeedback/tutorSessionFeedback.interface';

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/lms';

const migrateSessionCompletionData = async () => {
  console.log('🚀 Starting Session Completion Migration...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

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

      if (session.studentCompletionStatus && session.studentCompletionStatus !== COMPLETION_STATUS.NOT_APPLICABLE) {
        skippedCount++;
        continue;
      }

      const tutorJoined = (session.tutorAttendance?.joinCount || 0) > 0;
      const studentJoined = (session.studentAttendance?.joinCount || 0) > 0;

      session.set('tutorJoined', tutorJoined);
      session.set('studentJoined', studentJoined);

      if (session.noShowBy === 'tutor' || !tutorJoined) {
        session.set('studentCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherCompletionStatus', COMPLETION_STATUS.NOT_APPLICABLE);
        session.set('teacherFeedbackRequired', false);
      } else {

        session.set('studentCompletionStatus', COMPLETION_STATUS.COMPLETED);
        session.set('studentCompletedAt', session.completedAt || session.endTime);

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

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
};

migrateSessionCompletionData()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
