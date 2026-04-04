"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");

const AttachmentSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['image', 'audio', 'video', 'file'],
        required: true,
    },
    url: { type: String, required: true },
    name: { type: String },
    size: { type: Number },
    mime: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
}, { _id: false });

const SessionProposalSchema = new mongoose_1.Schema({
    subject: {
        type: String,
        required: true,
        trim: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COUNTER_PROPOSED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'STARTING_SOON', 'IN_PROGRESS'],
        default: 'PROPOSED',
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    originalProposalId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Message',
    },
    counterProposalReason: {
        type: String,
        trim: true,
    },
    noShowBy: {
        type: String,
        enum: ['tutor', 'student'],
    },
}, { _id: false });

const messageSchema = new mongoose_1.Schema({
    chatId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Chat',
        index: true,
    },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true,
    },
    text: {
        type: String,
        required: false,
        maxlength: 1000,
        trim: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'media', 'doc', 'mixed', 'session_proposal'],
        default: 'text',
    },

    attachments: {
        type: [AttachmentSchema],
        default: [],
    },

    sessionProposal: {
        type: SessionProposalSchema,
        required: false,
    },

    deliveredTo: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: [] }],
    readBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: [] }],

    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    },

    editedAt: { type: Date },
}, {
    timestamps: true,
});

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'sessionProposal.status': 1 });

messageSchema.pre('save', function (next) {
    if (this.type === 'session_proposal' &&
        this.sessionProposal &&
        this.isNew &&
        !this.sessionProposal.expiresAt) {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 24);
        this.sessionProposal.expiresAt = expirationDate;
    }
    next();
});

messageSchema.virtual('content').get(function () {
    return this.text;
});
messageSchema.virtual('content').set(function (value) {
    this.text = value;
});

messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

messageSchema.pre('find', function () {
    this.populate('sender', '_id name profilePicture');
});
messageSchema.pre('findOne', function () {
    this.populate('sender', '_id name profilePicture');
});
exports.Message = (0, mongoose_1.model)('Message', messageSchema);
