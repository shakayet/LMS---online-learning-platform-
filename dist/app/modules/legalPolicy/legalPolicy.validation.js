"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalPolicyValidation = void 0;
const zod_1 = require("zod");
const legalPolicy_interface_1 = require("./legalPolicy.interface");
const upsertPolicyZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Title is required').optional(),
        content: zod_1.z.string().min(1, 'Content is required'),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const updatePolicyZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Title is required').optional(),
        content: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
const policyTypeParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        type: zod_1.z.nativeEnum(legalPolicy_interface_1.POLICY_TYPE, {
            errorMap: () => ({ message: 'Invalid policy type' }),
        }),
    }),
});
exports.LegalPolicyValidation = {
    upsertPolicyZodSchema,
    updatePolicyZodSchema,
    policyTypeParamSchema,
};
