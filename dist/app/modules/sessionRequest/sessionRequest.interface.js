"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TYPE = exports.SESSION_REQUEST_STATUS = void 0;
var SESSION_REQUEST_STATUS;
(function (SESSION_REQUEST_STATUS) {
    SESSION_REQUEST_STATUS["PENDING"] = "PENDING";
    SESSION_REQUEST_STATUS["ACCEPTED"] = "ACCEPTED";
    SESSION_REQUEST_STATUS["EXPIRED"] = "EXPIRED";
    SESSION_REQUEST_STATUS["CANCELLED"] = "CANCELLED";
})(SESSION_REQUEST_STATUS || (exports.SESSION_REQUEST_STATUS = SESSION_REQUEST_STATUS = {}));
// Reuse REQUEST_TYPE from trialRequest for consistency
// Note: SCHOOL_TYPE and GRADE_LEVEL are now dynamic strings (no longer enums)
var trialRequest_interface_1 = require("../trialRequest/trialRequest.interface");
Object.defineProperty(exports, "REQUEST_TYPE", { enumerable: true, get: function () { return trialRequest_interface_1.REQUEST_TYPE; } });
