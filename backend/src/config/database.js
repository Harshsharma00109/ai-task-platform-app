'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));

  await mongoose.connect(uri, MONGODB_OPTIONS);
}

module.exports = { connectDB };
