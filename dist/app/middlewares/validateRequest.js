"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@opentelemetry/api");
const validateRequest = (schema) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const tracer = api_1.trace.getTracer('app');
    yield tracer.startActiveSpan('Validation', (span) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            span.setAttribute('layer', 'Middleware > Validation');
            span.setAttribute('validation.type', 'zod');
            // Capture callsite to help timeline printer show Source when exception stack lacks paths
            try {
                const cs = new Error().stack || '';
                span.setAttribute('validation.source', cs);
            }
            catch (_a) { }
            span.setAttribute('http.method', req.method);
            span.setAttribute('http.route', (req.route && req.route.path) || req.originalUrl || 'n/a');
            span.addEvent('VALIDATE_START');
            yield schema.parseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
                cookies: req.cookies,
            });
            span.addEvent('VALIDATE_SUCCESS');
            next();
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: 2, message: (error === null || error === void 0 ? void 0 : error.message) || 'Validation failed' });
            span.addEvent('ERROR');
            next(error);
        }
        finally {
            span.end();
        }
    }));
});
exports.default = validateRequest;
