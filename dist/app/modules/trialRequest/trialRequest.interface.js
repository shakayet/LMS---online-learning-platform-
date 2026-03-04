"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_TYPE = exports.TRIAL_REQUEST_STATUS = void 0;
var TRIAL_REQUEST_STATUS;
(function (TRIAL_REQUEST_STATUS) {
    TRIAL_REQUEST_STATUS["PENDING"] = "PENDING";
    TRIAL_REQUEST_STATUS["ACCEPTED"] = "ACCEPTED";
    TRIAL_REQUEST_STATUS["EXPIRED"] = "EXPIRED";
    TRIAL_REQUEST_STATUS["CANCELLED"] = "CANCELLED";
})(TRIAL_REQUEST_STATUS || (exports.TRIAL_REQUEST_STATUS = TRIAL_REQUEST_STATUS = {}));
// Request type to distinguish between trial and session requests in unified view
var REQUEST_TYPE;
(function (REQUEST_TYPE) {
    REQUEST_TYPE["TRIAL"] = "TRIAL";
    REQUEST_TYPE["SESSION"] = "SESSION";
})(REQUEST_TYPE || (exports.REQUEST_TYPE = REQUEST_TYPE = {}));
