"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallValidation = void 0;
const zod_1 = require("zod");
const initiateCall = zod_1.z.object({
    body: zod_1.z.object({
        receiverId: zod_1.z.string({
            required_error: 'Receiver ID is required',
        }),
        callType: zod_1.z.enum(['video', 'voice'], {
            required_error: 'Call type is required',
        }),
        chatId: zod_1.z.string().optional(),
    }),
});
const callIdParam = zod_1.z.object({
    params: zod_1.z.object({
        callId: zod_1.z.string({
            required_error: 'Call ID is required',
        }),
    }),
});
const getCallHistory = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('20'),
    }),
});
exports.CallValidation = {
    initiateCall,
    callIdParam,
    getCallHistory,
};
