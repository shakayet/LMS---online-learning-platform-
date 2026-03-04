import { JwtPayload } from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';

export interface JwtUser extends JwtPayload {
  id?: string | null;
  email?: string | null;
  role: string;
}

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;

  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtUser {}

    interface Request {
      user?: JwtUser;
    }
  }
}
