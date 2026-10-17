import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { seedDatabase } from './seed';
import { logger } from './shared/logger';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Run idempotent seeder in development to ensure demo users exist
    if (env.NODE_ENV === 'development') {
      try {
        await seedDatabase();
      } catch (seedError) {
        logger.warn({ seedError }, 'Initial seeding warning (continuing server startup)');
      }
    }

    // 3. Create Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Start listening on configured port
    server.listen(env.PORT, () => {
      logger.info('====================================================');
      logger.info(`🚀 RoadSense Backend API Server is RUNNING`);
      logger.info(`📡 Port: ${env.PORT}`);
      logger.info(`🌍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 Base URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`🩺 Health Check: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`👥 Seed Users:`);
      logger.info(`   - Admin:     admin@roadsense.demo     / RoadSense123!`);
      logger.info(`   - Volunteer: volunteer@roadsense.demo / RoadSense123!`);
      logger.info(`   - Officer:   officer@roadsense.demo   / RoadSense123!`);
      logger.info('====================================================');
    });

    // 5. Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Process termination complete. Goodbye!');
        process.exit(0);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled Promise Rejection caught');
    });

    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught Exception thrown! Exiting process...');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, 'Failed to start RoadSense backend server');
    process.exit(1);
  }
};

startServer();
