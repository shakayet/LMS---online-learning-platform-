import axios from 'axios';
import config from '../../../config';

const WHITEBOARD_API = 'https://api.netless.link/v5';

const getHeaders = () => ({
  token: config.agora.whiteboard.sdkToken!,
  'Content-Type': 'application/json',
  region: config.agora.whiteboard.region,
});

/**
 * নতুন Whiteboard Room তৈরি করে
 */
export const createAgoraWhiteboardRoom = async (
  name: string
): Promise<{ uuid: string }> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/rooms`,
    {
      name,
      isRecord: false,
    },
    { headers: getHeaders() }
  );

  return { uuid: response.data.uuid };
};

/**
 * Room Token Generate করে
 */
export const generateWhiteboardRoomToken = async (
  roomUuid: string,
  role: 'admin' | 'writer' | 'reader' = 'writer',
  lifespan: number = 3600000 // 1 hour in ms
): Promise<string> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/tokens/rooms/${roomUuid}`,
    { lifespan, role },
    { headers: getHeaders() }
  );

  return response.data;
};

/**
 * Room বন্ধ করে
 */
export const closeWhiteboardRoom = async (roomUuid: string): Promise<void> => {
  await axios.patch(
    `${WHITEBOARD_API}/rooms/${roomUuid}`,
    { isBan: true },
    { headers: getHeaders() }
  );
};

/**
 * Room state export করে
 */
export const getWhiteboardRoomInfo = async (
  roomUuid: string
): Promise<any> => {
  const response = await axios.get(`${WHITEBOARD_API}/rooms/${roomUuid}`, {
    headers: getHeaders(),
  });

  return response.data;
};

/**
 * Whiteboard এর current state এর image snapshot নেয়
 */
export const takeWhiteboardSnapshot = async (
  roomUuid: string,
  scenePath: string = '/init'
): Promise<string> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/rooms/${roomUuid}/screenshots`,
    {
      width: 1920,
      height: 1080,
      scenePath,
    },
    { headers: getHeaders() }
  );

  return response.data.url;
};

/**
 * Whiteboard এর সব scene list করে
 */
export const getWhiteboardScenes = async (roomUuid: string): Promise<any[]> => {
  const response = await axios.get(
    `${WHITEBOARD_API}/rooms/${roomUuid}/scenes`,
    { headers: getHeaders() }
  );

  return response.data;
};
