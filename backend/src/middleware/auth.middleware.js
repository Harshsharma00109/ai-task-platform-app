'use strict';

const { verifyToken } = require('../utils/jwt');
const User = require('../models/user.model');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided. Authorization required.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 'User no longer exists.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated. Contact support.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please login again.', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token.', 401);
    }
    return sendError(res, 'Authentication failed.', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return sendError(res, 'You do not have permission for this action.', 403);
    }
    next();
  };
}

module.exports = { authenticate, authorize };
