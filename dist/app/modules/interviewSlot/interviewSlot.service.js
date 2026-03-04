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
exports.InterviewSlotService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const tutorApplication_interface_1 = require("../tutorApplication/tutorApplication.interface");
const interviewSlot_interface_1 = require("./interviewSlot.interface");
const interviewSlot_model_1 = require("./interviewSlot.model");
const agora_helper_1 = require("../call/agora.helper");
const config_1 = __importDefault(require("../../../config"));
/**
 * Create interview slot (Admin only)
 */
const createInterviewSlot = (adminId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify admin exists
    const admin = yield user_model_1.User.findById(adminId);
    if (!admin) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Admin not found');
    }
    // Create slot
    const slotData = Object.assign(Object.assign({}, payload), { adminId: new mongoose_1.Types.ObjectId(adminId), status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE });
    const slot = yield interviewSlot_model_1.InterviewSlot.create(slotData);
    return slot;
});
/**
 * Get all interview slots with filtering
 * Admin: See all slots
 * Applicant: Must be SELECTED_FOR_INTERVIEW to see available slots
 */
const getAllInterviewSlots = (query, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    let filter = {};
    // If applicant, check if they are SELECTED_FOR_INTERVIEW
    if (userRole === 'APPLICANT') {
        // Get user's email
        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
        }
        // Check application status
        const application = yield tutorApplication_model_1.TutorApplication.findOne({ email: user.email });
        if (!application) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No application found');
        }
        // Only SELECTED_FOR_INTERVIEW can view slots
        if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You must be selected for interview to view available slots');
        }
        // Only show available slots
        filter = { status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE };
    }
    const slotQuery = new QueryBuilder_1.default(interviewSlot_model_1.InterviewSlot.find(filter)
        .populate('adminId', 'name email')
        .populate('applicantId', 'name email'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = yield slotQuery.modelQuery;
    const meta = yield slotQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
});
/**
 * Get single interview slot by ID
 */
const getSingleInterviewSlot = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id)
        .populate('adminId', 'name email')
        .populate('applicantId', 'name email')
        .populate('applicationId');
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    return slot;
});
/**
 * Book interview slot (Applicant)
 */
const bookInterviewSlot = (slotId, applicantId, applicationId) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify slot exists and is available
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Interview slot is not available');
    }
    // Verify application exists and belongs to applicant
    const application = yield tutorApplication_model_1.TutorApplication.findById(applicationId);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }
    // Get user to check email match
    const user = yield user_model_1.User.findById(applicantId);
    if (!user || application.email !== user.email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This application does not belong to you');
    }
    // Check if application is SELECTED_FOR_INTERVIEW status
    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only applications selected for interview can book interview slots');
    }
    // Check if applicant already has a booked slot
    const existingBooking = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED,
    });
    if (existingBooking) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a booked interview slot. Cancel it first to book a new one.');
    }
    // Update slot
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    slot.applicantId = new mongoose_1.Types.ObjectId(applicantId);
    slot.applicationId = new mongoose_1.Types.ObjectId(applicationId);
    slot.bookedAt = new Date();
    // Generate Agora channel name for video call
    slot.agoraChannelName = (0, agora_helper_1.generateChannelName)();
    yield slot.save();
    // Clear any previous cancellation reason from the application
    yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(applicationId, {
        $unset: { interviewCancelledReason: 1, interviewCancelledAt: 1 },
    });
    // TODO: Send email notification to applicant with meeting details
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Interview Scheduled - Tutor Application',
    //   template: 'interview-scheduled',
    //   data: {
    //     name: application.name,
    //     meetLink: slot.googleMeetLink,
    //     startTime: slot.startTime,
    //     endTime: slot.endTime
    //   }
    // });
    return slot;
});
/**
 * Cancel interview slot
 * Admin or Applicant can cancel (must be at least 1 hour before interview)
 */
