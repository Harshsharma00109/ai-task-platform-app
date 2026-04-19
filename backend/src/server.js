'use strict';

require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        const mongoose = require('mongoose');
        const { getRedisClient } = require('./config/redis');
        await mongoose.connection.close();
        const redis = getRedisClient();
        if (redis) await redis.quit();
        logger.info('Process terminated');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    logger.error('Failed to bootstrap application:', error);
    process.exit(1);
  }
}

bootstrap();
