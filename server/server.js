require('./config/env'); // Load environment variables first
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const config = require('./config/env');
const logger = require('./utils/logger');
const { errorMiddleware, notFoundMiddleware } = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const supportRoutes = require('./routes/supportRoutes');

// Initialize Express
const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development; enable in production
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,  // 15 minutes
  max: config.rateLimit.max,            // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
  },
});
app.use('/api/', limiter);

// ─── Logging ─────────────────────────────────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Static Frontend Files ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../client')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'SmartResolve AI is running', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/support', supportRoutes);

// Placeholder routes for Phase 3 (will be added incrementally)
// app.use('/api/orders', orderRoutes);
// app.use('/api/conversations', conversationRoutes);
// app.use('/api/policies', policyRoutes);
// app.use('/api/escalations', escalationRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/evaluation', evaluationRoutes);

// ─── SPA Fallback ────────────────────────────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/index.html'), (err) => {
    if (err) res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found.' } });
  });
});

// ─── Error Handlers ──────────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  app.listen(config.port, () => {
    logger.info('SmartResolve AI server running', {
      port: config.port,
      env: config.nodeEnv,
      llmProvider: config.llmProvider,
    });
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app; // Export for testing
