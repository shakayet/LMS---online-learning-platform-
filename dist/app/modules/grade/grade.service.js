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
exports.GradeService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const grade_model_1 = require("./grade.model");
const createGrade = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if grade with the same name already exists
    const existingGrade = yield grade_model_1.Grade.findOne({ name: payload.name });
    if (existingGrade) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Grade with this name already exists');
    }
    const result = yield grade_model_1.Grade.create(payload);
    return result;
});
// Get all grades with filtering, searching, pagination
const getAllGrades = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const gradeQuery = new QueryBuilder_1.default(grade_model_1.Grade.find(), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield gradeQuery.modelQuery;
    const pagination = yield gradeQuery.getPaginationInfo();
    return {
        data,
        pagination,
    };
});
// Get single grade by ID
const getSingleGrade = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield grade_model_1.Grade.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Grade not found');
    }
    return result;
});
// Update grade
const updateGrade = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if grade exists
    const grade = yield grade_model_1.Grade.findById(id);
    if (!grade) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Grade not found');
    }
    // If updating name, check for uniqueness
    if (payload.name && payload.name !== grade.name) {
        const existingGrade = yield grade_model_1.Grade.findOne({ name: payload.name });
        if (existingGrade) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Grade with this name already exists');
        }
    }
    const result = yield grade_model_1.Grade.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
});
// Delete grade (soft delete by setting isActive to false)
const deleteGrade = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const grade = yield grade_model_1.Grade.findById(id);
    if (!grade) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Grade not found');
    }
    // Soft delete
    const result = yield grade_model_1.Grade.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return result;
});
const getActiveGrades = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield grade_model_1.Grade.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
    return result;
});
exports.GradeService = {
    createGrade,
    getAllGrades,
    getSingleGrade,
    updateGrade,
    deleteGrade,
    getActiveGrades,
};
