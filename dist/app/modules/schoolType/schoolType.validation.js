"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolTypeValidation = void 0;
const zod_1 = require("zod");
const createSchoolTypeZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({
            required_error: 'School type name is required',
        })
            .trim()
            .min(1, 'School type name must be at least 1 character'),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
});
const updateSchoolTypeZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .trim()
            .min(1, 'School type name must be at least 1 character')
            .optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.SchoolTypeValidation = {
    createSchoolTypeZodSchema,
    updateSchoolTypeZodSchema,
};
