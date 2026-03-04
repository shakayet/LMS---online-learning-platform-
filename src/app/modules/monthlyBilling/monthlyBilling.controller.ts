import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MonthlyBillingService } from './monthlyBilling.service';

/**
 * Generate monthly billings (Cron job or manual trigger)
 */
const generateMonthlyBillings = catchAsync(async (req: Request, res: Response) => {
  const { month, year } = req.body;
  const result = await MonthlyBillingService.generateMonthlyBillings(month, year);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: `${result.length} monthly billings generated successfully`,
    data: { count: result.length, billings: result },
  });
});

/**
 * Get student's billing history
 */
const getMyBillings = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await MonthlyBillingService.getMyBillings(studentId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Billing history retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get all billings (Admin)
 */
const getAllBillings = catchAsync(async (req: Request, res: Response) => {
  const result = await MonthlyBillingService.getAllBillings(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Billings retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

/**
 * Get single billing
 */
const getSingleBilling = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MonthlyBillingService.getSingleBilling(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Billing retrieved successfully',
    data: result,
  });
});

/**
 * Mark billing as paid (Manual or webhook)
 */
const markAsPaid = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MonthlyBillingService.markAsPaid(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Billing marked as paid',
    data: result,
  });
});

/**
 * Mark billing as failed
 */
const markAsFailed = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { failureReason } = req.body;
  const result = await MonthlyBillingService.markAsFailed(id, failureReason);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Billing marked as failed',
    data: result,
  });
});

export const MonthlyBillingController = {
  generateMonthlyBillings,
  getMyBillings,
  getAllBillings,
  getSingleBilling,
  markAsPaid,
  markAsFailed,
};
