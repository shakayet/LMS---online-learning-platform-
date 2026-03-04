import { NextFunction, Request, Response } from 'express';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import { jwtHelper } from '../../helpers/jwtHelper';

/**
 * Optional Authentication Middleware
 *
 * This middleware attempts to authenticate users if a token is provided,
 * but allows requests to proceed even without authentication.
 *
 * Use cases:
 * - Public endpoints that benefit from knowing the user (e.g., trial requests)
 * - Guest user flows where authentication is optional
 *
 * If token is valid: req.user is populated with user data
 * If no token or invalid token: req.user is undefined (request continues)
 */
const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // No token provided - continue as guest
    if (!authHeader) {
      return next();
    }

    // Invalid format - continue as guest
    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return next();
    }

    // Try to verify token
    try {
      const verifiedUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret
      );

      if (verifiedUser && verifiedUser.role) {
        req.user = verifiedUser;
      }
    } catch {
      // Token verification failed - continue as guest
      // Don't throw error, just proceed without user
    }

    next();
  } catch {
    // Any unexpected error - continue as guest
    next();
  }
};

export default optionalAuth;
