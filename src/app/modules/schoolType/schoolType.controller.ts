import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SchoolTypeService } from './schoolType.service';

const createSchoolType = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolTypeService.createSchoolType(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'School type created successfully',
    data: result,
  });
});

const getAllSchoolTypes = catchAsync(async (req: Request, res: Response) => {
  const result = await SchoolTypeService.getAllSchoolTypes(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'School types retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const getSingleSchoolType = catchAsync(async (req: Request, res: Response) => {
  const { schoolTypeId } = req.params;
  const result = await SchoolTypeService.getSingleSchoolType(schoolTypeId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'School type retrieved successfully',
    data: result,
  });
});

const updateSchoolType = catchAsync(async (req: Request, res: Response) => {
  const { schoolTypeId } = req.params;
  const result = await SchoolTypeService.updateSchoolType(schoolTypeId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'School type updated successfully',
    data: result,
  });
});

const deleteSchoolType = catchAsync(async (req: Request, res: Response) => {
  const { schoolTypeId } = req.params;
  const result = await SchoolTypeService.deleteSchoolType(schoolTypeId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'School type deleted successfully',
    data: result,
  });
});

const getActiveSchoolTypes = catchAsync(async (_req: Request, res: Response) => {
  const result = await SchoolTypeService.getActiveSchoolTypes();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active school types retrieved successfully',
    data: result,
  });
});

export const SchoolTypeController = {
  createSchoolType,
  getAllSchoolTypes,
  getSingleSchoolType,
  updateSchoolType,
  deleteSchoolType,
  getActiveSchoolTypes,
};
