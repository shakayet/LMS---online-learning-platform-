"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfig = void 0;
const mongoose_1 = require("mongoose");
const pricingPlanSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    tier: {
        type: String,
        enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM'],
        required: true,
    },
    pricePerHour: { type: Number, required: true },
    courseDuration: { type: String, required: true },
    commitmentMonths: { type: Number, required: true, default: 0 },
    minimumHours: { type: Number, required: true, default: 0 },
    selectedHours: { type: String, required: true },
    selectedHoursDetails: { type: String, required: true },
    termType: { type: String, required: true },
    inclusions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true },
}, { _id: false });
const pricingConfigSchema = new mongoose_1.Schema({
    plans: [pricingPlanSchema],
    updatedBy: { type: String },
}, {
    timestamps: true,
});
exports.PricingConfig = (0, mongoose_1.model)('PricingConfig', pricingConfigSchema);
