const logger = require('../utils/logger');

// Global error handler middleware
const errorMiddleware = (err, req, res, next) => {
  // Log error (never log sensitive data)
  logger.error('Unhandled error', {
    message: err.message,
    url: req.url,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: messages.join('. ') },
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_ERROR', message: `${field} already exists.` },
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'AUTH_INVALID', message: 'Invalid authentication token.' },
    });
  }

  // Default — never expose internal stack traces to customers
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again or contact a support agent.',
    },
  });
};

// 404 handler
const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` },
  });
};

module.exports = { errorMiddleware, notFoundMiddleware };
