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
exports.SupportTicketService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const supportTicket_interface_1 = require("./supportTicket.interface");
const supportTicket_model_1 = require("./supportTicket.model");

const generateTicketNumber = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const lastTicket = yield supportTicket_model_1.SupportTicket.findOne({
        ticketNumber: { $regex: `^TKT-${year}${month}` },
    })
        .sort({ ticketNumber: -1 })
        .lean();
    let sequence = 1;
    if (lastTicket) {
        const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2], 10);
        sequence = lastSequence + 1;
    }
    return `TKT-${year}${month}-${sequence.toString().padStart(4, '0')}`;
});

const createSupportTicket = (userId, userRole, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const ticketNumber = yield generateTicketNumber();
    const ticketData = Object.assign(Object.assign({}, payload), { ticketNumber, user: userId, userRole, status: supportTicket_interface_1.TICKET_STATUS.OPEN, priority: supportTicket_interface_1.TICKET_PRIORITY.MEDIUM });
    const result = yield supportTicket_model_1.SupportTicket.create(ticketData);
    return result;
});

const getMyTickets = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const ticketQuery = new QueryBuilder_1.default(supportTicket_model_1.SupportTicket.find({ user: userId }).populate('assignedTo', 'name email'), query)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield ticketQuery.modelQuery;
    const pagination = yield ticketQuery.getPaginationInfo();
    return { data, pagination };
});

const getMyTicketById = (ticketId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findOne({
        _id: ticketId,
        user: userId,
    }).populate('assignedTo', 'name email');
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    return ticket;
});

const getAllTickets = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const ticketQuery = new QueryBuilder_1.default(supportTicket_model_1.SupportTicket.find()
        .populate('user', 'name email profilePicture')
        .populate('assignedTo', 'name email'), query)
        .search(['ticketNumber', 'subject', 'message'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield ticketQuery.modelQuery;
    const pagination = yield ticketQuery.getPaginationInfo();
    return { data, pagination };
});

const getTicketById = (ticketId) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findById(ticketId)
        .populate('user', 'name email profilePicture phone')
        .populate('assignedTo', 'name email');
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    return ticket;
});

const updateTicketStatus = (ticketId, status, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    const updateData = { status };
    if (adminNotes) {
        updateData.adminNotes = adminNotes;
    }
    if (status === supportTicket_interface_1.TICKET_STATUS.RESOLVED) {
        updateData.resolvedAt = new Date();
    }
    if (status === supportTicket_interface_1.TICKET_STATUS.CLOSED) {
        updateData.closedAt = new Date();
    }
    const result = yield supportTicket_model_1.SupportTicket.findByIdAndUpdate(ticketId, updateData, {
        new: true,
        runValidators: true,
    })
        .populate('user', 'name email')
        .populate('assignedTo', 'name email');
    return result;
});

const updateTicketPriority = (ticketId, priority) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    const result = yield supportTicket_model_1.SupportTicket.findByIdAndUpdate(ticketId, { priority }, { new: true, runValidators: true })
        .populate('user', 'name email')
        .populate('assignedTo', 'name email');
    return result;
});

const assignTicket = (ticketId, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    const result = yield supportTicket_model_1.SupportTicket.findByIdAndUpdate(ticketId, {
        assignedTo: adminId,
        status: ticket.status === supportTicket_interface_1.TICKET_STATUS.OPEN
            ? supportTicket_interface_1.TICKET_STATUS.IN_PROGRESS
            : ticket.status,
    }, { new: true, runValidators: true })
        .populate('user', 'name email')
        .populate('assignedTo', 'name email');
    return result;
});

const addAdminNotes = (ticketId, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    const ticket = yield supportTicket_model_1.SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Ticket not found');
    }
    const result = yield supportTicket_model_1.SupportTicket.findByIdAndUpdate(ticketId, { adminNotes }, { new: true, runValidators: true })
        .populate('user', 'name email')
        .populate('assignedTo', 'name email');
    return result;
});

const getTicketStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const [statusStats, categoryStats, priorityStats, recentTickets] = yield Promise.all([

        supportTicket_model_1.SupportTicket.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        supportTicket_model_1.SupportTicket.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),

        supportTicket_model_1.SupportTicket.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),

        supportTicket_model_1.SupportTicket.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
    ]);
    const total = yield supportTicket_model_1.SupportTicket.countDocuments();
    const open = yield supportTicket_model_1.SupportTicket.countDocuments({ status: supportTicket_interface_1.TICKET_STATUS.OPEN });
    const inProgress = yield supportTicket_model_1.SupportTicket.countDocuments({
        status: supportTicket_interface_1.TICKET_STATUS.IN_PROGRESS,
    });
    const resolved = yield supportTicket_model_1.SupportTicket.countDocuments({
        status: supportTicket_interface_1.TICKET_STATUS.RESOLVED,
    });
    return {
        total,
        open,
        inProgress,
        resolved,
        recentTickets,
        statusDistribution: statusStats,
        categoryDistribution: categoryStats,
        priorityDistribution: priorityStats,
    };
});

const getTicketCategories = () => {
    return Object.entries(supportTicket_interface_1.TICKET_CATEGORY).map(([key, value]) => ({
        value,
        label: key
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' '),
    }));
};
exports.SupportTicketService = {
    createSupportTicket,
    getMyTickets,
    getMyTicketById,
    getAllTickets,
    getTicketById,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addAdminNotes,
    getTicketStats,
    getTicketCategories,
};
