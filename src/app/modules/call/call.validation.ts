import { z } from 'zod';

const initiateCall = z.object({
  body: z.object({
    receiverId: z.string({
      required_error: 'Receiver ID is required',
    }),
    callType: z.enum(['video', 'voice'], {
      required_error: 'Call type is required',
    }),
    chatId: z.string().optional(),
  }),
});

const callIdParam = z.object({
  params: z.object({
    callId: z.string({
      required_error: 'Call ID is required',
    }),
  }),
});

const getCallHistory = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
  }),
});

export const CallValidation = {
  initiateCall,
  callIdParam,
  getCallHistory,
};
