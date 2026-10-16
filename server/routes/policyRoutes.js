/**
 * policyRoutes.js
 * Routes for policy management.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/authMiddleware');
const {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
} = require('../controllers/policyController');

// GET /api/policies (view active policies — open or optional auth)
router.get('/', optionalAuth, getPolicies);

// GET /api/policies/:policyId (view single policy)
router.get('/:policyId', optionalAuth, getPolicyById);

// Admin-only mutations
router.post('/', authenticate, requireAdmin, createPolicy);
router.put('/:policyId', authenticate, requireAdmin, updatePolicy);
router.delete('/:policyId', authenticate, requireAdmin, deletePolicy);

module.exports = router;
