"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config"));
const jwtHelper_1 = require("../../helpers/jwtHelper");
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
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            const verifiedUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
            if (verifiedUser && verifiedUser.role) {
                req.user = verifiedUser;
            }
        }
        catch (_a) {
            // Token verification failed - continue as guest
            // Don't throw error, just proceed without user
        }
        next();
    }
    catch (_b) {
        // Any unexpected error - continue as guest
        next();
    }
});
exports.default = optionalAuth;
