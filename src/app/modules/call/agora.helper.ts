import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { randomUUID } from 'crypto';
import config from '../../../config';

/**
 * RTC Token Generate করে (Video/Voice Call এর জন্য)
 *
 * @param channelName - Agora channel name
 * @param uid - User এর Agora UID (number)
 * @param role - publisher (can send audio/video) or subscriber (only receive)
 * @param tokenExpirationInSeconds - Token validity (default: 1 hour)
 * @param privilegeExpirationInSeconds - Privilege validity (default: 1 hour)
 */
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

// Unique Channel Name Generate করে

export const generateChannelName = (): string => {
  return `call_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
};

/**
 * Session ID থেকে Channel Name তৈরি করে
 * Same session এর জন্য সবসময় same channel name return করবে
 */
export const generateSessionChannelName = (sessionId: string): string => {
  return `session_${sessionId}`;
};

/**
 * User ID থেকে Agora UID তৈরি করে
 * MongoDB ObjectId কে number এ convert করে
 */
export const userIdToAgoraUid = (userId: string): number => {
  // ObjectId এর শেষ 8 characters নিয়ে number বানাই
  const hex = userId.slice(-8);
  return parseInt(hex, 16) % 2147483647; // Max 32-bit signed integer
};
