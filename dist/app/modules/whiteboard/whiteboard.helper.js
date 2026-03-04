"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWhiteboardScenes = exports.takeWhiteboardSnapshot = exports.getWhiteboardRoomInfo = exports.closeWhiteboardRoom = exports.generateWhiteboardRoomToken = exports.createAgoraWhiteboardRoom = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../../../config"));
const WHITEBOARD_API = 'https://api.netless.link/v5';
const getHeaders = () => ({
    token: config_1.default.agora.whiteboard.sdkToken,
    'Content-Type': 'application/json',
    region: config_1.default.agora.whiteboard.region,
});
/**
 * নতুন Whiteboard Room তৈরি করে
 */
const createAgoraWhiteboardRoom = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.post(`${WHITEBOARD_API}/rooms`, {
        name,
        isRecord: false,
    }, { headers: getHeaders() });
    return { uuid: response.data.uuid };
});
exports.createAgoraWhiteboardRoom = createAgoraWhiteboardRoom;
/**
 * Room Token Generate করে
 */
const generateWhiteboardRoomToken = (roomUuid_1, ...args_1) => __awaiter(void 0, [roomUuid_1, ...args_1], void 0, function* (roomUuid, role = 'writer', lifespan = 3600000 // 1 hour in ms
) {
    const response = yield axios_1.default.post(`${WHITEBOARD_API}/tokens/rooms/${roomUuid}`, { lifespan, role }, { headers: getHeaders() });
    return response.data;
});
exports.generateWhiteboardRoomToken = generateWhiteboardRoomToken;
/**
 * Room বন্ধ করে
 */
const closeWhiteboardRoom = (roomUuid) => __awaiter(void 0, void 0, void 0, function* () {
    yield axios_1.default.patch(`${WHITEBOARD_API}/rooms/${roomUuid}`, { isBan: true }, { headers: getHeaders() });
});
exports.closeWhiteboardRoom = closeWhiteboardRoom;
/**
 * Room state export করে
 */
const getWhiteboardRoomInfo = (roomUuid) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`${WHITEBOARD_API}/rooms/${roomUuid}`, {
        headers: getHeaders(),
    });
    return response.data;
});
exports.getWhiteboardRoomInfo = getWhiteboardRoomInfo;
/**
 * Whiteboard এর current state এর image snapshot নেয়
 */
const takeWhiteboardSnapshot = (roomUuid_1, ...args_1) => __awaiter(void 0, [roomUuid_1, ...args_1], void 0, function* (roomUuid, scenePath = '/init') {
    const response = yield axios_1.default.post(`${WHITEBOARD_API}/rooms/${roomUuid}/screenshots`, {
        width: 1920,
        height: 1080,
        scenePath,
    }, { headers: getHeaders() });
    return response.data.url;
});
exports.takeWhiteboardSnapshot = takeWhiteboardSnapshot;
/**
 * Whiteboard এর সব scene list করে
 */
const getWhiteboardScenes = (roomUuid) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`${WHITEBOARD_API}/rooms/${roomUuid}/scenes`, { headers: getHeaders() });
    return response.data;
});
exports.getWhiteboardScenes = getWhiteboardScenes;
