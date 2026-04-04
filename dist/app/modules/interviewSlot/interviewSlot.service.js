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

const createInterviewSlot = (adminId, payload) => __awaiter(void 0, void 0, void 0, function* () {

    const admin = yield user_model_1.User.findById(adminId);
    if (!admin) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Admin not found');
    }

    const slotData = Object.assign(Object.assign({}, payload), { adminId: new mongoose_1.Types.ObjectId(adminId), status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE });
    const slot = yield interviewSlot_model_1.InterviewSlot.create(slotData);
    return slot;
});

const getAllInterviewSlots = (query, userId, userRole) => __awaiter(void 0, void 0, void 0, function* () {
    let filter = {};

    if (userRole === 'APPLICANT') {

        const user = yield user_model_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
        }

        const application = yield tutorApplication_model_1.TutorApplication.findOne({ email: user.email });
        if (!application) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'No application found');
        }

        if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You must be selected for interview to view available slots');
        }

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

const bookInterviewSlot = (slotId, applicantId, applicationId) => __awaiter(void 0, void 0, void 0, function* () {

    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Interview slot is not available');
    }

    const application = yield tutorApplication_model_1.TutorApplication.findById(applicationId);
    if (!application) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Application not found');
    }

    const user = yield user_model_1.User.findById(applicantId);
    if (!user || application.email !== user.email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This application does not belong to you');
    }

    if (application.status !== tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only applications selected for interview can book interview slots');
    }

    const existingBooking = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED,
    });
    if (existingBooking) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You already have a booked interview slot. Cancel it first to book a new one.');
    }

    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    slot.applicantId = new mongoose_1.Types.ObjectId(applicantId);
    slot.applicationId = new mongoose_1.Types.ObjectId(applicationId);
    slot.bookedAt = new Date();

    slot.agoraChannelName = (0, agora_helper_1.generateChannelName)();
    yield slot.save();

    yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(applicationId, {
        $unset: { interviewCancelledReason: 1, interviewCancelledAt: 1 },
    });

    return slot;
});

const cancelInterviewSlot = (slotId, userId, cancellationReason) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be cancelled');
    }

    const user = yield user_model_1.User.findById(userId);
    const isAdmin = (user === null || user === void 0 ? void 0 : user.role) === 'SUPER_ADMIN';
    const isSlotOwner = ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isAdmin && !isSlotOwner) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to cancel this slot');
    }

    if (!isAdmin) {
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        if (slot.startTime <= oneHourFromNow) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot cancel interview less than 1 hour before the scheduled time');
        }
    }

    const savedApplicationId = slot.applicationId;

    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    slot.applicantId = undefined;
    slot.applicationId = undefined;
    slot.bookedAt = undefined;
    yield slot.save();

    if (savedApplicationId) {
        const updateData = {
            status: tutorApplication_interface_1.APPLICATION_STATUS.SELECTED_FOR_INTERVIEW,
        };

        if (isAdmin && cancellationReason) {
            updateData.interviewCancelledReason = cancellationReason;
            updateData.interviewCancelledAt = new Date();
        }
        yield tutorApplication_model_1.TutorApplication.findByIdAndUpdate(savedApplicationId, updateData);
    }

    return slot;
});

const markAsCompleted = (slotId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(slotId);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }
    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be marked as completed');
    }

    slot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.COMPLETED;
    slot.completedAt = new Date();
    yield slot.save();

    return slot;
});

const rescheduleInterviewSlot = (currentSlotId, newSlotId, applicantId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;

    const currentSlot = yield interviewSlot_model_1.InterviewSlot.findById(currentSlotId);
    if (!currentSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Current interview slot not found');
    }

    if (((_a = currentSlot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) !== applicantId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to reschedule this slot');
    }
    if (currentSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Only booked slots can be rescheduled');
    }

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (currentSlot.startTime <= oneHourFromNow) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot reschedule interview less than 1 hour before the scheduled time');
    }

    const newSlot = yield interviewSlot_model_1.InterviewSlot.findById(newSlotId);
    if (!newSlot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'New interview slot not found');
    }
    if (newSlot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'New slot is not available');
    }

    const savedApplicantId = currentSlot.applicantId;
    const savedApplicationId = currentSlot.applicationId;

    currentSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE;
    currentSlot.applicantId = undefined;
    currentSlot.applicationId = undefined;
    currentSlot.bookedAt = undefined;
    yield currentSlot.save();

    newSlot.status = interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED;
    newSlot.applicantId = savedApplicantId;
    newSlot.applicationId = savedApplicationId;
    newSlot.bookedAt = new Date();
    yield newSlot.save();

    return newSlot;
});

const updateInterviewSlot = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }

    if (slot.status !== interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot update slot that is not available');
    }
    const updated = yield interviewSlot_model_1.InterviewSlot.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return updated;
});

const deleteInterviewSlot = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findById(id);
    if (!slot) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Interview slot not found');
    }

    if (slot.status === interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Cannot delete booked slot. Cancel it first.');
    }
    const result = yield interviewSlot_model_1.InterviewSlot.findByIdAndDelete(id);
    return result;
});

const getMyBookedInterview = (applicantId) => __awaiter(void 0, void 0, void 0, function* () {
    const slot = yield interviewSlot_model_1.InterviewSlot.findOne({
        applicantId: new mongoose_1.Types.ObjectId(applicantId),
        status: { $in: [interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED, interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.COMPLETED] },
    })
        .populate('adminId', 'name email')
        .populate('applicationId')
        .sort({ createdAt: -1 });
    return slot;
});

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

    const meetings = result.map((slot) => {
        var _a, _b, _c;
        const application = slot.applicationId;

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

    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    const isAdmin = user.role === 'SUPER_ADMIN';
    const isApplicant = ((_a = slot.applicantId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isAdmin && !isApplicant) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to join this meeting');
    }

    const uid = (0, agora_helper_1.userIdToAgoraUid)(userId);
    const token = (0, agora_helper_1.generateRtcToken)(slot.agoraChannelName, uid);
    return {
        token,
        channelName: slot.agoraChannelName,
        uid,
        appId: config_1.default.agora.appId,
    };
});

const cleanupExpiredAvailableSlots = () => __awaiter(void 0, void 0, void 0, function* () {

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
