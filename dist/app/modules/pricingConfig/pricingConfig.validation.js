"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingConfigValidation = void 0;
const zod_1 = require("zod");
const pricingPlanSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Plan name is required'),
    tier: zod_1.z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']),
    pricePerHour: zod_1.z.number().positive('Price must be positive'),
    courseDuration: zod_1.z.string().min(1, 'Course duration is required'),
    commitmentMonths: zod_1.z.number().min(0, 'Commitment months cannot be negative'),
    minimumHours: zod_1.z.number().min(0, 'Minimum hours cannot be negative'),
    selectedHours: zod_1.z.string().min(1, 'Selected hours text is required'),
    selectedHoursDetails: zod_1.z.string().min(1, 'Selected hours details is required'),
    termType: zod_1.z.string().min(1, 'Term type is required'),
    inclusions: zod_1.z.array(zod_1.z.string()),
    isActive: zod_1.z.boolean().default(true),
    sortOrder: zod_1.z.number().min(1, 'Sort order must be at least 1'),
});
const updatePricingConfigZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        plans: zod_1.z.array(pricingPlanSchema).min(1, 'At least one plan is required'),
    }),
});
const updateSinglePlanZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        tier: zod_1.z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']),
    }),
    body: pricingPlanSchema.partial().omit({ tier: true }),
});
exports.PricingConfigValidation = {
    updatePricingConfigZodSchema,
    updateSinglePlanZodSchema,
};
