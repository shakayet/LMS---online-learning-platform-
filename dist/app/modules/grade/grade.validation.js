"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradeValidation = void 0;
const zod_1 = require("zod");
const createGradeZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({
            required_error: 'Grade name is required',
        })
            .trim()
            .min(1, 'Grade name must be at least 1 character'),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
});
const updateGradeZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .trim()
            .min(1, 'Grade name must be at least 1 character')
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.GradeValidation = {
    createGradeZodSchema,
    updateGradeZodSchema,
};
