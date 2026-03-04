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
const requestContext_1 = require("./requestContext");
const api_1 = require("@opentelemetry/api");
const auth_service_1 = require("../modules/auth/auth.service");
const user_service_1 = require("../modules/user/user.service");
const notification_service_1 = require("../modules/notification/notification.service");
const auth_controller_1 = require("../modules/auth/auth.controller");
const user_controller_1 = require("../modules/user/user.controller");
const notification_controller_1 = require("../modules/notification/notification.controller");
const wrapService = (serviceName, obj) => {
    Object.keys(obj).forEach(key => {
        const original = obj[key];
        if (typeof original === 'function') {
            obj[key] = (...args) => {
                const label = `${serviceName}.${key}`;
                try {
                    (0, requestContext_1.setServiceLabel)(label);
                }
                catch (_a) { }
                const tracer = api_1.trace.getTracer('app');
                return tracer.startActiveSpan(`Service: ${label}`, (span) => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        const out = original(...args);
                        if (out && typeof out.then === 'function') {
                            return yield out;
                        }
                        return out;
                    }
                    catch (err) {
                        span.recordException(err);
                        span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err === null || err === void 0 ? void 0 : err.message });
                        throw err;
                    }
                    finally {
                        span.end();
                    }
                }));
            };
        }
    });
};
wrapService('AuthService', auth_service_1.AuthService);
wrapService('UserService', user_service_1.UserService);
wrapService('NotificationService', notification_service_1.NotificationService);
// Add more services here to auto-label without touching their files
// e.g., import { PaymentService } from '../modules/payment/payment.service';
// wrapService('PaymentService', PaymentService);
const wrapController = (controllerName, obj) => {
    Object.keys(obj).forEach(key => {
        const original = obj[key];
        if (typeof original === 'function') {
            obj[key] = (...args) => {
                const label = `${controllerName}.${key}`;
                try {
                    (0, requestContext_1.setControllerLabel)(label);
                }
                catch (_a) { }
                const tracer = api_1.trace.getTracer('app');
                return tracer.startActiveSpan(`Controller: ${label}`, (span) => __awaiter(void 0, void 0, void 0, function* () {
                    try {
                        const out = original(...args);
                        if (out && typeof out.then === 'function') {
                            return yield out;
                        }
                        return out;
                    }
                    catch (err) {
                        span.recordException(err);
                        span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: err === null || err === void 0 ? void 0 : err.message });
                        throw err;
                    }
                    finally {
                        span.end();
                    }
                }));
            };
        }
    });
};
wrapController('AuthController', auth_controller_1.AuthController);
wrapController('UserController', user_controller_1.UserController);
wrapController('NotificationController', notification_controller_1.NotificationController);
