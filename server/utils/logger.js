// logger.js - Simple structured logger for SmartResolve AI
// NEVER logs: API keys, passwords, CVV, OTP, full payment info

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'apiKey', 'secret', 'cvv', 'otp', 'jwtSecret'];
  const sanitized = Array.isArray(meta) ? [...meta] : { ...meta };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  return sanitized;
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(sanitizeMeta(meta))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] <= LOG_LEVELS[currentLevel]) {
    const formatted = formatMessage(level, message, meta);
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn:  (message, meta) => log('warn',  message, meta),
  info:  (message, meta) => log('info',  message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

module.exports = logger;
