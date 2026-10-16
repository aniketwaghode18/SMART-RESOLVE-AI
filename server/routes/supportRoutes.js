/**
 * supportRoutes.js
 * Routes for the SmartResolve AI support pipeline.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { processMessage, startConversation, getHistory } = require('../controllers/supportController');
const { authenticate, requireCustomer } = require('../middleware/authMiddleware');

// POST /api/support/message — main AI pipeline endpoint
// Authenticated customers only; also allow agents/admin to test the pipeline
router.post('/message', authenticate, processMessage);

// POST /api/support/conversation/start — start a new conversation
router.post('/conversation/start', authenticate, requireCustomer, startConversation);

// GET /api/support/conversation/:conversationId/history — get conversation messages
router.get('/conversation/:conversationId/history', authenticate, getHistory);

module.exports = router;
