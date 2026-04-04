import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TutorApplicationService } from './tutorApplication.service';

const submitApplication = catchAsync(async (req: Request, res: Response) => {
  const result = await TutorApplicationService.submitApplication(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Application submitted successfully',
    data: result,
  });
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
  const userEmail = req.user?.email as string;
  const userRole = req.user?.role as string;
  const result = await TutorApplicationService.getMyApplication(
    userEmail,
    userRole
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application retrieved successfully',
    data: result.application,

    ...(result.newAccessToken && { accessToken: result.newAccessToken }),
  });
});

const getAllApplications = catchAsync(async (req: Request, res: Response) => {
  const result = await TutorApplicationService.getAllApplications(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Applications retrieved successfully',
    data: result.data,
    pagination: result.meta,
  });
});

const getSingleApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TutorApplicationService.getSingleApplication(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application retrieved successfully',
    data: result,
  });
});

const selectForInterview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const result = await TutorApplicationService.selectForInterview(
    id,
    adminNotes
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application selected for interview',
    data: result,
  });
});

const approveApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminNotes } = req.body;
  const result = await TutorApplicationService.approveApplication(
    id,
    adminNotes
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application approved successfully. User is now a TUTOR.',
    data: result,
  });
});

const rejectApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;
  const result = await TutorApplicationService.rejectApplication(
    id,
    rejectionReason
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application rejected',
    data: result,
  });
});

const sendForRevision = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { revisionNote } = req.body;
  const result = await TutorApplicationService.sendForRevision(
    id,
    revisionNote
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application sent for revision',
    data: result,
  });
});

const deleteApplication = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TutorApplicationService.deleteApplication(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application deleted successfully',
    data: result,
  });
});

const updateMyApplication = catchAsync(async (req: Request, res: Response) => {
  const userEmail = req.user?.email as string;
  const result = await TutorApplicationService.updateMyApplication(
    userEmail,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Application updated and resubmitted successfully',
    data: result,
  });
});

export const TutorApplicationController = {
  submitApplication,
  getMyApplication,
  getAllApplications,
  getSingleApplication,
  selectForInterview,
  approveApplication,
  rejectApplication,
  sendForRevision,
  deleteApplication,
  updateMyApplication,
};
