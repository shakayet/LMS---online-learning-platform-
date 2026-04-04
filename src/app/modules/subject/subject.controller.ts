import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SubjectService } from './subject.service';

const createSubject = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.createSubject(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Subject created successfully',
    data: result,
  });
});

const getAllSubjects = catchAsync(async (req: Request, res: Response) => {
  const result = await SubjectService.getAllSubjects(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subjects retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

const getSingleSubject = catchAsync(async (req: Request, res: Response) => {
  const { subjectId } = req.params;
  const result = await SubjectService.getSingleSubject(subjectId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subject retrieved successfully',
    data: result,
  });
});

const updateSubject = catchAsync(async (req: Request, res: Response) => {
  const { subjectId } = req.params;
  const result = await SubjectService.updateSubject(subjectId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subject updated successfully',
    data: result,
  });
});

const deleteSubject = catchAsync(async (req: Request, res: Response) => {
  const { subjectId } = req.params;
  const result = await SubjectService.deleteSubject(subjectId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Subject deleted successfully',
    data: result,
  });
});

const getActiveSubjects = catchAsync(async (_req: Request, res: Response) => {
  const result = await SubjectService.getActiveSubjects();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active subjects retrieved successfully',
    data: result,
  });
});

export const SubjectController = {
  createSubject,
  getAllSubjects,
  getSingleSubject,
  updateSubject,
  deleteSubject,
  getActiveSubjects,
};
