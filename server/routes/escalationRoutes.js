/**
 * escalationRoutes.js
 * Routes for agent/admin escalation case management.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAgent } = require('../middleware/authMiddleware');
const {
  getEscalations,
  getEscalationById,
  updateEscalation
} = require('../controllers/escalationController');

// All escalation routes require agent or admin authentication
router.use(authenticate, requireAgent);

// GET /api/escalations (list cases with filter by status, priority, department)
router.get('/', getEscalations);

// GET /api/escalations/:id (view case detail)
router.get('/:id', getEscalationById);

// PATCH /api/escalations/:id (update status, assign agent, add resolution notes)
router.patch('/:id', updateEscalation);

module.exports = router;
