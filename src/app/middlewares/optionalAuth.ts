import { NextFunction, Request, Response } from 'express';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../helpers/jwtHelper';

const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return next();
    }

    try {
      const verifiedUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      );

      if (verifiedUser && verifiedUser.role) {
        req.user = verifiedUser;
      }
    } catch {

    }

    next();
  } catch {

    next();
  }
};

export default optionalAuth;
