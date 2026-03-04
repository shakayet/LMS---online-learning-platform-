import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JwtUser } from '../types';

const createToken = (payload: object, secret: Secret, expireTime: string) => {
  return jwt.sign(payload, secret, { expiresIn: expireTime } as SignOptions);
};

const verifyToken = (token: string, secret: Secret): JwtUser => {
  return jwt.verify(token, secret) as JwtUser;
};

export const jwtHelper = { createToken, verifyToken };
