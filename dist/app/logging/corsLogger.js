"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeLogCors = exports.isOriginAllowed = exports.allowedOrigins = void 0;
const logger_1 = require("../../shared/logger");

exports.allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5174',
    'https://task-titans-admin-orcin.vercel.app',
    'http://localhost:5173',
    'http://localhost:5175',
    'https://task-titans-six.vercel.app',
    'https://task-titans-admin.vercel.app',
    'https://tier-elected-proc-cumulative.trycloudflare.com',
    'https://directory-supplements-adapter-designs.trycloudflare.com',

    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://localhost:3002',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',

    'http://localhost:5000',
    'http://localhost:5001',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:5001',
    'http://10.10.7.33:5001',

    'http://localhost:5003',
    'http://127.0.0.1:5003',
    'http://localhost:5005',
    'http://127.0.0.1:5005',

    'https://lms-frontend-dun-three.vercel.app',

    'http://195.35.6.13:3000',
    'http://195.35.6.13:5005',
    'https://195.35.6.13:3000',
    'https://195.35.6.13:5005',
];

const CORS_DEBUG = String(process.env.CORS_DEBUG || '').toLowerCase() === 'true' ||
    process.env.CORS_DEBUG === '1';
const corsLogMap = new Map();
const CORS_LOG_WINDOW_MS = 60000;
const isOriginAllowed = (origin) => {
    if (!origin)
        return true;
    return exports.allowedOrigins.includes(origin);
};
exports.isOriginAllowed = isOriginAllowed;

const maybeLogCors = (origin, allowed) => {
    if (!CORS_DEBUG)
        return;
    const key = origin || 'no-origin';
    const now = Date.now();
    const last = corsLogMap.get(key) || 0;
    if (now - last < CORS_LOG_WINDOW_MS)
        return;
    corsLogMap.set(key, now);
    if (!origin) {
        logger_1.logger.info('CORS allow: request without Origin header (Postman/mobile/native)');
        return;
    }
    if (allowed)
        logger_1.logger.info(`CORS allow: ${origin}`);
    else
        logger_1.errorLogger.warn(`CORS block: ${origin}`);
};
exports.maybeLogCors = maybeLogCors;
