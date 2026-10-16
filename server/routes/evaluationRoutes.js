/**
 * evaluationRoutes.js
 * Routes for prompt engineering evaluation benchmarks and prompt versions.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAgent, requireAdmin } = require('../middleware/authMiddleware');
const {
  getEvaluationTestCases,
  executeEvaluation,
  getEvaluationHistory,
  getPromptVersions,
  createPromptVersion
} = require('../controllers/evaluationController');

// All evaluation routes require authentication (agents/admins)
router.use(authenticate, requireAgent);

// GET /api/evaluation/test-cases (list benchmark cases)
router.get('/test-cases', getEvaluationTestCases);

// POST /api/evaluation/run (run benchmark)
router.post('/run', executeEvaluation);

// GET /api/evaluation/history (view evaluation history)
router.get('/history', getEvaluationHistory);

// GET /api/evaluation/versions (list prompt versions)
router.get('/versions', getPromptVersions);

// POST /api/evaluation/versions (create prompt version — admin only)
router.post('/versions', requireAdmin, createPromptVersion);

module.exports = router;
