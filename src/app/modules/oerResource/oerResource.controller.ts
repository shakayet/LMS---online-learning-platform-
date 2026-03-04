import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { OERResourceService } from './oerResource.service';

// Search OER resources
const searchResources = catchAsync(async (req: Request, res: Response) => {
  const { query, subject, grade, type, page, limit } = req.query;

  const result = await OERResourceService.searchResources({
    query: query as string | undefined,
    subject: subject as string | undefined,
    grade: grade as string | undefined,
    type: type as string | undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'OER resources retrieved successfully',
    data: result.resources,
    pagination: {
      page: result.page,
      limit: result.limit,
      totalPage: result.totalPages,
      total: result.total,
    },
  });
});

// Get available filter options
const getFilterOptions = catchAsync(async (_req: Request, res: Response) => {
  const subjects = OERResourceService.getAvailableSubjects();
  const types = OERResourceService.getAvailableTypes();
  const grades = OERResourceService.getAvailableGrades();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Filter options retrieved successfully',
    data: {
      subjects,
      types,
      grades,
    },
  });
});

export const OERResourceController = {
  searchResources,
  getFilterOptions,
};
