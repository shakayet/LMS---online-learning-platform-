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
exports.GradeController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const grade_service_1 = require("./grade.service");
const createGrade = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield grade_service_1.GradeService.createGrade(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        message: 'Grade created successfully',
        data: result,
    });
}));
// Get all grades
const getAllGrades = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield grade_service_1.GradeService.getAllGrades(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grades retrieved successfully',
        data: result.data,
        pagination: result.pagination,
    });
}));
// Get single grade
const getSingleGrade = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gradeId } = req.params;
    const result = yield grade_service_1.GradeService.getSingleGrade(gradeId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grade retrieved successfully',
        data: result,
    });
}));
// Update grade
const updateGrade = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gradeId } = req.params;
    const result = yield grade_service_1.GradeService.updateGrade(gradeId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grade updated successfully',
        data: result,
    });
}));
// Delete grade
const deleteGrade = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { gradeId } = req.params;
    const result = yield grade_service_1.GradeService.deleteGrade(gradeId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Grade deleted successfully',
        data: result,
    });
}));
// Get active grades
const getActiveGrades = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield grade_service_1.GradeService.getActiveGrades();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Active grades retrieved successfully',
        data: result,
    });
}));
exports.GradeController = {
    createGrade,
    getAllGrades,
    getSingleGrade,
    updateGrade,
    deleteGrade,
    getActiveGrades,
};
