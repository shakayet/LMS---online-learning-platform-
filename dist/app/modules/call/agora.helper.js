"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdToAgoraUid = exports.generateSessionChannelName = exports.generateChannelName = exports.generateRtcToken = void 0;
const agora_token_1 = require("agora-token");
const crypto_1 = require("crypto");
const config_1 = __importDefault(require("../../../config"));

const generateRtcToken = (channelName, uid, role = 'publisher', tokenExpirationInSeconds = 3600, privilegeExpirationInSeconds = 3600) => {
    const appId = config_1.default.agora.appId;
    const appCertificate = config_1.default.agora.appCertificate;
    const rtcRole = role === 'publisher' ? agora_token_1.RtcRole.PUBLISHER : agora_token_1.RtcRole.SUBSCRIBER;
    return agora_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, rtcRole, tokenExpirationInSeconds, privilegeExpirationInSeconds);
};
exports.generateRtcToken = generateRtcToken;

const generateChannelName = () => {
    return `call_${(0, crypto_1.randomUUID)().replace(/-/g, '').substring(0, 16)}`;
};
exports.generateChannelName = generateChannelName;

const generateSessionChannelName = (sessionId) => {
    return `session_${sessionId}`;
};
exports.generateSessionChannelName = generateSessionChannelName;

const userIdToAgoraUid = (userId) => {

    const hex = userId.slice(-8);
    return parseInt(hex, 16) % 2147483647;
};
exports.userIdToAgoraUid = userIdToAgoraUid;
