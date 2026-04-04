"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientInfo = void 0;
const ua_parser_js_1 = require("ua-parser-js");

const asToken = (v) => {
    if (!v)
        return undefined;
    const s = String(v).trim();
    if (!s)
        return undefined;

    return s.replace(/^"|"$/g, '');
};

const windowsLabelFromPlatformVersion = (v) => {
    if (!v)
        return undefined;
    const major = parseInt(String(v).split('.')[0], 10);
    if (!Number.isFinite(major))
        return undefined;
    return major >= 13 ? 'Windows 11' : 'Windows 10';
};
const clientInfo = (req, res, next) => {
    const ua = String(req.headers['user-agent'] || '');
    const chUa = req.headers['sec-ch-ua'];
    const chPlatform = req.headers['sec-ch-ua-platform'];
    const chPlatformVersion = req.headers['sec-ch-ua-platform-version'];
    const chMobile = req.headers['sec-ch-ua-mobile'];
    const chModel = req.headers['sec-ch-ua-model'];
    const chArch = req.headers['sec-ch-ua-arch'];
    const chBitness = req.headers['sec-ch-ua-bitness'];
    const parsed = new ua_parser_js_1.UAParser(ua).getResult();
    const os = asToken(chPlatform) || parsed.os.name || 'Unknown';
    const osVersion = asToken(chPlatformVersion) || parsed.os.version || undefined;
    const deviceModel = asToken(chModel) || parsed.device.model || undefined;
    const osFriendly = os === 'Windows' ? windowsLabelFromPlatformVersion(osVersion) || 'Windows' : os;

    const mobileFlag = typeof chMobile === 'string' ? chMobile : undefined;
    const deviceType = mobileFlag === '?1' ? 'mobile' : mobileFlag === '?0' ? 'desktop' : parsed.device.type || 'desktop';
    const browser = parsed.browser.name || undefined;
    const browserVersion = parsed.browser.version || undefined;
    res.locals.clientInfo = {
        os,
        osFriendly,
        osVersion,
        deviceType,
        deviceModel,
        arch: asToken(chArch),
        bitness: asToken(chBitness),
        browser,
        browserVersion,
        ua,
        chUa: typeof chUa === 'string' ? chUa : undefined,
    };
    next();
};
exports.clientInfo = clientInfo;
