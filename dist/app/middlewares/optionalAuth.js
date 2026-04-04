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

const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            const verifiedUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
            if (verifiedUser && verifiedUser.role) {
                req.user = verifiedUser;
            }
        }
        catch (_a) {

        }
        next();
    }
    catch (_b) {

        next();
    }
});
exports.default = optionalAuth;
