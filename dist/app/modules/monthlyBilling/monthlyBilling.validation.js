"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyBillingValidation = void 0;
const zod_1 = require("zod");
// Generate monthly billing validation (Admin - Manual trigger)
const generateMonthlyBillingZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        month: zod_1.z
            .number({
            required_error: 'Month is required',
        })
            .min(1, 'Month must be between 1 and 12')
            .max(12, 'Month must be between 1 and 12'),
        year: zod_1.z
            .number({
            required_error: 'Year is required',
        })
            .min(2020, 'Year must be 2020 or later'),
    }),
});
exports.MonthlyBillingValidation = {
    generateMonthlyBillingZodSchema,
};
