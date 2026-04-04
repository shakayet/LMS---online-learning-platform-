import { Model } from 'mongoose';

export type IPricingPlan = {
  name: string;
  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
  pricePerHour: number;
  courseDuration: string;
  commitmentMonths: number;
  minimumHours: number;
  selectedHours: string;
  selectedHoursDetails: string;
  termType: string;
  inclusions: string[];
  isActive: boolean;
  sortOrder: number;
};

export type IPricingConfig = {
  plans: IPricingPlan[];
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PricingConfigModel = Model<IPricingConfig>;