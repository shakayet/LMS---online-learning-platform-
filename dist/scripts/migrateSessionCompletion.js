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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();

const session_model_1 = require("../app/modules/session/session.model");
const tutorSessionFeedback_model_1 = require("../app/modules/tutorSessionFeedback/tutorSessionFeedback.model");
const session_interface_1 = require("../app/modules/session/session.interface");
const tutorSessionFeedback_interface_1 = require("../app/modules/tutorSessionFeedback/tutorSessionFeedback.interface");
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/lms';
const migrateSessionCompletionData = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('🚀 Starting Session Completion Migration...\n');

    yield mongoose_1.default.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const sessions = yield session_model_1.Session.find({
        status: {
            $in: [
                session_interface_1.SESSION_STATUS.COMPLETED,
                session_interface_1.SESSION_STATUS.NO_SHOW,
                session_interface_1.SESSION_STATUS.EXPIRED,
            ],
        },
    });
    console.log(`📊 Found ${sessions.length} sessions to migrate\n`);
    let migratedCount = 0;
    let skippedCount = 0;
    for (const session of sessions) {
        try {

            if (session.studentCompletionStatus && session.studentCompletionStatus !== session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE) {
                skippedCount++;
                continue;
            }

            const tutorJoined = (((_a = session.tutorAttendance) === null || _a === void 0 ? void 0 : _a.joinCount) || 0) > 0;
            const studentJoined = (((_b = session.studentAttendance) === null || _b === void 0 ? void 0 : _b.joinCount) || 0) > 0;
            session.set('tutorJoined', tutorJoined);
            session.set('studentJoined', studentJoined);

            if (session.noShowBy === 'tutor' || !tutorJoined) {
                session.set('studentCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
                session.set('teacherCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
                session.set('teacherFeedbackRequired', false);
            }
            else {

                session.set('studentCompletionStatus', session_interface_1.COMPLETION_STATUS.COMPLETED);
                session.set('studentCompletedAt', session.completedAt || session.endTime);

                const feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({
                    sessionId: session._id,
                });
                if ((feedback === null || feedback === void 0 ? void 0 : feedback.status) === tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED) {
                    session.set('teacherCompletionStatus', session_interface_1.COMPLETION_STATUS.COMPLETED);
                    session.set('teacherCompletedAt', feedback.submittedAt);
                    session.set('teacherFeedbackRequired', false);
                }
                else {
                    session.set('teacherCompletionStatus', session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE);
                    session.set('teacherFeedbackRequired', feedback ? true : false);
                }
            }
            yield session.save();
            migratedCount++;
            if (migratedCount % 100 === 0) {
                console.log(`⏳ Migrated ${migratedCount}/${sessions.length} sessions...`);
            }
        }
        catch (error) {
            console.error(`❌ Error migrating session ${session._id}:`, error.message);
        }
    }
    console.log(`\n✅ Migration complete!`);
    console.log(`   - Migrated: ${migratedCount} sessions`);
    console.log(`   - Skipped (already migrated): ${skippedCount} sessions`);

    yield mongoose_1.default.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
});

migrateSessionCompletionData()
    .then(() => {
    console.log('\n🎉 Migration script finished successfully!');
    process.exit(0);
})
    .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
});
