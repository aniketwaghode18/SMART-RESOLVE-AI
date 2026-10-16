// validators.js — Input validation utilities

const { v4: uuidv4 } = require('uuid');

const validators = {
  // Validate MongoDB ObjectId format
  isValidObjectId: (id) => /^[a-f\d]{24}$/i.test(id),

  // Validate email
  isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  // Validate password (min 6 chars)
  isValidPassword: (password) => typeof password === 'string' && password.length >= 6,

  // Validate non-empty string
  isNonEmpty: (str) => typeof str === 'string' && str.trim().length > 0,

  // Validate message (1 to 2000 chars)
  isValidMessage: (message) => {
    if (typeof message !== 'string') return false;
    const trimmed = message.trim();
    return trimmed.length >= 1 && trimmed.length <= 2000;
  },

  // Sanitize message — trim whitespace
  sanitizeMessage: (message) => (typeof message === 'string' ? message.trim() : ''),

  // Validate role
  isValidRole: (role) => ['customer', 'agent', 'admin'].includes(role),

  // Generate order ID
  generateOrderId: (counter) => (counter ? `ORD${counter}` : `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`),

  // Generate case ID
  generateCaseId: (counter) => (counter ? `CASE${counter}` : `CASE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`),
};

module.exports = validators;
