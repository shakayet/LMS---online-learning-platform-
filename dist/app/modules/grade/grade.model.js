"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Grade = void 0;
const mongoose_1 = require("mongoose");
const gradeSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Grade name is required'],
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
// Index for faster queries
gradeSchema.index({ isActive: 1 });
exports.Grade = (0, mongoose_1.model)('Grade', gradeSchema);
