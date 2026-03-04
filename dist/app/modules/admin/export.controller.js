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
exports.ExportController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const export_service_1 = require("./export.service");
/**
 * Export users to CSV
 */
const exportUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { role } = req.query;
    const csv = yield export_service_1.ExportService.exportUsers(role);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export applications to CSV
 */
const exportApplications = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.query;
    const csv = yield export_service_1.ExportService.exportApplications(status);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export sessions to CSV
 */
const exportSessions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, startDate, endDate } = req.query;
    const csv = yield export_service_1.ExportService.exportSessions(status, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export billings to CSV
 */
const exportBillings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, year, month } = req.query;
    const csv = yield export_service_1.ExportService.exportBillings(status, year ? parseInt(year) : undefined, month ? parseInt(month) : undefined);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=billings.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export earnings to CSV
 */
const exportEarnings = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, year, month } = req.query;
    const csv = yield export_service_1.ExportService.exportEarnings(status, year ? parseInt(year) : undefined, month ? parseInt(month) : undefined);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=earnings.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export subscriptions to CSV
 */
const exportSubscriptions = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.query;
    const csv = yield export_service_1.ExportService.exportSubscriptions(status);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
/**
 * Export trial requests to CSV
 */
const exportTrialRequests = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.query;
    const csv = yield export_service_1.ExportService.exportTrialRequests(status);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=trial-requests.csv');
    res.status(http_status_codes_1.StatusCodes.OK).send(csv);
}));
exports.ExportController = {
    exportUsers,
    exportApplications,
    exportSessions,
    exportBillings,
    exportEarnings,
    exportSubscriptions,
    exportTrialRequests,
};
