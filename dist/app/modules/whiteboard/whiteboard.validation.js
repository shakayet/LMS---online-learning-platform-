"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardValidation = void 0;
const zod_1 = require("zod");
const createRoom = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({
            required_error: 'Room name is required',
        }),
        callId: zod_1.z.string().optional(),
    }),
});
const getRoomToken = zod_1.z.object({
    params: zod_1.z.object({
        roomId: zod_1.z.string({
            required_error: 'Room ID is required',
        }),
    }),
    body: zod_1.z.object({
        role: zod_1.z.enum(['admin', 'writer', 'reader']).optional().default('writer'),
    }),
});
const roomIdParam = zod_1.z.object({
    params: zod_1.z.object({
        roomId: zod_1.z.string({
            required_error: 'Room ID is required',
        }),
    }),
});
const takeSnapshot = zod_1.z.object({
    params: zod_1.z.object({
        roomId: zod_1.z.string({
            required_error: 'Room ID is required',
        }),
    }),
    body: zod_1.z.object({
        scenePath: zod_1.z.string().optional(),
    }),
});
const getUserRooms = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('20'),
    }),
});
const getOrCreateForCall = zod_1.z.object({
    params: zod_1.z.object({
        callId: zod_1.z.string({
            required_error: 'Call ID is required',
        }),
    }),
});
exports.WhiteboardValidation = {
    createRoom,
    getRoomToken,
    roomIdParam,
    takeSnapshot,
    getUserRooms,
    getOrCreateForCall,
};
