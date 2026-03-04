import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GradeService } from './grade.service';

const createGrade = catchAsync(async (req: Request, res: Response) => {
  const result = await GradeService.createGrade(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Grade created successfully',
    data: result,
  });
});

// Get all grades
const getAllGrades = catchAsync(async (req: Request, res: Response) => {
  const result = await GradeService.getAllGrades(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grades retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

// Get single grade
const getSingleGrade = catchAsync(async (req: Request, res: Response) => {
  const { gradeId } = req.params;
  const result = await GradeService.getSingleGrade(gradeId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grade retrieved successfully',
    data: result,
  });
});

// Update grade
const updateGrade = catchAsync(async (req: Request, res: Response) => {
  const { gradeId } = req.params;
  const result = await GradeService.updateGrade(gradeId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grade updated successfully',
    data: result,
  });
});

// Delete grade
const deleteGrade = catchAsync(async (req: Request, res: Response) => {
  const { gradeId } = req.params;
  const result = await GradeService.deleteGrade(gradeId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Grade deleted successfully',
    data: result,
  });
});

// Get active grades
const getActiveGrades = catchAsync(async (_req: Request, res: Response) => {
  const result = await GradeService.getActiveGrades();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active grades retrieved successfully',
    data: result,
  });
});

export const GradeController = {
  createGrade,
  getAllGrades,
  getSingleGrade,
  updateGrade,
  deleteGrade,
  getActiveGrades,
};
