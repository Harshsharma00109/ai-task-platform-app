'use strict';

const User = require('../models/user.model');
const { signToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    const user = await User.create({ name, email, password });

    const token = signToken({ id: user._id, role: user.role });

    logger.info(`New user registered: ${user.email} (${user._id})`);

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      'Account created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated. Contact support.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken({ id: user._id, role: user.role });

    logger.info(`User logged in: ${user.email}`);

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLoginAt: user.lastLoginAt,
        },
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 'User not found.', 404);
    return sendSuccess(res, { user }, 'Profile retrieved');
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getMe };
