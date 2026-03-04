"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Central OpenTelemetry instrumentation for jsonwebtoken
// Loads once at startup and wraps jwt.sign / jwt.verify globally.
// This keeps business helpers clean (no per-call spans in jwtHelper.ts).
const api_1 = require("@opentelemetry/api");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
const originalSign = jwt.sign;
const originalVerify = jwt.verify;
// Wrap sign
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
// Wrap verify
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
