'use strict';

const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?._id,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors, timestamp: new Date().toISOString() });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      timestamp: new Date().toISOString(),
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      timestamp: new Date().toISOString(),
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler, notFoundHandler };