const cancelInterviewSlot = (slotId, userId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be cancelled');
    }
    // Verify user is either admin or applicant of this slot
    const user = yield user_model_1.User.findById(userId);
    const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
    const isSlotOwner = ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isAdmin && !isSlotOwner) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this slot');
    }
    // Check if cancellation is at least 1 hour before interview (for applicants only)
    if (!isAdmin) {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        if (slot.startTime <= oneHourFromNow) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot cancel interview less than 1 hour before the scheduled time');
        }
    }
    // Save applicationId before clearing
    const savedApplicationId = slot.applicationId;
    // Update slot - make it available again for others to book
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    slot.applicantId = undefined;
    slot.applicationId = undefined;
    slot.bookedAt = undefined;
    yield slot.save();
    // Keep application status as SELECTED_FOR_INTERVIEW (so they can book again)
    // The applicant should still be able to book a new interview slot
    // If admin cancelled, save the cancellation reason to the application
    if (savedApplicationId) {
        const updateData = {
            status: tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW,
        };
        // Only save cancellation reason if admin cancelled (with a reason)
        if (isAdmin && cancellationReason) {
            updateData.interviewCancelledReason = cancellationReason;
            updateData.interviewCancelledAt = new Date();
        }
        yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(savedApplicationId, updateData);
    }
    // TODO: Send cancellation email
    // await sendEmail({
    //   to: application.email,
    //   subject: 'Interview Cancelled',
    //   template: 'interview-cancelled',
    //   data: { reason: cancellationReason, startTime: slot.startTime }
    // });
    return slot;
});
/**
 * Mark interview as completed (Admin only)
 * After completion, admin can approve/reject the application separately
 */
const markAsCompleted = (slotId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be marked as completed');
    }
    // Update slot
    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.COMPLETED;
    slot.completedAt = new Date();
    yield slot.save();
    // Application status remains SUBMITTED - admin will approve/reject separately
    return slot;
});
/**
 * Reschedule interview slot (Applicant)
 * Cancel current booking and book a new slot in one action
 */
const rescheduleInterviewSlot = (currentSlotId, newSlotId, applicantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Get current slot
    const currentSlot = yield interviewSlot_model_1.InterviewSlot.findById(currentSlotId);
    if (!currentSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Current interview slot not found');
    }
    // Verify applicant owns this slot
    if (((_a = currentSlot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) !== applicantId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reschedule this slot');
    }
    if (currentSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be rescheduled');
    }
    // Check if reschedule is at least 1 hour before current interview
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (currentSlot.startTime <= oneHourFromNow) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reschedule interview less than 1 hour before the scheduled time');
    }
    // Get new slot
    const newSlot = yield interviewSlot_model_1.InterviewSlot.findById(newSlotId);
    if (!newSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'New interview slot not found');
    }
    if (newSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New slot is not available');
    }
    // Save applicant and application IDs before clearing
    const savedApplicantId = currentSlot.applicantId;
    const savedApplicationId = currentSlot.applicationId;
    // Cancel current slot (make it available again)
    currentSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    currentSlot.applicantId = undefined;
    currentSlot.applicationId = undefined;
    currentSlot.bookedAt = undefined;
    yield currentSlot.save();
    // Book new slot
    newSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    newSlot.applicantId = savedApplicantId;
    newSlot.applicationId = savedApplicationId;
    newSlot.bookedAt = new Date();
    yield newSlot.save();
    // TODO: Send reschedule email notification
    // await sendEmail({
    //   to: applicant.email,
    //   subject: 'Interview Rescheduled',
    //   template: 'interview-rescheduled',
    //   data: {
    //     oldTime: currentSlot.startTime,
    //     newTime: newSlot.startTime,
    //     meetLink: newSlot.googleMeetLink
    //   }
    // });
    return newSlot;
});
/**
 * Update interview slot (Admin only)
 */
const updateInterviewSlot = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    // Don't allow updating booked/completed/cancelled slots
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot update slot that is not available');
    }
    const updated = yield interviewSlot_model_1.InterviewSlot.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return updated;
});
/**
 * Delete interview slot (Admin only)
 */
const deleteInterviewSlot = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    // Don't allow deleting booked slots
    if (slot.status === interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot delete booked slot. Cancel it first.');
    }
    const result = yield interviewSlot_model_1.InterviewSlot.findByIdAndDelete(id);
    return result;
});
/**
 * Get my booked interview slot (Applicant only)
 * Returns BOOKED or COMPLETED interview slots
 */
