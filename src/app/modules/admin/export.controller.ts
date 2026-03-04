import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import { ExportService } from './export.service';

/**
 * Export users to CSV
 */
const exportUsers = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.query;
  const csv = await ExportService.exportUsers(role as string);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export applications to CSV
 */
const exportApplications = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.query;
  const csv = await ExportService.exportApplications(status as string);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export sessions to CSV
 */
const exportSessions = catchAsync(async (req: Request, res: Response) => {
  const { status, startDate, endDate } = req.query;
  const csv = await ExportService.exportSessions(
    status as string,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export billings to CSV
 */
const exportBillings = catchAsync(async (req: Request, res: Response) => {
  const { status, year, month } = req.query;
  const csv = await ExportService.exportBillings(
    status as string,
    year ? parseInt(year as string) : undefined,
    month ? parseInt(month as string) : undefined
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=billings.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export earnings to CSV
 */
const exportEarnings = catchAsync(async (req: Request, res: Response) => {
  const { status, year, month } = req.query;
  const csv = await ExportService.exportEarnings(
    status as string,
    year ? parseInt(year as string) : undefined,
    month ? parseInt(month as string) : undefined
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=earnings.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export subscriptions to CSV
 */
const exportSubscriptions = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.query;
  const csv = await ExportService.exportSubscriptions(status as string);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
  res.status(StatusCodes.OK).send(csv);
});

/**
 * Export trial requests to CSV
 */
const exportTrialRequests = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.query;
  const csv = await ExportService.exportTrialRequests(status as string);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=trial-requests.csv');
  res.status(StatusCodes.OK).send(csv);
});

export const ExportController = {
  exportUsers,
  exportApplications,
  exportSessions,
  exportBillings,
  exportEarnings,
  exportSubscriptions,
  exportTrialRequests,
};
