import axios from 'axios';
import config from '../../../config';

const WHITEBOARD_API = 'https://api.netless.link/v5';

const getHeaders = () => ({
  token: config.agora.whiteboard.sdkToken!,
  'Content-Type': 'application/json',
  region: config.agora.whiteboard.region,
});

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

export const generateWhiteboardRoomToken = async (
  roomUuid: string,
  role: 'admin' | 'writer' | 'reader' = 'writer',
  lifespan: number = 3600000
): Promise<string> => {
  const response = await axios.post(
    `${WHITEBOARD_API}/tokens/rooms/${roomUuid}`,
    { lifespan, role },
    { headers: getHeaders() }
  );

  return response.data;
};

export const closeWhiteboardRoom = async (roomUuid: string): Promise<void> => {
  await axios.patch(
    `${WHITEBOARD_API}/rooms/${roomUuid}`,
    { isBan: true },
    { headers: getHeaders() }
  );
};

export const getWhiteboardRoomInfo = async (
  roomUuid: string
): Promise<any> => {
  const response = await axios.get(`${WHITEBOARD_API}/rooms/${roomUuid}`, {
    headers: getHeaders(),
  });

  return response.data;
};

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

export const getWhiteboardScenes = async (roomUuid: string): Promise<any[]> => {
  const response = await axios.get(
    `${WHITEBOARD_API}/rooms/${roomUuid}/scenes`,
    { headers: getHeaders() }
  );

  return response.data;
};
