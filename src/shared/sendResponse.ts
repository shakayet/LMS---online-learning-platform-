import { Response } from 'express';

type IPagination = {
  page: number;
  limit: number;
  totalPage: number;
  total: number;
};

type IData<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  pagination?: IPagination;
  meta?: Record<string, unknown>;
  data?: T;
  accessToken?: string; // For role updates (e.g., APPLICANT -> TUTOR)
};

const sendResponse = <T>(res: Response, data: IData<T>) => {
  // 👇 store full response data for logger middleware
  res.locals.responsePayload = data;

  const resData: Record<string, unknown> = {
    success: data.success,
    message: data.message,
    pagination: data.pagination,
    meta: data.meta,
    data: data.data,
  };

  // Include accessToken if provided (for role updates)
  if (data.accessToken) {
    resData.accessToken = data.accessToken;
  }

  res.status(data.statusCode).json(resData);
};

export default sendResponse;
