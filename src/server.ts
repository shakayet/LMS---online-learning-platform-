import mongoose from 'mongoose';
import { Server } from 'socket.io';

import config from './config';
import app from './app';
import { seedSuperAdmin } from './DB/seedAdmin';
import { socketHelper } from './helpers/socketHelper';
import { errorLogger, logger, notifyCritical } from './shared/logger';
import { CacheHelper } from './app/shared/CacheHelper';
import { CronService } from './app/services/cron.service';

process.on('uncaughtException', error => {
  errorLogger.error('UncaughtException Detected', error);
  if (server && typeof server.close === 'function') {
    try {
      server.close(() => {

        setTimeout(() => process.exit(1), 500);
      });
    } catch (e) {

      setTimeout(() => process.exit(1), 500);
    }
  } else {
    process.exit(1);
  }
});

let server: any;
async function main() {
  try {

    logger.info(`🌐 Environment: ${config.node_env || 'unknown'}`);
    logger.info(
      `🛠️ Debug Mode: ${config.node_env === 'development' ? 'ON' : 'OFF'}`
    );

    mongoose.connect(config.database_url as string);
    logger.info('🚀 Database connected successfully');

    await seedSuperAdmin();

    const port = Number(config.port) || 5001;
    const host =
      config.node_env === 'development'
        ? '0.0.0.0'
        : (config.ip_address && String(config.ip_address).trim()) || '0.0.0.0';

    server = app.listen(port, host, () => {
      const url = `http://${host}:${port}/`;
      logger.info(`♻️ Application listening on ${url}`);
    });

    server.on('error', (err: any) => {
      if (err && err.code === 'EADDRINUSE') {
        errorLogger.error(`⚠️ Port in use ${host}:${port} (EADDRINUSE)`);

        try {
          server.close(() => {
            setTimeout(() => {
              server = app.listen(port, host, () => {
                logger.info(`♻️ Re-listened on ${host}:${port} after EADDRINUSE`);
              });
            }, 1000);
          });
        } catch (closeErr) {
          errorLogger.error('Failed to close server after EADDRINUSE', closeErr as any);
        }
      }
    });

    const cache = CacheHelper.getInstance();

    const io = new Server(server, {
      pingTimeout: 60000,
      cors: {
        origin: '*',
      },
    });
    socketHelper.socket(io);

    global.io = io;

    CronService.initializeCronJobs();

    const summary = [
      `📝 Startup Summary:`,
      `      - DB connected ${
        mongoose.connection.readyState === 1 ? '✅' : '❌'
      }`,
      `      - CacheHelper initialized ${cache ? '✅' : '❌'}`,
      `      - RateLimit active ✅`,
      `      - Cron Jobs initialized ✅`,
      `      - Debug Mode ${
        config.node_env === 'development' ? 'ON ✅' : 'OFF ❌'
      }`,
    ].join('\n');
    logger.info(summary);
  } catch (error) {
    errorLogger.error('❌ Database connection failed');
    notifyCritical(
      'Database Connection Failed',
      (error as Error)?.message || 'Unknown error'
    );
  }

  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        errorLogger.error('❌ UnhandledRejection Detected');
        notifyCritical(
          'Unhandled Rejection',
          (error as Error)?.message || 'Unknown error'
        );
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

process.on('SIGTERM', () => {
  logger.info('SIGTERM IS RECEIVE');
  if (server) {
    server.close();
  }
});
