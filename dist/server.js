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
const mongoose_1 = __importDefault(require("mongoose"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const seedAdmin_1 = require("./DB/seedAdmin");
const socketHelper_1 = require("./helpers/socketHelper");
const logger_1 = require("./shared/logger");
const CacheHelper_1 = require("./app/shared/CacheHelper");
const cron_service_1 = require("./app/services/cron.service");

process.on('uncaughtException', error => {
    logger_1.errorLogger.error('UncaughtException Detected', error);
    if (server && typeof server.close === 'function') {
        try {
            server.close(() => {

                setTimeout(() => process.exit(1), 500);
            });
        }
        catch (e) {

            setTimeout(() => process.exit(1), 500);
        }
    }
    else {
        process.exit(1);
    }
});
let server;
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {

            logger_1.logger.info(`🌐 Environment: ${config_1.default.node_env || 'unknown'}`);
            logger_1.logger.info(`🛠️ Debug Mode: ${config_1.default.node_env === 'development' ? 'ON' : 'OFF'}`);

            mongoose_1.default.connect(config_1.default.database_url);
            logger_1.logger.info('🚀 Database connected successfully');

            yield (0, seedAdmin_1.seedSuperAdmin)();
            const port = Number(config_1.default.port) || 5001;
            const host = config_1.default.node_env === 'development'
                ? '0.0.0.0'
                : (config_1.default.ip_address && String(config_1.default.ip_address).trim()) || '0.0.0.0';
            server = app_1.default.listen(port, host, () => {
                const url = `http://${host}:${port}/`;
                logger_1.logger.info(`♻️ Application listening on ${url}`);
            });

            server.on('error', (err) => {
                if (err && err.code === 'EADDRINUSE') {
                    logger_1.errorLogger.error(`⚠️ Port in use ${host}:${port} (EADDRINUSE)`);

                    try {
                        server.close(() => {
                            setTimeout(() => {
                                server = app_1.default.listen(port, host, () => {
                                    logger_1.logger.info(`♻️ Re-listened on ${host}:${port} after EADDRINUSE`);
                                });
                            }, 1000);
                        });
                    }
                    catch (closeErr) {
                        logger_1.errorLogger.error('Failed to close server after EADDRINUSE', closeErr);
                    }
                }
            });

            const cache = CacheHelper_1.CacheHelper.getInstance();

            const io = new socket_io_1.Server(server, {
                pingTimeout: 60000,
                cors: {
                    origin: '*',
                },
            });
            socketHelper_1.socketHelper.socket(io);

            global.io = io;

            cron_service_1.CronService.initializeCronJobs();

            const summary = [
                `📝 Startup Summary:`,
                `      - DB connected ${mongoose_1.default.connection.readyState === 1 ? '✅' : '❌'}`,
                `      - CacheHelper initialized ${cache ? '✅' : '❌'}`,
                `      - RateLimit active ✅`,
                `      - Cron Jobs initialized ✅`,
                `      - Debug Mode ${config_1.default.node_env === 'development' ? 'ON ✅' : 'OFF ❌'}`,
            ].join('\n');
            logger_1.logger.info(summary);
        }
        catch (error) {
            logger_1.errorLogger.error('❌ Database connection failed');
            (0, logger_1.notifyCritical)('Database Connection Failed', (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error');
        }

        process.on('unhandledRejection', error => {
            if (server) {
                server.close(() => {
                    logger_1.errorLogger.error('❌ UnhandledRejection Detected');
                    (0, logger_1.notifyCritical)('Unhandled Rejection', (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error');
                    process.exit(1);
                });
            }
            else {
                process.exit(1);
            }
        });
    });
}
main();

process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM IS RECEIVE');
    if (server) {
        server.close();
    }
});
