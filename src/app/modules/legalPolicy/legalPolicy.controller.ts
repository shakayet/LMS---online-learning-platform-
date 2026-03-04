import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LegalPolicyService } from './legalPolicy.service';
import { POLICY_TYPE } from './legalPolicy.interface';

// Get all policies (admin)
const getAllPolicies = catchAsync(async (_req: Request, res: Response) => {
  const result = await LegalPolicyService.getAllPolicies();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All policies retrieved successfully',
    data: result,
  });
});

// Get policy by type (admin)
const getPolicyByType = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const result = await LegalPolicyService.getPolicyByType(type as POLICY_TYPE);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Policy retrieved successfully',
    data: result,
  });
});

// Get active policy by type (public)
const getActivePolicyByType = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const result = await LegalPolicyService.getActivePolicyByType(type as POLICY_TYPE);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Policy retrieved successfully',
    data: result,
  });
});

// Create or update policy (admin)
const upsertPolicy = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const userId = req.user?.userId;
  const result = await LegalPolicyService.upsertPolicy(type as POLICY_TYPE, req.body, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Policy saved successfully',
    data: result,
  });
});

// Update policy (admin)
const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const userId = req.user?.userId;
  const result = await LegalPolicyService.updatePolicy(type as POLICY_TYPE, req.body, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Policy updated successfully',
    data: result,
  });
});

// Delete policy (admin - soft delete)
const deletePolicy = catchAsync(async (req: Request, res: Response) => {
  const { type } = req.params;
  const result = await LegalPolicyService.deletePolicy(type as POLICY_TYPE);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Policy deleted successfully',
    data: result,
  });
});

// Get all active policies (public)
const getAllActivePolicies = catchAsync(async (_req: Request, res: Response) => {
  const result = await LegalPolicyService.getAllActivePolicies();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active policies retrieved successfully',
    data: result,
  });
});

// Initialize default policies (admin)
const initializeDefaultPolicies = catchAsync(async (_req: Request, res: Response) => {
  await LegalPolicyService.initializeDefaultPolicies();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Default policies initialized successfully',
    data: null,
  });
});

export const LegalPolicyController = {
  getAllPolicies,
  getPolicyByType,
  getActivePolicyByType,
  upsertPolicy,
  updatePolicy,
  deletePolicy,
  getAllActivePolicies,
  initializeDefaultPolicies,
};
