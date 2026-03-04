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
exports.SchoolTypeService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const schoolType_model_1 = require("./schoolType.model");
const createSchoolType = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if school type with the same name already exists
    const existingSchoolType = yield schoolType_model_1.SchoolType.findOne({ name: payload.name });
    if (existingSchoolType) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'School type with this name already exists');
    }
    const result = yield schoolType_model_1.SchoolType.create(payload);
    return result;
});
// Get all school types with filtering, searching, pagination
const getAllSchoolTypes = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const schoolTypeQuery = new QueryBuilder_1.default(schoolType_model_1.SchoolType.find(), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield schoolTypeQuery.modelQuery;
    const pagination = yield schoolTypeQuery.getPaginationInfo();
    return {
        data,
        pagination,
    };
});
// Get single school type by ID
const getSingleSchoolType = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield schoolType_model_1.SchoolType.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'School type not found');
    }
    return result;
});
// Update school type
const updateSchoolType = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if school type exists
    const schoolType = yield schoolType_model_1.SchoolType.findById(id);
    if (!schoolType) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'School type not found');
    }
    // If updating name, check for uniqueness
    if (payload.name && payload.name !== schoolType.name) {
        const existingSchoolType = yield schoolType_model_1.SchoolType.findOne({ name: payload.name });
        if (existingSchoolType) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'School type with this name already exists');
        }
    }
    const result = yield schoolType_model_1.SchoolType.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
});
// Delete school type (soft delete by setting isActive to false)
const deleteSchoolType = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const schoolType = yield schoolType_model_1.SchoolType.findById(id);
    if (!schoolType) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'School type not found');
    }
    // Soft delete
    const result = yield schoolType_model_1.SchoolType.findByIdAndUpdate(id, { isActive: false }, { new: true });
    return result;
});
const getActiveSchoolTypes = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield schoolType_model_1.SchoolType.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
    return result;
});
exports.SchoolTypeService = {
    createSchoolType,
    getAllSchoolTypes,
    getSingleSchoolType,
    updateSchoolType,
    deleteSchoolType,
    getActiveSchoolTypes,
};
