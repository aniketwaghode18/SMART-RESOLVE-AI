const { errorResponse } = require('../utils/helpers');
const { isValidMessage, isValidEmail, isNonEmpty } = require('../utils/validators');

// Validate POST /api/support/message
const validateSupportMessage = (req, res, next) => {
  const { conversationId, customerId, message } = req.body;
  if (!isNonEmpty(conversationId)) {
    return errorResponse(res, 'VALIDATION_ERROR', 'conversationId is required.', 400);
  }
  if (!isValidMessage(message)) {
    return errorResponse(res, 'VALIDATION_ERROR', 'message must be between 1 and 2000 characters.', 400);
  }
  next();
};

// Validate auth register
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  if (!isNonEmpty(name)) return errorResponse(res, 'VALIDATION_ERROR', 'name is required.', 400);
  if (!isValidEmail(email)) return errorResponse(res, 'VALIDATION_ERROR', 'Valid email is required.', 400);
  if (!password || password.length < 6) return errorResponse(res, 'VALIDATION_ERROR', 'Password must be at least 6 characters.', 400);
  next();
};

// Validate auth login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!isValidEmail(email)) return errorResponse(res, 'VALIDATION_ERROR', 'Valid email is required.', 400);
  if (!isNonEmpty(password)) return errorResponse(res, 'VALIDATION_ERROR', 'Password is required.', 400);
  next();
};

module.exports = { validateSupportMessage, validateRegister, validateLogin };
