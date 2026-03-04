import { Model } from 'mongoose';

export type IPricingPlan = {
  name: string;                    // "Flexible", "Regular", "Longterm"
  tier: 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM';
  pricePerHour: number;            // EUR (30, 28, 25)
  courseDuration: string;          // "None", "1 Month", "3 Months"
  commitmentMonths: number;        // 0, 1, 3
  minimumHours: number;            // 0, 4, 4
  selectedHours: string;           // "Flexible number of sessions"
  selectedHoursDetails: string;    // "No minimum requirement", "Min. 4 hours per month"
  termType: string;                // "Flexible", "Flexible or recurring"
  inclusions: string[];            // ["Shortterm support", "Exam preparation"]
  isActive: boolean;               // To enable/disable plans
  sortOrder: number;               // Display order (1, 2, 3)
};

export type IPricingConfig = {
  plans: IPricingPlan[];
  updatedBy?: string;              // Admin who last updated
  createdAt?: Date;
  updatedAt?: Date;
};

export type PricingConfigModel = Model<IPricingConfig>;