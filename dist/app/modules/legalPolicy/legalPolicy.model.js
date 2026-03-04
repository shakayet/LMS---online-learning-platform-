"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalPolicy = void 0;
const mongoose_1 = require("mongoose");
const legalPolicy_interface_1 = require("./legalPolicy.interface");
const legalPolicySchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(legalPolicy_interface_1.POLICY_TYPE),
        required: [true, 'Policy type is required'],
        unique: true,
    },
    title: {
        type: String,
        required: [true, 'Policy title is required'],
        trim: true,
    },
    content: {
        type: String,
        required: [true, 'Policy content is required'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastUpdatedBy: {
        type: String,
        ref: 'User',
    },
}, { timestamps: true });
// Index for faster queries
legalPolicySchema.index({ type: 1 });
legalPolicySchema.index({ isActive: 1 });
exports.LegalPolicy = (0, mongoose_1.model)('LegalPolicy', legalPolicySchema);
