import { JwtPayload } from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';

export interface JwtUser extends JwtPayload {
  id?: string | null;
  email?: string | null;
  role: string;
}

declare global {

  var io: SocketIOServer | undefined;

  namespace Express {

    interface User extends JwtUser {}

    interface Request {
      user?: JwtUser;
    }
  }
}
