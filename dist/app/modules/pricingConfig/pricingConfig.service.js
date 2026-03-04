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
exports.PricingConfigService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const pricingConfig_model_1 = require("./pricingConfig.model");
// Default pricing plans (used for initial seeding)
const DEFAULT_PRICING_PLANS = [
    {
        name: 'Flexible',
        tier: 'FLEXIBLE',
        pricePerHour: 30,
        courseDuration: 'None',
        commitmentMonths: 0,
        minimumHours: 0,
        selectedHours: 'Flexible number of sessions',
        selectedHoursDetails: 'No minimum requirement',
        termType: 'Flexible',
        inclusions: ['Shortterm support', 'Exam preparation'],
        isActive: true,
        sortOrder: 1,
    },
    {
        name: 'Regular',
        tier: 'REGULAR',
        pricePerHour: 28,
        courseDuration: '1 Month',
        commitmentMonths: 1,
        minimumHours: 4,
        selectedHours: 'Flexible number of sessions',
        selectedHoursDetails: 'Min. 4 hours per month',
        termType: 'Flexible or recurring',
        inclusions: ['Homework support', 'Continuous learning'],
        isActive: true,
        sortOrder: 2,
    },
    {
        name: 'Longterm',
        tier: 'LONG_TERM',
        pricePerHour: 25,
        courseDuration: '3 Months',
        commitmentMonths: 3,
        minimumHours: 4,
        selectedHours: 'Flexible number of sessions',
        selectedHoursDetails: 'Min. 4 hours per month',
        termType: 'Flexible or recurring',
        inclusions: ['Longterm support', 'Foundation building'],
        isActive: true,
        sortOrder: 3,
    },
];
/**
 * Get pricing config (creates default if not exists)
 */
const getPricingConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    let config = yield pricingConfig_model_1.PricingConfig.findOne();
    // If no config exists, create with defaults
    if (!config) {
        config = yield pricingConfig_model_1.PricingConfig.create({
            plans: DEFAULT_PRICING_PLANS,
        });
    }
    return config;
});
/**
 * Get active pricing plans (for public/frontend)
 */
const getActivePricingPlans = () => __awaiter(void 0, void 0, void 0, function* () {
    const config = yield getPricingConfig();
    return config.plans
        .filter((plan) => plan.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
});
/**
 * Get pricing for a specific tier (for subscription service)
 */
const getPricingByTier = (tier) => __awaiter(void 0, void 0, void 0, function* () {
    const config = yield getPricingConfig();
    return config.plans.find((plan) => plan.tier === tier && plan.isActive) || null;
});
/**
 * Update pricing config (Admin only)
 */
const updatePricingConfig = (plans, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate plans
    const tiers = plans.map((p) => p.tier);
    const uniqueTiers = new Set(tiers);
    if (tiers.length !== uniqueTiers.size) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Duplicate tier found in plans');
    }
    // Validate required tiers exist
    const requiredTiers = ['FLEXIBLE', 'REGULAR', 'LONG_TERM'];
    for (const tier of requiredTiers) {
        if (!tiers.includes(tier)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Missing required tier: ${tier}`);
        }
    }
    // Validate pricing values
    for (const plan of plans) {
        if (plan.pricePerHour <= 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Price per hour must be positive for ${plan.name}`);
        }
        if (plan.minimumHours < 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Minimum hours cannot be negative for ${plan.name}`);
        }
        if (plan.commitmentMonths < 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Commitment months cannot be negative for ${plan.name}`);
        }
    }
    // Update or create config
    let config = yield pricingConfig_model_1.PricingConfig.findOne();
    if (config) {
        config.plans = plans;
        config.updatedBy = adminId;
        yield config.save();
    }
    else {
        config = yield pricingConfig_model_1.PricingConfig.create({
            plans,
            updatedBy: adminId,
        });
    }
    return config;
});
/**
 * Update a single plan (Admin only)
 */
const updateSinglePlan = (tier, updates, adminId) => __awaiter(void 0, void 0, void 0, function* () {
    // Get the Mongoose document directly
    let config = yield pricingConfig_model_1.PricingConfig.findOne();
    if (!config) {
        config = yield pricingConfig_model_1.PricingConfig.create({
            plans: DEFAULT_PRICING_PLANS,
        });
    }
    const planIndex = config.plans.findIndex((p) => p.tier === tier);
    if (planIndex === -1) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, `Plan with tier ${tier} not found`);
    }
    // Merge updates
    config.plans[planIndex] = Object.assign(Object.assign(Object.assign({}, config.plans[planIndex]), updates), { tier });
    config.updatedBy = adminId;
    yield config.save();
    return config;
});
/**
 * Reset to default pricing (Admin only)
 */
const resetToDefaultPricing = (adminId) => __awaiter(void 0, void 0, void 0, function* () {
    let config = yield pricingConfig_model_1.PricingConfig.findOne();
    if (config) {
        config.plans = DEFAULT_PRICING_PLANS;
        config.updatedBy = adminId;
        yield config.save();
    }
    else {
        config = yield pricingConfig_model_1.PricingConfig.create({
            plans: DEFAULT_PRICING_PLANS,
            updatedBy: adminId,
        });
    }
    return config;
});
exports.PricingConfigService = {
    getPricingConfig,
    getActivePricingPlans,
    getPricingByTier,
    updatePricingConfig,
    updateSinglePlan,
    resetToDefaultPricing,
    DEFAULT_PRICING_PLANS,
};
