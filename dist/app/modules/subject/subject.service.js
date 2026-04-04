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
exports.SubjectService = void 0;
const http_status_codes_1 = require("http-status-codes");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const subject_model_1 = require("./subject.model");
const trialRequest_model_1 = require("../trialRequest/trialRequest.model");
const sessionRequest_model_1 = require("../sessionRequest/sessionRequest.model");
const user_model_1 = require("../user/user.model");
const tutorApplication_model_1 = require("../tutorApplication/tutorApplication.model");
const createSubject = (payload) => __awaiter(void 0, void 0, void 0, function* () {

    const existingSubject = yield subject_model_1.Subject.findOne({ name: payload.name });
    if (existingSubject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Subject with this same name already exists');
    }
    const result = yield subject_model_1.Subject.create(payload);
    return result;
});

const getAllSubjects = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const subjectQuery = new QueryBuilder_1.default(subject_model_1.Subject.find(), query)
        .search(['name'])
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield subjectQuery.modelQuery;
    const pagination = yield subjectQuery.getPaginationInfo();
    return {
        data,
        pagination,
    };
});

const getSingleSubject = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield subject_model_1.Subject.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }
    return result;
});

const updateSubject = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {

    const subject = yield subject_model_1.Subject.findById(id);
    if (!subject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }

    if (payload.name && payload.name !== subject.name) {
        const existingSubject = yield subject_model_1.Subject.findOne({ name: payload.name });
        if (existingSubject) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Subject with this name already exists');
        }
    }
    const result = yield subject_model_1.Subject.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
});

const deleteSubject = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = yield subject_model_1.Subject.findById(id);
    if (!subject) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Subject not found');
    }

    const activeTrialRequests = yield trialRequest_model_1.TrialRequest.countDocuments({
        subject: id,
        status: { $in: ['PENDING', 'ACCEPTED'] },
    });
    if (activeTrialRequests > 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot delete: ${activeTrialRequests} active trial request(s) use this subject. Deactivate it instead.`);
    }

    const activeSessionRequests = yield sessionRequest_model_1.SessionRequest.countDocuments({
        subject: id,
        status: { $in: ['PENDING', 'ACCEPTED'] },
    });
    if (activeSessionRequests > 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot delete: ${activeSessionRequests} active session request(s) use this subject. Deactivate it instead.`);
    }

    yield user_model_1.User.updateMany({ subjects: id }, { $pull: { subjects: id } });

    yield tutorApplication_model_1.TutorApplication.updateMany({ subjects: id }, { $pull: { subjects: id } });

    const result = yield subject_model_1.Subject.findByIdAndDelete(id);
    return result;
});
const getActiveSubjects = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield subject_model_1.Subject.find({ isActive: true })
        .sort({ name: 1 })
        .lean();
    return result;
});
exports.SubjectService = {
    createSubject,
    getAllSubjects,
    getSingleSubject,
    updateSubject,
    deleteSubject,
    getActiveSubjects,
};
