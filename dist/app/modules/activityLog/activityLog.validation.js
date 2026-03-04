"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogValidation = exports.recentActivityQuerySchema = void 0;
const zod_1 = require("zod");
const activityLog_interface_1 = require("./activityLog.interface");
exports.recentActivityQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .string()
            .optional()
            .transform(val => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z
            .string()
            .optional()
            .transform(val => (val ? parseInt(val, 10) : 10)),
        actionType: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
        entityType: zod_1.z.enum(activityLog_interface_1.ENTITY_TYPES).optional(),
        startDate: zod_1.z.string().optional(),
        endDate: zod_1.z.string().optional(),
    }),
});
exports.ActivityLogValidation = {
    recentActivityQuerySchema: exports.recentActivityQuerySchema,
};
