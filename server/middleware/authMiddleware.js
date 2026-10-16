const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { errorResponse } = require('../utils/helpers');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'AUTH_REQUIRED', 'Authentication token required.', 401);
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user || !user.isActive) {
      return errorResponse(res, 'AUTH_INVALID', 'Invalid or expired token.', 401);
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'AUTH_EXPIRED', 'Token has expired. Please log in again.', 401);
    }
    return errorResponse(res, 'AUTH_INVALID', 'Invalid authentication token.', 401);
  }
};

// Role guards
const requireCustomer = (req, res, next) => {
  if (!req.user || !['customer', 'agent', 'admin'].includes(req.user.role)) {
    return errorResponse(res, 'FORBIDDEN', 'Access denied.', 403);
  }
  next();
};

const requireAgent = (req, res, next) => {
  if (!req.user || !['agent', 'admin'].includes(req.user.role)) {
    return errorResponse(res, 'FORBIDDEN', 'Agent or Admin access required.', 403);
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return errorResponse(res, 'FORBIDDEN', 'Admin access required.', 403);
  }
  next();
};

// Optional auth — does not fail if no token, just sets req.user = null
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.id).select('-passwordHash');
      req.user = user || null;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, requireCustomer, requireAgent, requireAdmin, optionalAuth };
