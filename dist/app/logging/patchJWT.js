"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const api_1 = require("@opentelemetry/api");

const jwt = require('jsonwebtoken');
const originalSign = jwt.sign;
const originalVerify = jwt.verify;

jwt.sign = function patchedJwtSign(...args) {
    const tracer = api_1.trace.getTracer('app');
    return tracer.startActiveSpan('JWT.sign', span => {
        try {
            return originalSign.apply(jwt, args);
        }
        catch (err) {
            try {
                span.recordException(err);
            }
            catch (_a) { }
            throw err;
        }
        finally {
            try {
                span.end();
            }
            catch (_b) { }
        }
    });
};

jwt.verify = function patchedJwtVerify(...args) {
    const tracer = api_1.trace.getTracer('app');
    return tracer.startActiveSpan('JWT.verify', span => {
        try {
            return originalVerify.apply(jwt, args);
        }
        catch (err) {
            try {
                span.recordException(err);
            }
            catch (_a) { }
            throw err;
        }
        finally {
            try {
                span.end();
            }
            catch (_b) { }
        }
    });
};
