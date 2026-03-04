import { z } from 'zod';
import { POLICY_TYPE } from './legalPolicy.interface';

const upsertPolicyZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    content: z.string().min(1, 'Content is required'),
    isActive: z.boolean().optional(),
  }),
});

const updatePolicyZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    content: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const policyTypeParamSchema = z.object({
  params: z.object({
    type: z.nativeEnum(POLICY_TYPE, {
      errorMap: () => ({ message: 'Invalid policy type' }),
    }),
  }),
});

export const LegalPolicyValidation = {
  upsertPolicyZodSchema,
  updatePolicyZodSchema,
  policyTypeParamSchema,
};
