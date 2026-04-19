'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

function createRedisClient() {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis reconnect attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error('Redis error:', err.message));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
}

async function connectRedis() {
  redisClient = createRedisClient();
  await redisClient.connect();
}

function getRedisClient() {
  return redisClient;
}

function getRedisConnection() {
  // BullMQ requires a separate connection instance
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

module.exports = { connectRedis, getRedisClient, getRedisConnection };