const getMyBookedInterview = (applicantId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: { $in: [interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED, interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.COMPLETED] },
    })
        .populate('adminId', 'name email')
        .populate('applicationId')
        .sort({ createdAt: -1 }); // Get the most recent one
    return slot;
});
/**
 * Get all scheduled meetings (BOOKED interview slots) - Admin only
 * Returns slots with full applicant and application details
 */
const getScheduledMeetings = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const slotQuery = new QueryBuilder_1.default(interviewSlot_model_1.InterviewSlot.find({ status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED })
        .populate('adminId', 'name email')
        .populate('applicantId', 'name email')
        .populate({
        path: 'applicationId',
        select: 'name email phone subjects status',
        populate: {
            path: 'subjects',
            select: 'name',
        },
    }), query)
        .sort()
        .paginate();
    const result = yield slotQuery.modelQuery;
    const meta = yield slotQuery.getPaginationInfo();
    // Transform data to include application details
    const meetings = result.map((slot) => {
        var _a, _b, _c;
        const application = slot.applicationId;
        // Extract subject names from populated subjects
        const subjectNames = ((_a = application === null || application === void 0 ? void 0 : application.subjects) === null || _a === void 0 ? void 0 : _a.map((subject) => typeof subject === 'object' ? subject.name : subject)) || [];
        return {
            _id: slot._id,
            applicantName: (application === null || application === void 0 ? void 0 : application.name) || ((_b = slot.applicantId) === null || _b === void 0 ? void 0 : _b.name) || 'N/A',
            applicantEmail: (application === null || application === void 0 ? void 0 : application.email) || ((_c = slot.applicantId) === null || _c === void 0 ? void 0 : _c.email) || 'N/A',
            applicantPhone: (application === null || application === void 0 ? void 0 : application.phone) || 'N/A',
            subjects: subjectNames,
            startTime: slot.startTime,
            endTime: slot.endTime,
            agoraChannelName: slot.agoraChannelName || null,
            bookedAt: slot.bookedAt,
            adminId: slot.adminId,
        };
    });
    return {
        meta,
        data: meetings,
    };
});
/**
 * Get meeting token for interview video call
 * Both Admin and Applicant can get token if they are part of the meeting
 */
const getInterviewMeetingToken = (slotId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Interview slot is not booked');
    }
    if (!slot.agoraChannelName) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'No meeting channel available for this interview');
    }
    // Verify user is either admin or applicant of this slot
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    const isAdmin = user.role === 'SUPER_ADMIN';
    const isApplicant = ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isAdmin && !isApplicant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to join this meeting');
    }
    // Generate Agora token
    const uid = (0, agora_helper_1.userIdToAgoraUid)(userId);
    const token = (0, agora_helper_1.generateRtcToken)(slot.agoraChannelName, uid);
    return {
        token,
        channelName: slot.agoraChannelName,
        uid,
        appId: config_1.default.agora.appId,
    };
});
/**
 * Cleanup expired available interview slots
 * Deletes all AVAILABLE slots where the day has passed (startTime < start of today)
 * Only deletes unbooked slots - booked/completed/cancelled slots are kept for records
 */
const cleanupExpiredAvailableSlots = () => __awaiter(void 0, void 0, void 0, function* () {
    // Get start of today (midnight)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const result = yield interviewSlot_model_1.InterviewSlot.deleteMany({
        status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE,
        startTime: { $lt: startOfToday },
    });
    return result.deletedCount;
});
exports.InterviewSlotService = {
    createInterviewSlot,
    getAllInterviewSlots,
    getSingleInterviewSlot,
    bookInterviewSlot,
    cancelInterviewSlot,
    rescheduleInterviewSlot,
    markAsCompleted,
    updateInterviewSlot,
    deleteInterviewSlot,
    getMyBookedInterview,
    getScheduledMeetings,
    getInterviewMeetingToken,
    cleanupExpiredAvailableSlots,
};
