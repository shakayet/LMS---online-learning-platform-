
import { trace } from '@opentelemetry/api';
import { stripe } from '../../config/stripe';

const sanitize = (value: any): any => {
  try {
    return JSON.parse(
      JSON.stringify(value, (key, val) => {
        const k = String(key).toLowerCase();
        if (!key) return val;
        if (k.includes('secret') || k.includes('client_secret') || k.includes('api_key') || k.includes('password')) {
          return '[redacted]';
        }
        return val;
      })
    );
  } catch {
    return undefined;
  }
};

const tracer = trace.getTracer('app');

function wrapMethod(resource: any, methodName: string, resourceLabel: string) {
  if (!resource || typeof resource[methodName] !== 'function') return;
  const original = resource[methodName].bind(resource);
  resource[methodName] = function patchedStripeMethod(...args: any[]) {
    const opName = `Stripe.${resourceLabel}.${methodName}`;
    return tracer.startActiveSpan(opName, span => {
      const start = Date.now();
      try {

        try { span.setAttribute('stripe.resource', resourceLabel); } catch {}
        try { span.setAttribute('stripe.method', methodName); } catch {}
        try { span.setAttribute('stripe.request', sanitize(args)); } catch {}

        const out = original(...args);
        if (out && typeof out.then === 'function') {
          return (out as Promise<any>)
            .then(res => {
              try { span.setAttribute('stripe.ms', Date.now() - start); } catch {}
              try { if (res && res.id) span.setAttribute('stripe.result.id', String(res.id)); } catch {}
              try { span.setAttribute('stripe.status', 'ok'); } catch {}
              try { span.end(); } catch {}
              return res;
            })
            .catch(err => {
              try { span.recordException(err as any); } catch {}
              try { span.setAttribute('stripe.ms', Date.now() - start); } catch {}
              try { span.setAttribute('stripe.status', 'error'); } catch {}
              try { span.end(); } catch {}
              throw err;
            });
        }

        try { span.setAttribute('stripe.ms', Date.now() - start); } catch {}
        try { span.setAttribute('stripe.status', 'ok'); } catch {}
        try { span.end(); } catch {}
        return out;
      } catch (err) {
        try { span.recordException(err as any); } catch {}
        try { span.end(); } catch {}
        throw err;
      }
    });
  };
}

try {

  if (!(stripe as any).__otel_stripe_patched) {

    wrapMethod((stripe as any).accounts, 'create', 'accounts');
    wrapMethod((stripe as any).accounts, 'retrieve', 'accounts');
    wrapMethod((stripe as any).accounts, 'del', 'accounts');
    wrapMethod((stripe as any).accounts, 'list', 'accounts');

    wrapMethod((stripe as any).accountLinks, 'create', 'accountLinks');

    wrapMethod((stripe as any).paymentIntents, 'create', 'paymentIntents');
    wrapMethod((stripe as any).paymentIntents, 'retrieve', 'paymentIntents');
    wrapMethod((stripe as any).paymentIntents, 'capture', 'paymentIntents');
    wrapMethod((stripe as any).paymentIntents, 'cancel', 'paymentIntents');

    wrapMethod((stripe as any).transfers, 'create', 'transfers');

    wrapMethod((stripe as any).refunds, 'create', 'refunds');

    wrapMethod((stripe as any).webhookEndpoints, 'list', 'webhookEndpoints');

    if ((stripe as any).webhooks && typeof (stripe as any).webhooks.constructEvent === 'function') {
      const originalConstruct = (stripe as any).webhooks.constructEvent.bind((stripe as any).webhooks);
      (stripe as any).webhooks.constructEvent = function patchedConstructEvent(...args: any[]) {
        return tracer.startActiveSpan('Stripe.webhooks.constructEvent', span => {
          try {
            const evt = originalConstruct(...args);
            try { span.setAttribute('stripe.status', 'ok'); } catch {}
            try { span.end(); } catch {}
            return evt;
          } catch (err) {
            try { span.recordException(err as any); } catch {}
            try { span.setAttribute('stripe.status', 'error'); } catch {}
            try { span.end(); } catch {}
            throw err;
          }
        });
      };
    }

    (stripe as any).__otel_stripe_patched = true;
  }
} catch {}

export {};