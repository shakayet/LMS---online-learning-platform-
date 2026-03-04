"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, data) => {
    // 👇 store full response data for logger middleware
    res.locals.responsePayload = data;
    const resData = {
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
exports.default = sendResponse;
