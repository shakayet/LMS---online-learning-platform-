"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolType = void 0;
const mongoose_1 = require("mongoose");
const schoolTypeSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'School type name is required'],
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// Index for faster queries
schoolTypeSchema.index({ isActive: 1 });
exports.SchoolType = (0, mongoose_1.model)('SchoolType', schoolTypeSchema);
