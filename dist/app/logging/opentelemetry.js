"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimelineTotal = exports.timelineTotalsStore = void 0;

let NodeSDK;
let Resource;
let SemanticResourceAttributes;
let getNodeAutoInstrumentations;
try {

    NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
    Resource = require('@opentelemetry/resources').Resource;

    SemanticResourceAttributes = require('@opentelemetry/semantic-conventions');
    getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
}
catch (_c) { }
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const core_1 = require("@opentelemetry/core");
const api_1 = require("@opentelemetry/api");
const logger_1 = require("../../shared/logger");

exports.timelineTotalsStore = new Map();
const getTimelineTotal = (traceId) => exports.timelineTotalsStore.get(traceId);
exports.getTimelineTotal = getTimelineTotal;

try {
    api_1.diag.setLogger(new api_1.DiagConsoleLogger(), api_1.DiagLogLevel.ERROR);
}
catch (_d) { }

class TimelineConsoleExporter {
    constructor() {
        this.traces = new Map();
    }
    export(spans, resultCallback) {
        try {
            for (const span of spans) {
                const tid = span.spanContext().traceId;
                const arr = this.traces.get(tid) || [];
                arr.push(span);
                this.traces.set(tid, arr);

                const isHttpServer = span.kind === 1  &&
                    (span.name.startsWith('HTTP') || this.hasHttpAttributes(span));
                if (isHttpServer) {
                    this.printTimeline(tid);

                    this.traces.delete(tid);
                }
            }
            resultCallback({ code: core_1.ExportResultCode.SUCCESS });
        }
        catch (err) {
            resultCallback({ code: core_1.ExportResultCode.FAILED });
        }
    }
    shutdown() {
        this.traces.clear();
        return Promise.resolve();
    }
    hasHttpAttributes(span) {
        const attrs = span.attributes || {};
        return Boolean(attrs['http.method'] || attrs['http.route'] || attrs['http.target']);
    }
    fmtMs(ms) {
        return `${ms}ms`;
    }
    printTimeline(traceId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const spans = this.traces.get(traceId) || [];
        if (!spans.length)
            return;
        const byId = new Map();
        const children = new Map();
        for (const s of spans) {
            byId.set(s.spanContext().spanId, s);

            const pid = s.parentSpanId || '__root__';
            const arr = children.get(pid) || [];
            arr.push(s);
            children.set(pid, arr);
        }

        const httpRoots = spans.filter(s => s.kind === 1 && (s.name.startsWith('HTTP') || s.attributes && ('http.method' in s.attributes)));
        const root = httpRoots.sort((a, b) => (a.startTime[0] - b.startTime[0]) || (a.startTime[1] - b.startTime[1]))[0] || spans[0];
        const startNs = root.startTime[0] * 1e9 + root.startTime[1];
        const endNs = root.endTime[0] * 1e9 + root.endTime[1];
        const totalMs = Math.max(0, Math.round((endNs - startNs) / 1e6));

        try {
            exports.timelineTotalsStore.set(traceId, totalMs);
        }
        catch (_m) { }
        const lines = [];
        lines.push(`⏱️  REQUEST TIMELINE (Total: ${totalMs}ms)`);

        const sev = (ms) => (ms >= 300 ? '🐌' : ms >= 50 ? '⚠️' : '✅');
        const durDisp = (ms) => {
            if (ms <= 0)
                return '<1ms';
            return `${ms}ms`;
        };
        const spanKey = (s) => `${s.name}|${s.startTime[0]}:${s.startTime[1]}|${s.endTime[0]}:${s.endTime[1]}`;
        const printed = new Set();
        const skippedIds = new Set();
        const genericSeen = new Set();

        const round = (ns) => Math.round(ns / 1e6);
        const dbLike = spans.filter(s => s.name.startsWith('🗄️') || s.name.startsWith('mongoose.') || s.name.startsWith('mongodb.'));
        const parseDbKey = (s) => {
            var _a;
            try {
                if (s.name.startsWith('🗄️')) {
                    const label = (_a = s.name.split('Database:')[1]) === null || _a === void 0 ? void 0 : _a.trim();
                    if (!label)
                        return undefined;
                    const [model, op] = label.split('.');
                    const startMs = round((s.startTime[0] * 1e9 + s.startTime[1]) - startNs);
                    const bin = Math.floor(startMs / 20) * 20;
                    return `${model || 'unknown'}|${op || 'op'}|${bin}`;
                }
                if (s.name.startsWith('mongoose.')) {
                    const label = s.name.slice('mongoose.'.length);
                    const [model, op] = label.split('.');
                    const startMs = round((s.startTime[0] * 1e9 + s.startTime[1]) - startNs);
                    const bin = Math.floor(startMs / 20) * 20;
                    return `${model || 'unknown'}|${op || 'op'}|${bin}`;
                }

                return undefined;
            }
            catch (_b) {
                return undefined;
            }
        };
        const bestByKey = new Map();
        for (const s of dbLike) {
            const key = parseDbKey(s);
            if (!key)
                continue;
            const curr = bestByKey.get(key);
            const dur = (s.endTime[0] * 1e9 + s.endTime[1]) - (s.startTime[0] * 1e9 + s.startTime[1]);
            if (!curr) {
                bestByKey.set(key, s);
            }
            else {
                const currDur = (curr.endTime[0] * 1e9 + curr.endTime[1]) - (curr.startTime[0] * 1e9 + curr.startTime[1]);
                const almostEqual = Math.abs(dur - currDur) <= 2e6;
                const preferDbLabel = s.name.startsWith('🗄️') && !curr.name.startsWith('🗄️');
                if (dur > currDur || (almostEqual && preferDbLabel))
                    bestByKey.set(key, s);
            }
        }

        for (const s of dbLike) {
            const key = parseDbKey(s);
            if (!key)
                continue;
            const best = bestByKey.get(key);
            if (best && best.spanContext().spanId !== s.spanContext().spanId) {
                skippedIds.add(s.spanContext().spanId);
            }
        }
        const sortChildren = (arr) => arr.slice().sort((a, b) => (a.startTime[0] - b.startTime[0]) || (a.startTime[1] - b.startTime[1]));
        const classifyLayer = (raw) => {
            const r = raw.toLowerCase();
            if (r.startsWith('controller:'))
                return 'Controller';
            if (r.startsWith('service:'))
                return 'Service';
            if (r.startsWith('http') || r.includes('response send') || r.startsWith('stripe.'))
                return 'Network';
            if (r.includes('validate'))
                return 'Middleware > Validation';
            if (r.includes('middleware') || r.includes('router') || r.includes('servestatic'))
                return 'Middleware';
            if (r.includes('cache'))
                return 'Middleware > Cache';
            if (r.startsWith('🗄️') || r.startsWith('mongoose.') || r.startsWith('mongodb.'))
                return 'Database';
            if (r.startsWith('jwt') || r.includes('auth'))
                return 'Security';
            return 'Execution';
        };
        const extractSourceFromStack = (stack) => {
            if (!stack)
                return undefined;
            const text = String(stack);
            const lines = text.split('\n');
            const regex = /([A-Za-z0-9_\-\/\\\.]+\.(ts|tsx|js|jsx):\d+(?::\d+)?)/;
            for (const ln of lines) {
                const m = ln.match(regex);
                if (m && m[1])
                    return m[1];
            }
            const m2 = text.match(regex);
            return m2 ? m2[1] : undefined;
        };
        const printNode = (s, indent) => {
            var _a, _b, _c, _d, _e, _f, _g;

            if (skippedIds.has(s.spanContext().spanId))
                return;

            if (s.name.startsWith('mongodb.') || s.name.startsWith('mongoose.')) {
                const key = parseDbKey(s);
                if (key) {
                    const best = bestByKey.get(key);
                    if (best && best.name.startsWith('🗄️') && best.spanContext().spanId !== s.spanContext().spanId) {
                        return;
                    }
                }
            }
            const key = spanKey(s);
            if (printed.has(key))
                return;
            printed.add(key);
            const startMs = Math.max(0, Math.round(((s.startTime[0] * 1e9 + s.startTime[1]) - startNs) / 1e6));
            const endMs = Math.max(0, Math.round(((s.endTime[0] * 1e9 + s.endTime[1]) - startNs) / 1e6));

            const gkey = `${s.name}|${Math.floor(startMs / 100)}`;
            if (genericSeen.has(gkey) && !s.name.startsWith('🗄️'))
                return;
            genericSeen.add(gkey);
            const durMs = Math.max(0, Math.round(((s.endTime[0] * 1e9 + s.endTime[1]) - (s.startTime[0] * 1e9 + s.startTime[1])) / 1e6));
            const statusErr = ((_a = s.status) === null || _a === void 0 ? void 0 : _a.code) === 2;
            const attrs = s.attributes || {};
            const label = s.name
                .replace(/^Service: /, '⚙️  Service: ')
                .replace(/^Controller: /, '🎮 Controller: ')
                .replace(/^Cache: /, '💾 Cache: ')
                .replace(/^Response Serialization$/, '🧩 Response Serialization')
                .replace(/^🌐 HTTP Response Send$/, '🌐 Network: HTTP Response Send')
                .replace(/^Stripe\./, '💳 Stripe: ');

            const raw = s.name;
            let startTag;
            let endTag;
            let singleTag;
            if (raw.startsWith('Controller: ')) {
                startTag = 'START';
                endTag = 'COMPLETE';
            }
            else if (raw.startsWith('Service: ')) {
                startTag = 'CALL';
                endTag = 'RETURN';
            }
            else if (raw.startsWith('Stripe.')) {

                startTag = 'CALL';
                endTag = 'RESULT';
            }
            else if (raw.startsWith('🗄️') || raw.startsWith('mongoose.') || raw.startsWith('mongodb.')) {
                startTag = 'QUERY_START';
                endTag = 'QUERY_COMPLETE';
            }
            else if (raw === '🌐 HTTP Response Send') {
                singleTag = 'SEND';
            }
            else if (raw.toLowerCase().includes('validate')) {

                startTag = 'VALIDATE_START';
                endTag = 'VALIDATE_COMPLETE';
            }
            else if (raw.startsWith('HTTP') && raw !== '🌐 HTTP Response Send') {
                startTag = 'REQUEST';
                endTag = 'RESPONSE';
            }
            else if (raw.toLowerCase().includes('cache')) {
                singleTag = 'CACHE';
            }
            else if (durMs > 50) {
                startTag = 'EXECUTE_START';
                endTag = 'EXECUTE_COMPLETE';
            }
            else {
                singleTag = 'EXECUTE';
            }

            const evts = (s.events || []);
            const exc = evts.find(e => String(e.name).toLowerCase().includes('exception'));
            const isValidation = raw.toLowerCase().includes('validate');
            const isErrorHandler = raw === 'Error Handler';
            if (singleTag) {
                lines.push(`${indent}├─ [${startMs}ms] ${label} [${singleTag}] - ${durDisp(durMs)} ${statusErr ? '⚠️' : sev(durMs)}`);
            }
            else {

                lines.push(`${indent}├─ [${startMs}ms] ${label} [${startTag}]`);

                if (!(isValidation && (statusErr || !!exc))) {
                    lines.push(`${indent}├─ [${endMs}ms] ${label} [${endTag}] - ${durDisp(durMs)} ${statusErr ? '⚠️' : sev(durMs)}`);
                }
            }

            try {
                if (exc) {
                    let etype = ((_b = exc.attributes) === null || _b === void 0 ? void 0 : _b['exception.type']) || 'Error';

                    if (etype === 'ZodError')
                        etype = 'ValidationError';
                    const emsg = ((_c = exc.attributes) === null || _c === void 0 ? void 0 : _c['exception.message']) || ((_d = s.status) === null || _d === void 0 ? void 0 : _d.message) || 'An error occurred';
                    const estack = (_e = exc.attributes) === null || _e === void 0 ? void 0 : _e['exception.stacktrace'];
                    let src = extractSourceFromStack(estack);
                    if (!src) {
                        const vsrc = attrs['validation.source'];
                        src = extractSourceFromStack(typeof vsrc === 'string' ? vsrc : undefined);
                    }
                    const eNs = (((_f = exc.time) === null || _f === void 0 ? void 0 : _f[0]) || s.endTime[0]) * 1e9 + (((_g = exc.time) === null || _g === void 0 ? void 0 : _g[1]) || s.endTime[1]);
                    const eMs = Math.max(0, Math.round((eNs - startNs) / 1e6));
                    const layer = attrs['layer'] || classifyLayer(raw);

                    if (!isErrorHandler) {
                        lines.push(`${indent}├─ [${eMs}ms] ❌ ${label.replace(/^.*?:\s*/, '')} [ERROR] - ${durDisp(durMs)} 🔴`);
                        lines.push(`${indent}│  🚨 ${etype}: ${emsg}`);
                        lines.push(`${indent}│  📍 Layer: ${layer}`);
                        if (src)
                            lines.push(`${indent}│  📂 Source: ${src}`);
                        if (estack) {
                            const firstLine = String(estack).split('\n')[0];
                            lines.push(`${indent}│  🔍 Stack: ${firstLine}`);
                        }
                    }
                }
            }
            catch (_h) { }

            if (s.name.startsWith('🗄️')) {
                const attrs = s.attributes || {};
                const indexUsed = attrs['db.index_used'];
                const docsExamined = attrs['db.docs_examined'];
                const nReturned = attrs['db.n_returned'];
                const efficiency = attrs['db.scan_efficiency'];
                const executionStage = attrs['db.execution_stage'];
                const suggestion = attrs['db.index_suggestion'];

                if (executionStage || indexUsed) {
                    const isCollscan = String(executionStage || '').toUpperCase().includes('COLLSCAN') || indexUsed === 'NO_INDEX';
                    lines.push(`${indent}│  [${endMs}ms] 📊 Index: ${isCollscan ? 'COLLSCAN ⚠️' : (indexUsed ? `${indexUsed} ✅` : 'n/a')}`);
                }
                if (typeof docsExamined === 'number' || typeof nReturned === 'number') {
                    lines.push(`${indent}│  [${endMs}ms] 📈 Scanned: ${typeof docsExamined === 'number' ? docsExamined : 'n/a'} | Returned: ${typeof nReturned === 'number' ? nReturned : 'n/a'}`);
                }
                if (efficiency)
                    lines.push(`${indent}│  [${endMs}ms] 🔍 Efficiency: ${efficiency}`);
                if (executionStage)
                    lines.push(`${indent}│  [${endMs}ms] 🧭 Stage: ${executionStage}`);
                if (suggestion)
                    lines.push(`${indent}│  [${endMs}ms] 💡 Suggestion: ${suggestion}`);
            }
            const kids = sortChildren(children.get(s.spanContext().spanId || '') || []);
            const nextIndent = `${indent}│  `;
            for (const c of kids)
                printNode(c, nextIndent);

            if (isErrorHandler) {
                lines.push(`${indent}│  📝 Formatted error response`);
            }
        };

        const rootChildren = sortChildren(children.get(root.spanContext().spanId) || []);
        const middlewareSpans = rootChildren.filter(s => {
            const n = s.name.toLowerCase();
            return n.includes('middleware') || n.includes('router') || n.includes('servestatic') || n.includes('logger');
        });
        if (middlewareSpans.length) {
            const mwStartNs = Math.min(...middlewareSpans.map(s => s.startTime[0] * 1e9 + s.startTime[1]));
            const mwEndNs = Math.max(...middlewareSpans.map(s => s.endTime[0] * 1e9 + s.endTime[1]));
            const mwDurMs = Math.max(0, Math.round((mwEndNs - mwStartNs) / 1e6));
            const mwStartMs = Math.max(0, Math.round((mwStartNs - startNs) / 1e6));
            lines.push(`├─ [${mwStartMs}ms] 🔧 Middleware Stack - ${durDisp(mwDurMs)}`);

            const top3 = middlewareSpans
                .map(s => ({ s, dur: Math.max(0, Math.round(((s.endTime[0] * 1e9 + s.endTime[1]) - (s.startTime[0] * 1e9 + s.startTime[1])) / 1e6)) }))
                .sort((a, b) => b.dur - a.dur)
                .slice(0, 3);
            for (const { s, dur } of top3) {
                const name = s.name.replace(/^Middleware\s*/i, '').trim() || s.name;
                const sStartMs = Math.max(0, Math.round(((s.startTime[0] * 1e9 + s.startTime[1]) - startNs) / 1e6));
                const label = name.padEnd(26, '.');
                lines.push(`│  ├─ [${sStartMs}ms] ${label} ${durDisp(dur)}`);
            }

            for (const s of middlewareSpans) {
                const name = String(s.name).toLowerCase();
                if (!name.includes('validate')) {
                    skippedIds.add(s.spanContext().spanId);
                }
            }
        }

        const top = sortChildren(children.get(root.spanContext().spanId) || []).filter(s => !skippedIds.has(s.spanContext().spanId));
        for (const s of top)
            printNode(s, '');

        const resp = spans.filter(s => s.name === '🌐 HTTP Response Send');
        for (const r of resp)
            printNode(r, '');

        const httpStatus = (_a = root.attributes) === null || _a === void 0 ? void 0 : _a['http.status_code'];
        const hasErrorSpan = spans.some(s => { var _a; return ((_a = s.status) === null || _a === void 0 ? void 0 : _a.code) === 2 || ((s.events || []).some((e) => String(e.name).toLowerCase().includes('exception'))); });
        if (hasErrorSpan || (typeof httpStatus === 'number' && httpStatus >= 400)) {
            lines.push(`└─ [${totalMs}ms] ❌ Request Failed with Error (Total: ${totalMs}ms)`);
        }
        else {
            lines.push(`└─ [${totalMs}ms] ✅ Request Completed Successfully (Total: ${totalMs}ms)`);
        }

        if (hasErrorSpan || (typeof httpStatus === 'number' && httpStatus >= 400)) {
            try {

                let best;
                for (const s of spans) {
                    const evts = (s.events || []);
                    for (const e of evts) {
                        if (!String(e.name).toLowerCase().includes('exception'))
                            continue;
                        if (!best)
                            best = { e, s };
                        else {
                            const currNs = best.e.time[0] * 1e9 + best.e.time[1];
                            const eNs = e.time[0] * 1e9 + e.time[1];
                            if (eNs < currNs)
                                best = { e, s };
                        }
                    }
                }
                const statusText = typeof httpStatus === 'number' ? `${httpStatus}` : 'Error';
                lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                lines.push('🚨 ERROR SUMMARY');
                lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                lines.push(`❌ Status: ${typeof httpStatus === 'number' ? httpStatus >= 400 ? `${httpStatus} Bad Request` : String(httpStatus) : 'Error'}`);
                if (best) {
                    let etype = ((_b = best.e.attributes) === null || _b === void 0 ? void 0 : _b['exception.type']) || 'Error';
                    if (etype === 'ZodError')
                        etype = 'ValidationError';
                    const emsgRaw = ((_c = best.e.attributes) === null || _c === void 0 ? void 0 : _c['exception.message']) || ((_d = best.s.status) === null || _d === void 0 ? void 0 : _d.message) || 'An error occurred';
                    const estack = (_e = best.e.attributes) === null || _e === void 0 ? void 0 : _e['exception.stacktrace'];
                    let src = extractSourceFromStack(estack);
                    if (!src) {
                        const vsrc = (_f = best.s.attributes) === null || _f === void 0 ? void 0 : _f['validation.source'];
                        src = extractSourceFromStack(typeof vsrc === 'string' ? vsrc : undefined);
                    }
                    const eNs = best.e.time[0] * 1e9 + best.e.time[1];
                    const eMs = Math.max(0, Math.round((eNs - startNs) / 1e6));
                    const layerAttr = (_g = best.s.attributes) === null || _g === void 0 ? void 0 : _g['layer'];
                    const layer = layerAttr || classifyLayer(best.s.name);
                    lines.push(`🏷️  Type: ${etype}`);
                    lines.push(`📍 Layer: ${layer}`);
                    lines.push(`⏱️  Failed at: ${eMs}ms (${totalMs > 0 ? Math.round((eMs / totalMs) * 1000) / 10 : 0}% into request)`);
                    if (src)
                        lines.push(`📂 Source: ${src}`);

                    let formatted = false;
                    if (etype === 'ValidationError') {
                        try {
                            const parsed = typeof emsgRaw === 'string' && (emsgRaw.trim().startsWith('[') || emsgRaw.trim().startsWith('{'))
                                ? JSON.parse(emsgRaw)
                                : undefined;
                            const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed === null || parsed === void 0 ? void 0 : parsed.issues) ? parsed.issues : undefined);
                            if (items && items.length) {
                                lines.push(`💬 Message: Validation failed`);
                                lines.push(`📋 Missing fields:`);
                                for (const it of items) {
                                    const pathArr = it.path || [];
                                    const field = Array.isArray(pathArr) && pathArr.length ? String(pathArr[pathArr.length - 1]) : (it.path || 'unknown');
                                    const expected = (_j = (_h = it.expected) !== null && _h !== void 0 ? _h : it.expected_type) !== null && _j !== void 0 ? _j : 'n/a';
                                    const received = (_l = (_k = it.received) !== null && _k !== void 0 ? _k : it.received_type) !== null && _l !== void 0 ? _l : 'n/a';
                                    const msg = it.message || 'Invalid value';
                                    lines.push(`   • ${field}: ${msg} (expected: ${expected}, got: ${received})`);
                                }
                                formatted = true;
                            }
                        }
                        catch (_o) { }
                    }
                    if (!formatted) {
                        lines.push(`💬 Message: ${emsgRaw}`);
                    }
                }
            }
            catch (_p) { }
        }

        const sumDur = (arr) => arr.reduce((acc, s) => acc + Math.max(0, Math.round(((s.endTime[0] * 1e9 + s.endTime[1]) - (s.startTime[0] * 1e9 + s.startTime[1])) / 1e6)), 0);
        const dbMs = Array.from(bestByKey.values()).reduce((acc, s) => acc + Math.max(0, Math.round(((s.endTime[0] * 1e9 + s.endTime[1]) - (s.startTime[0] * 1e9 + s.startTime[1])) / 1e6)), 0);
        const serviceMs = sumDur(spans.filter(s => s.name.startsWith('Service: ')));

        const networkMs = sumDur(spans.filter(s => s.name === '🌐 HTTP Response Send' ||
            s.name.startsWith('HTTP') ||
            s.name.startsWith('Stripe.')));
        const middlewareMs = middlewareSpans.length
            ? Math.max(0, Math.round((Math.max(...middlewareSpans.map(s => s.endTime[0] * 1e9 + s.endTime[1])) - Math.min(...middlewareSpans.map(s => s.startTime[0] * 1e9 + s.startTime[1]))) / 1e6))
            : 0;

        const usedMs = serviceMs + networkMs + middlewareMs;
        const otherMs = Math.max(0, totalMs - usedMs);
        const pct = (ms) => totalMs > 0 ? Math.round((ms / totalMs) * 1000) / 10 : 0;
        const bar = (ms) => {
            if (totalMs <= 0 || ms <= 0)
                return '';
            const blocks = Math.floor((ms / totalMs) * 40);
            if (blocks <= 0)
                return '▌';
            return '█'.repeat(blocks);
        };
        lines.push('📊 LATENCY BREAKDOWN');
        lines.push(` Service:     ${bar(serviceMs)} ${pct(serviceMs)}% (${serviceMs}ms) ${sev(serviceMs)}`);
        const dbCount = Array.from(bestByKey.values()).length;
        if (dbMs > 0)
            lines.push(`   └─ Database: ${dbMs}ms across ${dbCount} ${dbCount === 1 ? 'query' : 'queries'}`);
        const bcryptMs = sumDur(spans.filter(s => s.name.toLowerCase().includes('bcrypt')));
        if (bcryptMs > 0)
            lines.push(`   └─ bcrypt: ${bcryptMs}ms`);
        const tcpMs = sumDur(spans.filter(s => {
            const n = s.name.toLowerCase();
            return n.includes('tcp') || n.includes('socket') || n.includes('net');
        }));
        if (tcpMs > 0)
            lines.push(`   └─ tcp: ${tcpMs}ms`);
        lines.push(` Middleware:  ${bar(middlewareMs)} ${pct(middlewareMs)}% (${middlewareMs}ms)`);
        lines.push(` Network:     ${bar(networkMs)} ${pct(networkMs)}% (${networkMs}ms)`);
        lines.push(` Other:       ${bar(otherMs)} ${pct(otherMs)}% (${otherMs}ms)`);
        try {
            logger_1.logger.info(lines.join('\n'));
        }
        catch (_q) {

            console.log(lines.join('\n'));
        }
    }
}

