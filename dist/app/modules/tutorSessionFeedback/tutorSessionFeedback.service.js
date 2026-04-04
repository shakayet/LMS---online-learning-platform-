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
exports.TutorSessionFeedbackService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const session_model_1 = require("../session/session.model");
const session_interface_1 = require("../session/session.interface");
const user_model_1 = require("../user/user.model");
const tutorSessionFeedback_model_1 = require("./tutorSessionFeedback.model");
const tutorSessionFeedback_interface_1 = require("./tutorSessionFeedback.interface");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const emailHelper_1 = require("../../../helpers/emailHelper");
const date_fns_1 = require("date-fns");

const calculateDueDate = (sessionDate) => {
    const dueDate = new Date(sessionDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(3);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate;
};

const createPendingFeedback = (sessionId, tutorId, studentId, sessionCompletedAt) => __awaiter(void 0, void 0, void 0, function* () {

    const existingFeedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId });
    if (existingFeedback) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Feedback record already exists for this session');
    }
    const dueDate = calculateDueDate(sessionCompletedAt);
    const feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.create({
        sessionId,
        tutorId,
        studentId,
        dueDate,
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        rating: 0,
        feedbackType: tutorSessionFeedback_interface_1.FEEDBACK_TYPE.TEXT,
    });

    yield user_model_1.User.findByIdAndUpdate(tutorId, {
        $inc: { 'tutorProfile.pendingFeedbackCount': 1 },
    });
    return feedback;
});

const submitFeedback = (tutorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { sessionId, rating, feedbackType, feedbackText, feedbackAudioUrl, audioDuration } = payload;

    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }

    const now = new Date();
    const eligibleStatuses = [
        session_interface_1.SESSION_STATUS.SCHEDULED,
        session_interface_1.SESSION_STATUS.STARTING_SOON,
        session_interface_1.SESSION_STATUS.IN_PROGRESS,
    ];
    if (eligibleStatuses.includes(session.status) && session.endTime <= now) {
        session.status = session_interface_1.SESSION_STATUS.COMPLETED;
        session.completedAt = now;
        if (!session.startedAt) {
            session.startedAt = session.startTime;
        }
        yield session.save();
    }
    if (session.status !== session_interface_1.SESSION_STATUS.COMPLETED && session.status !== session_interface_1.SESSION_STATUS.NO_SHOW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Can only submit feedback for completed sessions');
    }

    if (session.tutorId.toString() !== tutorId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You can only submit feedback for your own sessions');
    }

    let feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId });
    const dueDate = (feedback === null || feedback === void 0 ? void 0 : feedback.dueDate) || calculateDueDate(session.completedAt || now);

    if (now > dueDate) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Feedback deadline has passed. You can no longer submit feedback for this session.');
    }
    if (feedback) {

        if (feedback.status === tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Feedback already submitted');
        }

        if (feedback.paymentForfeited) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This feedback has been forfeited due to missed deadline. Payment cannot be recovered.');
        }
        feedback.rating = rating;
        feedback.feedbackType = feedbackType;
        feedback.feedbackText = feedbackText;
        feedback.feedbackAudioUrl = feedbackAudioUrl;
        feedback.audioDuration = audioDuration;
        feedback.submittedAt = now;
        feedback.isLate = false;
        feedback.status = tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED;
        yield feedback.save();
    }
    else {

        feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.create({
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
            status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
            paymentForfeited: false,
        });
    }

    yield session_model_1.Session.findByIdAndUpdate(sessionId, {
        tutorFeedbackId: feedback._id,
        teacherCompletionStatus: session_interface_1.COMPLETION_STATUS.COMPLETED,
        teacherCompletedAt: now,
        teacherFeedbackRequired: false,
    });

    yield user_model_1.User.findByIdAndUpdate(tutorId, {
        $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
    });

    yield updateTutorRating(tutorId);

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

        io.to(`chat::${chatIdStr}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);
        io.to(`user::${String(session.studentId)}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);
        io.to(`user::${tutorId}`).emit('FEEDBACK_SUBMITTED', feedbackPayload);
        console.log(`[Socket Emit] FEEDBACK_SUBMITTED sent for session ${sessionId}`);
    }
    return feedback;
});

const updateTutorRating = (tutorId) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield tutorSessionFeedback_model_1.TutorSessionFeedback.aggregate([
        {
            $match: {
                tutorId: new mongoose_1.Types.ObjectId(tutorId),
                status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
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
        yield user_model_1.User.findByIdAndUpdate(tutorId, {
            averageRating: Math.round(result[0].averageRating * 10) / 10,
            ratingsCount: result[0].count,
        });
    }
});

const getPendingFeedbacks = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
    })
        .populate('sessionId', 'subject startTime endTime studentId')
        .populate('studentId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});

const getTutorFeedbacks = (tutorId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        tutorId: new mongoose_1.Types.ObjectId(tutorId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
    })
        .populate('sessionId', 'subject startTime endTime')
        .populate('studentId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});

const getFeedbackBySession = (sessionId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const feedback = yield tutorSessionFeedback_model_1.TutorSessionFeedback.findOne({ sessionId })
        .populate('sessionId', 'subject startTime endTime tutorId studentId')
        .populate('studentId', 'name email profilePicture')
        .populate('tutorId', 'name email profilePicture');
    if (!feedback) {
        return null;
    }

    const session = yield session_model_1.Session.findById(sessionId);
    if (!session) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Session not found');
    }
    const isAuthorized = session.tutorId.toString() === userId || session.studentId.toString() === userId;
    if (!isAuthorized) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to view this feedback');
    }
    return feedback;
});

const getStudentFeedbacks = (studentId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        studentId: new mongoose_1.Types.ObjectId(studentId),
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.SUBMITTED,
    })
        .populate('sessionId', 'subject startTime endTime')
        .populate('tutorId', 'name email profilePicture'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});

