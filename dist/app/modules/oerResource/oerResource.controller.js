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
exports.OERResourceController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const oerResource_service_1 = require("./oerResource.service");
// Search OER resources
const searchResources = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query, subject, grade, type, page, limit } = req.query;
    const result = yield oerResource_service_1.OERResourceService.searchResources({
        query: query,
        subject: subject,
        grade: grade,
        type: type,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
    });
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'OER resources retrieved successfully',
        data: result.resources,
        pagination: {
            page: result.page,
            limit: result.limit,
            totalPage: result.totalPages,
            total: result.total,
        },
    });
}));
// Get available filter options
const getFilterOptions = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const subjects = oerResource_service_1.OERResourceService.getAvailableSubjects();
    const types = oerResource_service_1.OERResourceService.getAvailableTypes();
    const grades = oerResource_service_1.OERResourceService.getAvailableGrades();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Filter options retrieved successfully',
        data: {
            subjects,
            types,
            grades,
        },
    });
}));
exports.OERResourceController = {
    searchResources,
    getFilterOptions,
};
