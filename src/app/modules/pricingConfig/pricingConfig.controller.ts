import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PricingConfigService } from './pricingConfig.service';

const getActivePricingPlans = catchAsync(async (req: Request, res: Response) => {
  const result = await PricingConfigService.getActivePricingPlans();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pricing plans retrieved successfully',
    data: result,
  });
});

const getPricingConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await PricingConfigService.getPricingConfig();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pricing config retrieved successfully',
    data: result,
  });
});

const updatePricingConfig = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id as string;
  const { plans } = req.body;
  const result = await PricingConfigService.updatePricingConfig(plans, adminId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pricing config updated successfully',
    data: result,
  });
});

const updateSinglePlan = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id as string;
  const { tier } = req.params;
  const updates = req.body;
  const result = await PricingConfigService.updateSinglePlan(
    tier as 'FLEXIBLE' | 'REGULAR' | 'LONG_TERM',
    updates,
    adminId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Plan updated successfully',
    data: result,
  });
});

const resetToDefaultPricing = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id as string;
  const result = await PricingConfigService.resetToDefaultPricing(adminId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Pricing reset to defaults successfully',
    data: result,
  });
});

export const PricingConfigController = {
  getActivePricingPlans,
  getPricingConfig,
  updatePricingConfig,
  updateSinglePlan,
  resetToDefaultPricing,
};
