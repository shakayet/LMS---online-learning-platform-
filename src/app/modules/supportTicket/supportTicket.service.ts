import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import {
  ISupportTicket,
  ISupportTicketFilters,
  TICKET_STATUS,
  TICKET_PRIORITY,
  TICKET_CATEGORY,
} from './supportTicket.interface';
import { SupportTicket } from './supportTicket.model';

const generateTicketNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const lastTicket = await SupportTicket.findOne({
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
};

const createSupportTicket = async (
  userId: string,
  userRole: 'STUDENT' | 'TUTOR',
  payload: Partial<ISupportTicket>
): Promise<ISupportTicket> => {
  const ticketNumber = await generateTicketNumber();

  const ticketData: Partial<ISupportTicket> = {
    ...payload,
    ticketNumber,
    user: userId as any,
    userRole,
    status: TICKET_STATUS.OPEN,
    priority: TICKET_PRIORITY.MEDIUM,
  };

  const result = await SupportTicket.create(ticketData);
  return result;
};

const getMyTickets = async (userId: string, query: Record<string, unknown>) => {
  const ticketQuery = new QueryBuilder(
    SupportTicket.find({ user: userId }).populate('assignedTo', 'name email'),
    query
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await ticketQuery.modelQuery;
  const pagination = await ticketQuery.getPaginationInfo();

  return { data, pagination };
};

const getMyTicketById = async (
  ticketId: string,
  userId: string
): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findOne({
    _id: ticketId,
    user: userId,
  }).populate('assignedTo', 'name email');

  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  return ticket;
};

const getAllTickets = async (query: Record<string, unknown>) => {
  const ticketQuery = new QueryBuilder(
    SupportTicket.find()
      .populate('user', 'name email profilePicture')
      .populate('assignedTo', 'name email'),
    query
  )
    .search(['ticketNumber', 'subject', 'message'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await ticketQuery.modelQuery;
  const pagination = await ticketQuery.getPaginationInfo();

  return { data, pagination };
};

const getTicketById = async (ticketId: string): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findById(ticketId)
    .populate('user', 'name email profilePicture phone')
    .populate('assignedTo', 'name email');

  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  return ticket;
};

const updateTicketStatus = async (
  ticketId: string,
  status: TICKET_STATUS,
  adminNotes?: string
): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  const updateData: Partial<ISupportTicket> = { status };

  if (adminNotes) {
    updateData.adminNotes = adminNotes;
  }

  if (status === TICKET_STATUS.RESOLVED) {
    updateData.resolvedAt = new Date();
  }

  if (status === TICKET_STATUS.CLOSED) {
    updateData.closedAt = new Date();
  }

  const result = await SupportTicket.findByIdAndUpdate(ticketId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('user', 'name email')
    .populate('assignedTo', 'name email');

  return result;
};

const updateTicketPriority = async (
  ticketId: string,
  priority: TICKET_PRIORITY
): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  const result = await SupportTicket.findByIdAndUpdate(
    ticketId,
    { priority },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('assignedTo', 'name email');

  return result;
};

const assignTicket = async (
  ticketId: string,
  adminId: string
): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  const result = await SupportTicket.findByIdAndUpdate(
    ticketId,
    {
      assignedTo: adminId,
      status:
        ticket.status === TICKET_STATUS.OPEN
          ? TICKET_STATUS.IN_PROGRESS
          : ticket.status,
    },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('assignedTo', 'name email');

  return result;
};

const addAdminNotes = async (
  ticketId: string,
  adminNotes: string
): Promise<ISupportTicket | null> => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Ticket not found');
  }

  const result = await SupportTicket.findByIdAndUpdate(
    ticketId,
    { adminNotes },
    { new: true, runValidators: true }
  )
    .populate('user', 'name email')
    .populate('assignedTo', 'name email');

  return result;
};

const getTicketStats = async () => {
  const [statusStats, categoryStats, priorityStats, recentTickets] =
    await Promise.all([

      SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      SupportTicket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      SupportTicket.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      SupportTicket.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

  const total = await SupportTicket.countDocuments();
  const open = await SupportTicket.countDocuments({ status: TICKET_STATUS.OPEN });
  const inProgress = await SupportTicket.countDocuments({
    status: TICKET_STATUS.IN_PROGRESS,
  });
  const resolved = await SupportTicket.countDocuments({
    status: TICKET_STATUS.RESOLVED,
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
};

const getTicketCategories = () => {
  return Object.entries(TICKET_CATEGORY).map(([key, value]) => ({
    value,
    label: key
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' '),
  }));
};

export const SupportTicketService = {
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
