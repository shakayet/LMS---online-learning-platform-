import { Schema, model } from 'mongoose';
import { IPricingConfig, PricingConfigModel } from './pricingConfig.interface';

const pricingPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    tier: {
      type: String,
      enum: ['FLEXIBLE', 'REGULAR', 'LONG_TERM'],
      required: true,
    },
    pricePerHour: { type: Number, required: true },
    courseDuration: { type: String, required: true },
    commitmentMonths: { type: Number, required: true, default: 0 },
    minimumHours: { type: Number, required: true, default: 0 },
    selectedHours: { type: String, required: true },
    selectedHoursDetails: { type: String, required: true },
    termType: { type: String, required: true },
    inclusions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, required: true },
  },
  { _id: false }
);

const pricingConfigSchema = new Schema<IPricingConfig, PricingConfigModel>(
  {
    plans: [pricingPlanSchema],
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

export const PricingConfig = model<IPricingConfig, PricingConfigModel>(
  'PricingConfig',
  pricingConfigSchema
);