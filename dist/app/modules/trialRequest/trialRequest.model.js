"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrialRequest = void 0;
const mongoose_1 = require("mongoose");
const trialRequest_interface_1 = require("./trialRequest.interface");

const guardianInfoSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Guardian name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Guardian email is required'],
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Guardian password is required'],
    },
    phone: {
        type: String,
        required: [true, 'Guardian phone number is required'],
        trim: true,
    },
}, { _id: false });

const studentInfoSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,

    },
    password: {
        type: String,

    },
    isUnder18: {
        type: Boolean,
        required: [true, 'Age verification is required'],
        default: false,
    },
    dateOfBirth: {
        type: Date,
    },

    guardianInfo: {
        type: guardianInfoSchema,
    },
}, { _id: false });
const trialRequestSchema = new mongoose_1.Schema({

    requestType: {
        type: String,
        enum: Object.values(trialRequest_interface_1.REQUEST_TYPE),
        default: trialRequest_interface_1.REQUEST_TYPE.TRIAL,
    },

    studentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },

    studentInfo: {
        type: studentInfoSchema,
        required: [true, 'Student information is required'],
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
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    learningGoals: {
        type: String,
        trim: true,
        maxlength: [1000, 'Learning goals cannot exceed 1000 characters'],
    },
    preferredLanguage: {
        type: String,
        enum: ['ENGLISH', 'GERMAN'],
        required: [true, 'Preferred language is required'],
    },
    preferredDateTime: {
        type: Date,
    },

    documents: [
        {
            type: String,
            trim: true,
        },
    ],

    status: {
        type: String,
        enum: Object.values(trialRequest_interface_1.TRIAL_REQUEST_STATUS),
        default: trialRequest_interface_1.TRIAL_REQUEST_STATUS.PENDING,
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

trialRequestSchema.index({ studentId: 1 });
trialRequestSchema.index({ 'studentInfo.email': 1 });
trialRequestSchema.index({ subject: 1 });
trialRequestSchema.index({ gradeLevel: 1 });
trialRequestSchema.index({ schoolType: 1 });
trialRequestSchema.index({ status: 1 });
trialRequestSchema.index({ expiresAt: 1 });
trialRequestSchema.index({ acceptedTutorId: 1 });
trialRequestSchema.index({ createdAt: -1 });

trialRequestSchema.index({ status: 1, subject: 1, expiresAt: 1 });

trialRequestSchema.pre('save', function (next) {
    const studentInfo = this.studentInfo;
    if (studentInfo === null || studentInfo === void 0 ? void 0 : studentInfo.isUnder18) {

        if (!(studentInfo === null || studentInfo === void 0 ? void 0 : studentInfo.guardianInfo)) {
            const error = new Error('Guardian information is required for students under 18');
            return next(error);
        }
    }
    else {

        if (!(studentInfo === null || studentInfo === void 0 ? void 0 : studentInfo.email)) {
            const error = new Error('Email is required for students 18 and above');
            return next(error);
        }
        if (!(studentInfo === null || studentInfo === void 0 ? void 0 : studentInfo.password)) {
            const error = new Error('Password is required for students 18 and above');
            return next(error);
        }
    }
    next();
});
exports.TrialRequest = (0, mongoose_1.model)('TrialRequest', trialRequestSchema);
