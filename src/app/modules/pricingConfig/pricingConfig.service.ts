import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IPricingConfig, IPricingPlan } from './pricingConfig.interface';
import { PricingConfig } from './pricingConfig.model';

// Default pricing plans (used for initial seeding)
const DEFAULT_PRICING_PLANS: IPricingPlan[] = [
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
const getPricingConfig = async (): Promise<IPricingConfig> => {
  let config = await PricingConfig.findOne();

  // If no config exists, create with defaults
  if (!config) {
    config = await PricingConfig.create({
      plans: DEFAULT_PRICING_PLANS,
    });
  }

  return config;
};

/**
 * Get active pricing plans (for public/frontend)
 */
const getActivePricingPlans = async (): Promise<IPricingPlan[]> => {
  const config = await getPricingConfig();
  return config.plans
    .filter((plan) => plan.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

/**
 * Get pricing for a specific tier (for subscription service)
 */
const getPricingByTier = async (
  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM'
): Promise<IPricingPlan | null> => {
  const config = await getPricingConfig();
  return config.plans.find((plan) => plan.tier === tier && plan.isActive) || null;
};

/**
 * Update pricing config (Admin only)
 */
const updatePricingConfig = async (
  plans: IPricingPlan[],
  adminId: string
): Promise<IPricingConfig> => {
  // Validate plans
  const tiers = plans.map((p) => p.tier);
  const uniqueTiers = new Set(tiers);
  if (tiers.length !== uniqueTiers.size) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Duplicate tier found in plans');
  }

  // Validate required tiers exist
  const requiredTiers = ['FLEXIBLE', 'REGULAR', 'LONG_TERM'];
  for (const tier of requiredTiers) {
    if (!tiers.includes(tier as 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM')) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Missing required tier: ${tier}`
      );
    }
  }

  // Validate pricing values
  for (const plan of plans) {
    if (plan.pricePerHour <= 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Price per hour must be positive for ${plan.name}`
      );
    }
    if (plan.minimumHours < 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Minimum hours cannot be negative for ${plan.name}`
      );
    }
    if (plan.commitmentMonths < 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Commitment months cannot be negative for ${plan.name}`
      );
    }
  }

  // Update or create config
  let config = await PricingConfig.findOne();

  if (config) {
    config.plans = plans;
    config.updatedBy = adminId;
    await config.save();
  } else {
    config = await PricingConfig.create({
      plans,
      updatedBy: adminId,
    });
  }

  return config;
};

/**
 * Update a single plan (Admin only)
 */
const updateSinglePlan = async (
  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM',
  updates: Partial<IPricingPlan>,
  adminId: string
): Promise<IPricingConfig> => {
  // Get the Mongoose document directly
  let config = await PricingConfig.findOne();

  if (!config) {
    config = await PricingConfig.create({
      plans: DEFAULT_PRICING_PLANS,
    });
  }

  const planIndex = config.plans.findIndex((p) => p.tier === tier);
  if (planIndex === -1) {
    throw new ApiError(StatusCodes.NOT_FOUND, `Plan with tier ${tier} not found`);
  }

  // Merge updates
  config.plans[planIndex] = {
    ...config.plans[planIndex],
    ...updates,
    tier, // Ensure tier cannot be changed
  };

  config.updatedBy = adminId;
  await config.save();

  return config;
};

/**
 * Reset to default pricing (Admin only)
 */
const resetToDefaultPricing = async (adminId: string): Promise<IPricingConfig> => {
  let config = await PricingConfig.findOne();

  if (config) {
    config.plans = DEFAULT_PRICING_PLANS;
    config.updatedBy = adminId;
    await config.save();
  } else {
    config = await PricingConfig.create({
      plans: DEFAULT_PRICING_PLANS,
      updatedBy: adminId,
    });
  }

  return config;
};

export const PricingConfigService = {
  getPricingConfig,
  getActivePricingPlans,
  getPricingByTier,
  updatePricingConfig,
  updateSinglePlan,
  resetToDefaultPricing,
  DEFAULT_PRICING_PLANS,
};
