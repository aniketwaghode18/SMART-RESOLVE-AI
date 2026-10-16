/**
 * analyticsRoutes.js
 * Routes for system analytics and performance metrics.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAgent } = require('../middleware/authMiddleware');
const { getAnalytics } = require('../controllers/analyticsController');

// All analytics routes require agent or admin authentication
router.use(authenticate, requireAgent);

// GET /api/analytics
router.get('/', getAnalytics);

module.exports = router;
