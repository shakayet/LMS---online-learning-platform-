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
exports.WhiteboardController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const whiteboard_service_1 = require("./whiteboard.service");
const createRoom = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { name, callId } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield whiteboard_service_1.WhiteboardService.createRoom(userId, name, callId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Whiteboard room created successfully',
        data: result,
    });
}));
const getRoomToken = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { roomId } = req.params;
    const { role } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield whiteboard_service_1.WhiteboardService.getRoomToken(roomId, userId, role);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Room token retrieved successfully',
        data: result,
    });
}));
const getUserRooms = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = yield whiteboard_service_1.WhiteboardService.getUserRooms(userId, page, limit);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Rooms retrieved successfully',
        data: result.rooms,
        pagination: {
            page: result.page,
            limit,
            total: result.total,
            totalPage: result.totalPages,
        },
    });
}));
const deleteRoom = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { roomId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    yield whiteboard_service_1.WhiteboardService.deleteRoom(roomId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Whiteboard room deleted successfully',
        data: null,
    });
}));
const takeSnapshot = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { roomId } = req.params;
    const { scenePath } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield whiteboard_service_1.WhiteboardService.takeSnapshot(roomId, userId, scenePath);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Snapshot taken successfully',
        data: result,
    });
}));
const getRoomSnapshots = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { roomId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield whiteboard_service_1.WhiteboardService.getRoomSnapshots(roomId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Snapshots retrieved successfully',
        data: result,
    });
}));
const getOrCreateForCall = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { callId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const result = yield whiteboard_service_1.WhiteboardService.getOrCreateRoomForCall(callId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: result.isNew ? http_status_codes_1.StatusCodes.CREATED : http_status_codes_1.StatusCodes.OK,
        message: result.isNew
            ? 'Whiteboard room created for call'
            : 'Whiteboard room retrieved for call',
        data: result,
    });
}));
exports.WhiteboardController = {
    createRoom,
    getRoomToken,
    getUserRooms,
    deleteRoom,
    takeSnapshot,
    getRoomSnapshots,
    getOrCreateForCall,
};
