// helpers.js — General utility helpers

const helpers = {
  // Return a standardised success response
  successResponse: (res, data, statusCode = 200) => {
    return res.status(statusCode).json({ success: true, ...data });
  },

  // Return a standardised error response
  errorResponse: (res, code, message, statusCode = 500) => {
    return res.status(statusCode).json({
      success: false,
      error: { code, message },
    });
  },

  // Mask a sensitive string for safe logging
  maskString: (str, visibleChars = 4) => {
    if (!str || str.length <= visibleChars) return '****';
    return '****' + str.slice(-visibleChars);
  },

  // Calculate elapsed time in ms from a start Date
  elapsed: (start) => Date.now() - start,

  // Sleep utility for retry logic
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Clamp a number between min and max
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),

  // Pick specific keys from an object (safe subset)
  pick: (obj, keys) => {
    return keys.reduce((acc, key) => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) acc[key] = obj[key];
      return acc;
    }, {});
  },
};

module.exports = helpers;
