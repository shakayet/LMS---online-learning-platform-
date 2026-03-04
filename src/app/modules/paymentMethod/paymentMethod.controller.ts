import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PaymentMethodService } from './paymentMethod.service';

/**
 * Get all saved payment methods
 */
const getPaymentMethods = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await PaymentMethodService.getPaymentMethods(studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment methods retrieved successfully',
    data: result,
  });
});

/**
 * Create SetupIntent for adding new payment method
 */
const createSetupIntent = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const result = await PaymentMethodService.createSetupIntent(studentId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Setup intent created successfully',
    data: result,
  });
});

/**
 * Attach payment method after successful setup
 */
const attachPaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const { paymentMethodId, setAsDefault } = req.body;

  const result = await PaymentMethodService.attachPaymentMethod(
    studentId,
    paymentMethodId,
    setAsDefault
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Payment method added successfully',
    data: result,
  });
});

/**
 * Set a payment method as default
 */
const setDefaultPaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const { paymentMethodId } = req.params;

  const result = await PaymentMethodService.setDefaultPaymentMethod(studentId, paymentMethodId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Default payment method updated successfully',
    data: result,
  });
});

/**
 * Delete a payment method
 */
const deletePaymentMethod = catchAsync(async (req: Request, res: Response) => {
  const studentId = req.user!.id as string;
  const { paymentMethodId } = req.params;

  const result = await PaymentMethodService.deletePaymentMethod(studentId, paymentMethodId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Payment method deleted successfully',
    data: result,
  });
});

export const PaymentMethodController = {
  getPaymentMethods,
  createSetupIntent,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
};