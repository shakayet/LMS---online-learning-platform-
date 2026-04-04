import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';
import { USER_ROLES } from '../../enums/user';

const auth =
  (...allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader && allowedRoles.includes(USER_ROLES.GUEST)) {
        req.user = { role: USER_ROLES.GUEST, id: null, email: null };
        return next();
      }

      if (!authHeader) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Authorization token is required'
        );
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'Authorization header must start with "Bearer "'
        );
      }

      const token = authHeader.split(' ')[1];
      if (!token || token.trim() === '') {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Valid token is required');
      }

      const verifiedUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      );

      if (!verifiedUser || !verifiedUser.role) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token payload');
      }

      req.user = verifiedUser;

      if (allowedRoles.length && !allowedRoles.includes(verifiedUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this API"
        );
      }

      next();
    } catch (error: any) {

      if (error.name === 'JsonWebTokenError') {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Token has expired')
        );
      }
      if (error.name === 'NotBeforeError') {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token not active'));
      }

      next(error);
    }
  };

export default auth;
