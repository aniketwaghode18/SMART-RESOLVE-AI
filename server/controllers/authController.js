const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Only allow customer self-registration; agents/admins created by seed or admin panel
    const assignedRole = role === 'customer' ? 'customer' : 'customer';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'USER_EXISTS', 'An account with this email already exists.', 409);
    }

    const user = new User({ name, email, passwordHash: password, role: assignedRole });
    await user.save();

    const token = generateToken(user._id);

    logger.info('User registered', { userId: user._id, role: user.role });

    return successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, membershipLevel: user.membershipLevel },
    }, 201);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'AUTH_FAILED', 'Invalid email or password.', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'AUTH_FAILED', 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'ACCOUNT_DISABLED', 'Your account has been disabled.', 403);
    }

    const token = generateToken(user._id);

    logger.info('User logged in', { userId: user._id, role: user.role });

    return successResponse(res, {
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, membershipLevel: user.membershipLevel },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, membershipLevel: req.user.membershipLevel },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
