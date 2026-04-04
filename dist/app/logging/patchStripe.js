"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const api_1 = require("@opentelemetry/api");
const stripe_1 = require("../../config/stripe");

const sanitize = (value) => {
    try {
        return JSON.parse(JSON.stringify(value, (key, val) => {
            const k = String(key).toLowerCase();
            if (!key)
                return val;
            if (k.includes('secret') || k.includes('client_secret') || k.includes('api_key') || k.includes('password')) {
                return '[redacted]';
            }
            return val;
        }));
    }
    catch (_a) {
        return undefined;
    }
};
const tracer = api_1.trace.getTracer('app');
function wrapMethod(resource, methodName, resourceLabel) {
    if (!resource || typeof resource[methodName] !== 'function')
        return;
    const original = resource[methodName].bind(resource);
    resource[methodName] = function patchedStripeMethod(...args) {
        const opName = `Stripe.${resourceLabel}.${methodName}`;
        return tracer.startActiveSpan(opName, span => {
            const start = Date.now();
            try {

                try {
                    span.setAttribute('stripe.resource', resourceLabel);
                }
                catch (_a) { }
                try {
                    span.setAttribute('stripe.method', methodName);
                }
                catch (_b) { }
                try {
                    span.setAttribute('stripe.request', sanitize(args));
                }
                catch (_c) { }
                const out = original(...args);
                if (out && typeof out.then === 'function') {
                    return out
                        .then(res => {
                        try {
                            span.setAttribute('stripe.ms', Date.now() - start);
                        }
                        catch (_a) { }
                        try {
                            if (res && res.id)
                                span.setAttribute('stripe.result.id', String(res.id));
                        }
                        catch (_b) { }
                        try {
                            span.setAttribute('stripe.status', 'ok');
                        }
                        catch (_c) { }
                        try {
                            span.end();
                        }
                        catch (_d) { }
                        return res;
                    })
                        .catch(err => {
                        try {
                            span.recordException(err);
                        }
                        catch (_a) { }
                        try {
                            span.setAttribute('stripe.ms', Date.now() - start);
                        }
                        catch (_b) { }
                        try {
                            span.setAttribute('stripe.status', 'error');
                        }
                        catch (_c) { }
                        try {
                            span.end();
                        }
                        catch (_d) { }
                        throw err;
                    });
                }

                try {
                    span.setAttribute('stripe.ms', Date.now() - start);
                }
                catch (_d) { }
                try {
                    span.setAttribute('stripe.status', 'ok');
                }
                catch (_e) { }
                try {
                    span.end();
                }
                catch (_f) { }
                return out;
            }
            catch (err) {
                try {
                    span.recordException(err);
                }
                catch (_g) { }
                try {
                    span.end();
                }
                catch (_h) { }
                throw err;
            }
        });
    };
}
try {

    if (!stripe_1.stripe.__otel_stripe_patched) {

        wrapMethod(stripe_1.stripe.accounts, 'create', 'accounts');
        wrapMethod(stripe_1.stripe.accounts, 'retrieve', 'accounts');
        wrapMethod(stripe_1.stripe.accounts, 'del', 'accounts');
        wrapMethod(stripe_1.stripe.accounts, 'list', 'accounts');

        wrapMethod(stripe_1.stripe.accountLinks, 'create', 'accountLinks');

        wrapMethod(stripe_1.stripe.paymentIntents, 'create', 'paymentIntents');
        wrapMethod(stripe_1.stripe.paymentIntents, 'retrieve', 'paymentIntents');
        wrapMethod(stripe_1.stripe.paymentIntents, 'capture', 'paymentIntents');
        wrapMethod(stripe_1.stripe.paymentIntents, 'cancel', 'paymentIntents');

        wrapMethod(stripe_1.stripe.transfers, 'create', 'transfers');

        wrapMethod(stripe_1.stripe.refunds, 'create', 'refunds');

        wrapMethod(stripe_1.stripe.webhookEndpoints, 'list', 'webhookEndpoints');

        if (stripe_1.stripe.webhooks && typeof stripe_1.stripe.webhooks.constructEvent === 'function') {
            const originalConstruct = stripe_1.stripe.webhooks.constructEvent.bind(stripe_1.stripe.webhooks);
            stripe_1.stripe.webhooks.constructEvent = function patchedConstructEvent(...args) {
                return tracer.startActiveSpan('Stripe.webhooks.constructEvent', span => {
                    try {
                        const evt = originalConstruct(...args);
                        try {
                            span.setAttribute('stripe.status', 'ok');
                        }
                        catch (_a) { }
                        try {
                            span.end();
                        }
                        catch (_b) { }
                        return evt;
                    }
                    catch (err) {
                        try {
                            span.recordException(err);
                        }
                        catch (_c) { }
                        try {
                            span.setAttribute('stripe.status', 'error');
                        }
                        catch (_d) { }
                        try {
                            span.end();
                        }
                        catch (_e) { }
                        throw err;
                    }
                });
            };
        }
        stripe_1.stripe.__otel_stripe_patched = true;
    }
}
catch (_a) { }
