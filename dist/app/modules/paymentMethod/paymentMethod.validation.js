"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodValidation = void 0;
const zod_1 = require("zod");
// Attach payment method validation
const attachPaymentMethodZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        paymentMethodId: zod_1.z.string({
            required_error: 'Payment method ID is required',
        }),
        setAsDefault: zod_1.z.boolean().optional().default(false),
    }),
});
exports.PaymentMethodValidation = {
    attachPaymentMethodZodSchema,
};
