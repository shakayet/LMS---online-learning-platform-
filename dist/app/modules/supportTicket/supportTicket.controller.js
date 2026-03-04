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
exports.SupportTicketController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const supportTicket_service_1 = require("./supportTicket.service");
// ============ USER ROUTES (Student/Tutor) ============
// Create a new support ticket
const createSupportTicket = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const userRole = req.user.role === 'STUDENT' ? 'STUDENT' : 'TUTOR';
    const result = yield supportTicket_service_1.SupportTicketService.createSupportTicket(userId, userRole, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Support ticket created successfully',
        data: result,
    });
}));
// Get my tickets (for logged-in user)
const getMyTickets = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield supportTicket_service_1.SupportTicketService.getMyTickets(userId, req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Tickets retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    });
}));
// Get single ticket (for logged-in user - only their own)
const getMyTicketById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const result = yield supportTicket_service_1.SupportTicketService.getMyTicketById(ticketId, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket retrieved successfully',
        data: result,
    });
}));
// Get ticket categories (public - for dropdown)
const getTicketCategories = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = supportTicket_service_1.SupportTicketService.getTicketCategories();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Categories retrieved successfully',
        data: result,
    });
}));
// ============ ADMIN ROUTES ============
// Get all tickets (admin only)
const getAllTickets = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield supportTicket_service_1.SupportTicketService.getAllTickets(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'All tickets retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    });
}));
// Get single ticket by ID (admin only)
const getTicketById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const result = yield supportTicket_service_1.SupportTicketService.getTicketById(ticketId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket retrieved successfully',
        data: result,
    });
}));
// Update ticket status (admin only)
const updateTicketStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { status, adminNotes } = req.body;
    const result = yield supportTicket_service_1.SupportTicketService.updateTicketStatus(ticketId, status, adminNotes);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket status updated successfully',
        data: result,
    });
}));
// Update ticket priority (admin only)
const updateTicketPriority = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { priority } = req.body;
    const result = yield supportTicket_service_1.SupportTicketService.updateTicketPriority(ticketId, priority);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket priority updated successfully',
        data: result,
    });
}));
// Assign ticket to admin
const assignTicket = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    const result = yield supportTicket_service_1.SupportTicketService.assignTicket(ticketId, assignedTo);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket assigned successfully',
        data: result,
    });
}));
// Add admin notes
const addAdminNotes = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ticketId } = req.params;
    const { adminNotes } = req.body;
    const result = yield supportTicket_service_1.SupportTicketService.addAdminNotes(ticketId, adminNotes);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Admin notes added successfully',
        data: result,
    });
}));
// Get ticket statistics (admin dashboard)
const getTicketStats = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield supportTicket_service_1.SupportTicketService.getTicketStats();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Ticket statistics retrieved successfully',
        data: result,
    });
}));
exports.SupportTicketController = {
    createSupportTicket,
    getMyTickets,
    getMyTicketById,
    getTicketCategories,
    getAllTickets,
    getTicketById,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addAdminNotes,
    getTicketStats,
};
