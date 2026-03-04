"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OERResourceValidation = void 0;
const zod_1 = require("zod");
const searchOERResourcesZodSchema = zod_1.z.object({
    query: zod_1.z.object({
        query: zod_1.z.string().optional(),
        subject: zod_1.z.string().optional(),
        grade: zod_1.z.string().optional(),
        type: zod_1.z.string().optional(),
        page: zod_1.z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : 20)),
    }),
});
exports.OERResourceValidation = {
    searchOERResourcesZodSchema,
};
