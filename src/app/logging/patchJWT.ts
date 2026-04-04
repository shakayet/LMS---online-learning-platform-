
import { trace } from '@opentelemetry/api';

const jwt = require('jsonwebtoken');

const originalSign = jwt.sign;
const originalVerify = jwt.verify;

jwt.sign = function patchedJwtSign(...args: any[]) {
  const tracer = trace.getTracer('app');
  return tracer.startActiveSpan('JWT.sign', span => {
    try {
      return originalSign.apply(jwt, args);
    } catch (err) {
      try { span.recordException(err as any); } catch {}
      throw err;
    } finally {
      try { span.end(); } catch {}
    }
  });
};

jwt.verify = function patchedJwtVerify(...args: any[]) {
  const tracer = trace.getTracer('app');
  return tracer.startActiveSpan('JWT.verify', span => {
    try {
      return originalVerify.apply(jwt, args);
    } catch (err) {
      try { span.recordException(err as any); } catch {}
      throw err;
    } finally {
      try { span.end(); } catch {}
    }
  });
};

export {};