const getFeedbacksDueSoon = (daysUntilDue) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilDue);
    return tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lte: targetDate },
    })
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime')
        .populate('studentId', 'name');
});

const getOverdueFeedbacks = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    return tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lt: now },
    })
        .populate('tutorId', 'name email')
        .populate('sessionId', 'subject startTime')
        .populate('studentId', 'name');
});

const processForfeitedFeedbacks = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    let processed = 0;
    let totalForfeited = 0;

    const overdueFeedbacks = yield tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        status: tutorSessionFeedback_interface_1.FEEDBACK_STATUS.PENDING,
        dueDate: { $lt: now },
        paymentForfeited: { $ne: true },
    }).populate('sessionId');
    for (const feedback of overdueFeedbacks) {
        try {
            const session = feedback.sessionId;
            const forfeitedAmount = (session === null || session === void 0 ? void 0 : session.totalPrice) || 0;

            feedback.paymentForfeited = true;
            feedback.forfeitedAmount = forfeitedAmount;
            feedback.forfeitedAt = now;
            yield feedback.save();

            if (session === null || session === void 0 ? void 0 : session._id) {
                yield session_model_1.Session.findByIdAndUpdate(session._id, {
                    teacherCompletionStatus: session_interface_1.COMPLETION_STATUS.NOT_APPLICABLE,
                    teacherFeedbackRequired: false,
                });
            }

            yield user_model_1.User.findByIdAndUpdate(feedback.tutorId, {
                $inc: { 'tutorProfile.pendingFeedbackCount': -1 },
            });
            processed++;
            totalForfeited += forfeitedAmount;
            console.log(`Payment forfeited: Session ${session === null || session === void 0 ? void 0 : session._id}, Tutor ${feedback.tutorId}, Amount €${forfeitedAmount}`);
        }
        catch (error) {
            console.error(`Error processing forfeited feedback ${feedback._id}:`, error);
        }
    }
    console.log(`Processed ${processed} forfeited feedbacks. Total forfeited: €${totalForfeited}`);
    return { processed, totalForfeited };
});

const getForfeitedPaymentsSummary = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const matchStage = { paymentForfeited: true };
    if ((query === null || query === void 0 ? void 0 : query.month) && (query === null || query === void 0 ? void 0 : query.year)) {
        const startDate = new Date(query.year, query.month - 1, 1);
        const endDate = new Date(query.year, query.month, 0, 23, 59, 59);
        matchStage.forfeitedAt = { $gte: startDate, $lte: endDate };
    }
    const summary = yield tutorSessionFeedback_model_1.TutorSessionFeedback.aggregate([
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
    const grandTotal = yield tutorSessionFeedback_model_1.TutorSessionFeedback.aggregate([
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
});

const sendDeadlineReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    const feedbacksDueSoon = yield getFeedbacksDueSoon(3);
    let sent = 0;
    for (const feedback of feedbacksDueSoon) {
        const tutor = feedback.tutorId;
        const session = feedback.sessionId;
        if (!(tutor === null || tutor === void 0 ? void 0 : tutor.email))
            continue;
        const dueDate = (0, date_fns_1.format)(new Date(feedback.dueDate), 'MMMM d, yyyy');
        const sessionSubject = (session === null || session === void 0 ? void 0 : session.subject) || 'N/A';
        const sessionDate = (session === null || session === void 0 ? void 0 : session.startTime)
            ? (0, date_fns_1.format)(new Date(session.startTime), 'MMMM d, yyyy')
            : 'N/A';
        try {
            yield emailHelper_1.emailHelper.sendEmail({
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
            console.log(`Reminder sent to ${tutor.email} for session ${session === null || session === void 0 ? void 0 : session._id}`);
        }
        catch (error) {
            console.error(`Failed to send reminder to ${tutor.email}:`, error);
        }
    }
    console.log(`Sent ${sent}/${feedbacksDueSoon.length} deadline reminders`);
    return sent;
});

const sendFinalReminders = () => __awaiter(void 0, void 0, void 0, function* () {
    const feedbacksDueSoon = yield getFeedbacksDueSoon(1);
    let sent = 0;
    for (const feedback of feedbacksDueSoon) {
        const tutor = feedback.tutorId;
        const session = feedback.sessionId;
        if (!(tutor === null || tutor === void 0 ? void 0 : tutor.email))
            continue;
        const dueDate = (0, date_fns_1.format)(new Date(feedback.dueDate), 'MMMM d, yyyy');
        const sessionSubject = (session === null || session === void 0 ? void 0 : session.subject) || 'N/A';
        const forfeitAmount = (session === null || session === void 0 ? void 0 : session.totalPrice) || 0;
        try {
            yield emailHelper_1.emailHelper.sendEmail({
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
            console.log(`FINAL reminder sent to ${tutor.email} for session ${session === null || session === void 0 ? void 0 : session._id}`);
        }
        catch (error) {
            console.error(`Failed to send final reminder to ${tutor.email}:`, error);
        }
    }
    console.log(`Sent ${sent}/${feedbacksDueSoon.length} final reminders`);
    return sent;
});

const getForfeitedFeedbacksList = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const feedbackQuery = new QueryBuilder_1.default(tutorSessionFeedback_model_1.TutorSessionFeedback.find({
        paymentForfeited: true,
    })
        .populate('tutorId', 'name email profilePicture')
        .populate('studentId', 'name email')
        .populate('sessionId', 'subject startTime endTime totalPrice'), query)
        .sort()
        .paginate()
        .fields();
    const data = yield feedbackQuery.modelQuery;
    const meta = yield feedbackQuery.getPaginationInfo();
    return { data, meta };
});
exports.TutorSessionFeedbackService = {
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
