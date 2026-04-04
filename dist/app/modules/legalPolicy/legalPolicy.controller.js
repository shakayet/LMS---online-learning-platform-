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
exports.LegalPolicyController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const legalPolicy_service_1 = require("./legalPolicy.service");

const getAllPolicies = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_service_1.LegalPolicyService.getAllPolicies();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'All policies retrieved successfully',
        data: result,
    });
}));

const getPolicyByType = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const result = yield legalPolicy_service_1.LegalPolicyService.getPolicyByType(type);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Policy retrieved successfully',
        data: result,
    });
}));

const getActivePolicyByType = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const result = yield legalPolicy_service_1.LegalPolicyService.getActivePolicyByType(type);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Policy retrieved successfully',
        data: result,
    });
}));

const upsertPolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { type } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const result = yield legalPolicy_service_1.LegalPolicyService.upsertPolicy(type, req.body, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Policy saved successfully',
        data: result,
    });
}));

const updatePolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { type } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    const result = yield legalPolicy_service_1.LegalPolicyService.updatePolicy(type, req.body, userId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Policy updated successfully',
        data: result,
    });
}));

const deletePolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const result = yield legalPolicy_service_1.LegalPolicyService.deletePolicy(type);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Policy deleted successfully',
        data: result,
    });
}));

const getAllActivePolicies = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_service_1.LegalPolicyService.getAllActivePolicies();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Active policies retrieved successfully',
        data: result,
    });
}));

const initializeDefaultPolicies = (0, catchAsync_1.default)((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield legalPolicy_service_1.LegalPolicyService.initializeDefaultPolicies();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Default policies initialized successfully',
        data: null,
    });
}));
exports.LegalPolicyController = {
    getAllPolicies,
    getPolicyByType,
    getActivePolicyByType,
    upsertPolicy,
    updatePolicy,
    deletePolicy,
    getAllActivePolicies,
    initializeDefaultPolicies,
};
