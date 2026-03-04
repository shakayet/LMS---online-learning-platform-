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
exports.LegalPolicyService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const legalPolicy_interface_1 = require("./legalPolicy.interface");
const legalPolicy_model_1 = require("./legalPolicy.model");
// Get all policies
const getAllPolicies = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_model_1.LegalPolicy.find().sort({ type: 1 }).lean();
    return result;
});
// Get policy by type
const getPolicyByType = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_model_1.LegalPolicy.findOne({ type }).lean();
    return result;
});
// Get active policy by type (for public display)
const getActivePolicyByType = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_model_1.LegalPolicy.findOne({ type, isActive: true }).lean();
    return result;
});
// Create or update policy
const upsertPolicy = (type, payload, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingPolicy = yield legalPolicy_model_1.LegalPolicy.findOne({ type });
    if (existingPolicy) {
        // Update existing policy
        const result = yield legalPolicy_model_1.LegalPolicy.findOneAndUpdate({ type }, Object.assign(Object.assign({}, payload), { lastUpdatedBy: userId }), { new: true, runValidators: true });
        if (!result) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update policy');
        }
        return result;
    }
    else {
        // Create new policy
        const result = yield legalPolicy_model_1.LegalPolicy.create(Object.assign(Object.assign({ type }, payload), { lastUpdatedBy: userId }));
        return result;
    }
});
// Update policy
const updatePolicy = (type, payload, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield legalPolicy_model_1.LegalPolicy.findOne({ type });
    if (!policy) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Policy not found');
    }
    const result = yield legalPolicy_model_1.LegalPolicy.findOneAndUpdate({ type }, Object.assign(Object.assign({}, payload), { lastUpdatedBy: userId }), { new: true, runValidators: true });
    return result;
});
// Delete policy (soft delete)
const deletePolicy = (type) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield legalPolicy_model_1.LegalPolicy.findOne({ type });
    if (!policy) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Policy not found');
    }
    const result = yield legalPolicy_model_1.LegalPolicy.findOneAndUpdate({ type }, { isActive: false }, { new: true });
    return result;
});
// Get all active policies (for public display)
const getAllActivePolicies = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield legalPolicy_model_1.LegalPolicy.find({ isActive: true }).sort({ type: 1 }).lean();
    return result;
});
// Initialize default policies if they don't exist
const initializeDefaultPolicies = () => __awaiter(void 0, void 0, void 0, function* () {
    const defaultPolicies = [
        {
            type: legalPolicy_interface_1.POLICY_TYPE.PRIVACY_POLICY,
            title: 'Privacy Policy',
            content: '',
            isActive: true,
        },
        {
            type: legalPolicy_interface_1.POLICY_TYPE.TERMS_FOR_STUDENTS,
            title: 'Terms for Students',
            content: '',
            isActive: true,
        },
        {
            type: legalPolicy_interface_1.POLICY_TYPE.TERMS_FOR_TUTORS,
            title: 'Terms for Tutors',
            content: '',
            isActive: true,
        },
        {
            type: legalPolicy_interface_1.POLICY_TYPE.CANCELLATION_POLICY,
            title: 'Cancellation Policy',
            content: '',
            isActive: true,
        },
        {
            type: legalPolicy_interface_1.POLICY_TYPE.LEGAL_NOTICE,
            title: 'Legal Notice',
            content: '',
            isActive: true,
        },
        {
            type: legalPolicy_interface_1.POLICY_TYPE.COOKIE_POLICY,
            title: 'Cookie Policy',
            content: '',
            isActive: true,
        },
    ];
    for (const policy of defaultPolicies) {
        const exists = yield legalPolicy_model_1.LegalPolicy.findOne({ type: policy.type });
        if (!exists) {
            yield legalPolicy_model_1.LegalPolicy.create(policy);
        }
    }
});
exports.LegalPolicyService = {
    getAllPolicies,
    getPolicyByType,
    getActivePolicyByType,
    upsertPolicy,
    updatePolicy,
    deletePolicy,
    getAllActivePolicies,
    initializeDefaultPolicies,
};
