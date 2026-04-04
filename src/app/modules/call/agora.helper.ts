import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { randomUUID } from 'crypto';
import config from '../../../config';

export const generateRtcToken = (
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher',
  tokenExpirationInSeconds: number = 3600,
  privilegeExpirationInSeconds: number = 3600
): string => {
  const appId = config.agora.appId!;
  const appCertificate = config.agora.appCertificate!;

  const rtcRole =
    role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    tokenExpirationInSeconds,
    privilegeExpirationInSeconds
  );
};

export const generateChannelName = (): string => {
  return `call_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
};

export const generateSessionChannelName = (sessionId: string): string => {
  return `session_${sessionId}`;
};

export const userIdToAgoraUid = (userId: string): number => {

  const hex = userId.slice(-8);
  return parseInt(hex, 16) % 2147483647;
};
