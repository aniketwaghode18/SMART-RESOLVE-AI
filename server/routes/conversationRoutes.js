/**
 * conversationRoutes.js
 * Routes for conversation management and history.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAgent } = require('../middleware/authMiddleware');
const {
  getConversations,
  getConversationById,
  updateConversationStatus,
  addMessage
} = require('../controllers/conversationController');

// All conversation routes require authentication
router.use(authenticate);

// GET /api/conversations (list conversations)
router.get('/', getConversations);

// GET /api/conversations/:conversationId (conversation detail with messages and AI analysis)
router.get('/:conversationId', getConversationById);

// PATCH /api/conversations/:conversationId/status (update status — agents/admins)
router.patch('/:conversationId/status', requireAgent, updateConversationStatus);

// POST /api/conversations/:conversationId/messages (post manual message)
router.post('/:conversationId/messages', addMessage);

module.exports = router;
