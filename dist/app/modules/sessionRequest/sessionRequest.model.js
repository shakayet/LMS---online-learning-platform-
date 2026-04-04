"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRequest = void 0;
const mongoose_1 = require("mongoose");
const sessionRequest_interface_1 = require("./sessionRequest.interface");
const sessionRequestSchema = new mongoose_1.Schema({

    requestType: {
        type: String,
        enum: Object.values(sessionRequest_interface_1.REQUEST_TYPE),
        default: sessionRequest_interface_1.REQUEST_TYPE.SESSION,
    },

    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student ID is required'],
    },

    subject: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Subject is required'],
    },
    gradeLevel: {
        type: String,
        required: [true, 'Grade level is required'],
        trim: true,
    },
    schoolType: {
        type: String,
        required: [true, 'School type is required'],
        trim: true,
    },

    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    learningGoals: {
        type: String,
        trim: true,
        maxlength: [1000, 'Learning goals cannot exceed 1000 characters'],
    },

    documents: [
        {
            type: String,
            trim: true,
        },
    ],

    status: {
        type: String,
        enum: Object.values(sessionRequest_interface_1.SESSION_REQUEST_STATUS),
        default: sessionRequest_interface_1.SESSION_REQUEST_STATUS.PENDING,
    },

    acceptedTutorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Chat',
    },

    expiresAt: {
        type: Date,
        default: function () {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
        },
    },
    acceptedAt: {
        type: Date,
    },
    cancelledAt: {
        type: Date,
    },

    isExtended: {
        type: Boolean,
        default: false,
    },
    extensionCount: {
        type: Number,
        default: 0,
    },
    reminderSentAt: {
        type: Date,
    },
    finalExpiresAt: {
        type: Date,
    },

    cancellationReason: {
        type: String,
        trim: true,
    },
}, { timestamps: true });

sessionRequestSchema.index({ studentId: 1 });
sessionRequestSchema.index({ subject: 1 });
sessionRequestSchema.index({ gradeLevel: 1 });
sessionRequestSchema.index({ schoolType: 1 });
sessionRequestSchema.index({ status: 1 });
sessionRequestSchema.index({ expiresAt: 1 });
sessionRequestSchema.index({ acceptedTutorId: 1 });
sessionRequestSchema.index({ createdAt: -1 });

sessionRequestSchema.index({ status: 1, subject: 1, expiresAt: 1 });
exports.SessionRequest = (0, mongoose_1.model)('SessionRequest', sessionRequestSchema);