if (NodeSDK && Resource && SemanticResourceAttributes && getNodeAutoInstrumentations) {
    const sdk = new NodeSDK({
        resource: new Resource({

            [SemanticResourceAttributes.ATTR_SERVICE_NAME || 'service.name']: process.env.OTEL_SERVICE_NAME || 'my-service',
        }),
        instrumentations: [getNodeAutoInstrumentations()],
        spanProcessor: new sdk_trace_base_1.SimpleSpanProcessor(new TimelineConsoleExporter()),
    });

    try {
        const startResult = (_b = (_a = sdk).start) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (startResult && typeof startResult.catch === 'function') {
            startResult.catch((err) => {
                try {
                    logger_1.logger.error('OpenTelemetry init failed', err);
                }
                catch (_a) {

                    console.error('OpenTelemetry init failed', err);
                }
            });
        }
    }
    catch (err) {
        try {
            logger_1.logger.error('OpenTelemetry init failed', err);
        }
        catch (_e) {

            console.error('OpenTelemetry init failed', err);
        }
    }
}
else {
    try {
        logger_1.logger.info('OpenTelemetry SDK modules not found; skipping auto-instrumentation initialization');
    }
    catch (_f) {

        console.info('OpenTelemetry SDK modules not found; skipping auto-instrumentation initialization');
    }
}
