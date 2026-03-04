"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminValidation = void 0;
const zod_1 = require("zod");
const overviewStatsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z
            .enum(['day', 'week', 'month', 'quarter', 'year'])
            .optional()
            .default('month'),
    }),
});
const monthlyRevenueQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        year: zod_1.z
            .string()
            .optional()
            .transform(val => (val ? parseInt(val) : new Date().getFullYear())),
        months: zod_1.z.string().optional(), // comma-separated e.g. "1,2,3"
        tutorId: zod_1.z.string().optional(),
        studentId: zod_1.z.string().optional(),
        subscriptionTier: zod_1.z.enum(['FLEXIBLE', 'REGULAR', 'LONG_TERM']).optional(),
        subject: zod_1.z.string().optional(),
    }),
});
const userDistributionQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        groupBy: zod_1.z.enum(['role', 'status', 'both']).optional().default('role'),
    }),
});
exports.AdminValidation = {
    overviewStatsQuerySchema,
    monthlyRevenueQuerySchema,
    userDistributionQuerySchema,
};
