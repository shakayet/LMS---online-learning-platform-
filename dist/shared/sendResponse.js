"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, data) => {

    res.locals.responsePayload = data;
    const resData = {
        success: data.success,
        message: data.message,
        pagination: data.pagination,
        meta: data.meta,
        data: data.data,
    };

    if (data.accessToken) {
        resData.accessToken = data.accessToken;
    }
    res.status(data.statusCode).json(resData);
};
exports.default = sendResponse;
