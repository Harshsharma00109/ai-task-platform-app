'use strict';

const { Router } = require('express');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');

const router = Router();

router.get('/', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  let redisStatus = 'disconnected';

  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.ping();
      redisStatus = 'connected';
    }
  } catch (_) {
    redisStatus = 'error';
  }

  const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
    },
    uptime: process.uptime(),
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });
});

router.get('/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  res.status(isReady ? 200 : 503).json({ ready: isReady });
});

router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

module.exports = router;
