"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const supportTicket_controller_1 = require("./supportTicket.controller");
const supportTicket_validation_1 = require("./supportTicket.validation");
const router = express_1.default.Router();

router.get('/categories', supportTicket_controller_1.SupportTicketController.getTicketCategories);

router.post('/', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.createSupportTicketZodSchema), supportTicket_controller_1.SupportTicketController.createSupportTicket);

router.get('/my-tickets', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), supportTicket_controller_1.SupportTicketController.getMyTickets);

router.get('/my-tickets/:ticketId', (0, auth_1.default)(user_1.USER_ROLES.STUDENT, user_1.USER_ROLES.TUTOR), supportTicket_controller_1.SupportTicketController.getMyTicketById);

router.get('/admin/stats', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getTicketStats);

router.get('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getAllTickets);

router.get('/admin/:ticketId', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), supportTicket_controller_1.SupportTicketController.getTicketById);

router.patch('/admin/:ticketId/status', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.updateTicketStatusZodSchema), supportTicket_controller_1.SupportTicketController.updateTicketStatus);

router.patch('/admin/:ticketId/priority', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.updateTicketPriorityZodSchema), supportTicket_controller_1.SupportTicketController.updateTicketPriority);

router.patch('/admin/:ticketId/assign', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.assignTicketZodSchema), supportTicket_controller_1.SupportTicketController.assignTicket);

router.patch('/admin/:ticketId/notes', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(supportTicket_validation_1.SupportTicketValidation.addAdminNoteZodSchema), supportTicket_controller_1.SupportTicketController.addAdminNotes);
exports.SupportTicketRoutes = router;
