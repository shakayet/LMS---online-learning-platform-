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
exports.PricingConfigController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const pricingConfig_service_1 = require("./pricingConfig.service");

const getActivePricingPlans = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pricingConfig_service_1.PricingConfigService.getActivePricingPlans();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Pricing plans retrieved successfully',
        data: result,
    });
}));

const getPricingConfig = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield pricingConfig_service_1.PricingConfigService.getPricingConfig();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Pricing config retrieved successfully',
        data: result,
    });
}));

const updatePricingConfig = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.user.id;
    const { plans } = req.body;
    const result = yield pricingConfig_service_1.PricingConfigService.updatePricingConfig(plans, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Pricing config updated successfully',
        data: result,
    });
}));

const updateSinglePlan = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.user.id;
    const { tier } = req.params;
    const updates = req.body;
    const result = yield pricingConfig_service_1.PricingConfigService.updateSinglePlan(tier, updates, adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Plan updated successfully',
        data: result,
    });
}));

const resetToDefaultPricing = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.user.id;
    const result = yield pricingConfig_service_1.PricingConfigService.resetToDefaultPricing(adminId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_codes_1.StatusCodes.OK,
        message: 'Pricing reset to defaults successfully',
        data: result,
    });
}));
exports.PricingConfigController = {
    getActivePricingPlans,
    getPricingConfig,
    updatePricingConfig,
    updateSinglePlan,
    resetToDefaultPricing,
};
