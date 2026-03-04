import { z } from 'zod';

const createRoom = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Room name is required',
    }),
    callId: z.string().optional(),
  }),
});

const getRoomToken = z.object({
  params: z.object({
    roomId: z.string({
      required_error: 'Room ID is required',
    }),
  }),
  body: z.object({
    role: z.enum(['admin', 'writer', 'reader']).optional().default('writer'),
  }),
});

const roomIdParam = z.object({
  params: z.object({
    roomId: z.string({
      required_error: 'Room ID is required',
    }),
  }),
});

const takeSnapshot = z.object({
  params: z.object({
    roomId: z.string({
      required_error: 'Room ID is required',
    }),
  }),
  body: z.object({
    scenePath: z.string().optional(),
  }),
});

const getUserRooms = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
  }),
});

const getOrCreateForCall = z.object({
  params: z.object({
    callId: z.string({
      required_error: 'Call ID is required',
    }),
  }),
});

export const WhiteboardValidation = {
  createRoom,
  getRoomToken,
  roomIdParam,
  takeSnapshot,
  getUserRooms,
  getOrCreateForCall,
};
