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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterviewSlot = void 0;
const mongoose_1 = require("mongoose");
const interviewSlot_interface_1 = require("./interviewSlot.interface");
const interviewSlotSchema = new mongoose_1.Schema({
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Admin ID is required'],
    },
    applicantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    applicationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'TutorApplication',
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required'],
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required'],
    },
    status: {
        type: String,
        enum: Object.values(interviewSlot_interface_1.INTERVIEW_SLOT_STATUS),
        default: interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE,
    },
    agoraChannelName: {
        type: String,
    },
    cancellationReason: {
        type: String,
        trim: true,
    },
    bookedAt: {
        type: Date,
    },
    completedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },
}, { timestamps: true });
// Indexes for performance
interviewSlotSchema.index({ adminId: 1 });
interviewSlotSchema.index({ applicantId: 1 });
interviewSlotSchema.index({ applicationId: 1 });
interviewSlotSchema.index({ status: 1 });
interviewSlotSchema.index({ startTime: 1, endTime: 1 });
// Validate endTime is after startTime
interviewSlotSchema.pre('save', function (next) {
    if (this.endTime <= this.startTime) {
        next(new Error('End time must be after start time'));
    }
    next();
});
// Prevent overlapping slots for same admin
interviewSlotSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isNew || this.isModified('startTime') || this.isModified('endTime')) {
            const InterviewSlot = this.constructor;
            const overlapping = yield InterviewSlot.findOne({
                adminId: this.adminId,
                _id: { $ne: this._id },
                status: { $in: [interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.AVAILABLE, interviewSlot_interface_1.INTERVIEW_SLOT_STATUS.BOOKED] },
                $or: [
                    {
                        startTime: { $lt: this.endTime },
                        endTime: { $gt: this.startTime },
                    },
                ],
            });
            if (overlapping) {
                next(new Error('Time slot overlaps with existing slot'));
            }
        }
        next();
    });
});
exports.InterviewSlot = (0, mongoose_1.model)('InterviewSlot', interviewSlotSchema);
