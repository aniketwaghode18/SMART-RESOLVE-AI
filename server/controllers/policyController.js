/**
 * policyController.js
 * Controller for managing e-commerce customer support policies.
 */

'use strict';

const Policy = require('../models/Policy');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const VALID_CATEGORIES = ['return', 'refund', 'replacement', 'cancellation', 'shipping', 'payment', 'security', 'general'];

/**
 * GET /api/policies
 * Returns list of policies with optional filtering by category or active status.
 */
async function getPolicies(req, res, next) {
  try {
    const { category, active, search } = req.query;
    const query = {};

    if (category && VALID_CATEGORIES.includes(category.toLowerCase())) {
      query.category = category.toLowerCase();
    }

    if (active !== undefined) {
      query.active = active === 'true' || active === true;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { keywords: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const policies = await Policy.find(query).sort({ category: 1, title: 1 }).lean();

    return successResponse(res, {
      policies,
      count: policies.length
    });
  } catch (err) {
    logger.error(`[policyController] getPolicies error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/policies/:policyId
 * Returns a specific policy by policyId or ObjectId.
 */
async function getPolicyById(req, res, next) {
  try {
    const { policyId } = req.params;

    const policy = await Policy.findOne({
      $or: [{ policyId: policyId.toLowerCase() }, { policyId: policyId }]
    }).lean();

    if (!policy) {
      return errorResponse(res, 'POLICY_NOT_FOUND', `Policy '${policyId}' not found.`, 404);
    }

    return successResponse(res, { policy });
  } catch (err) {
    logger.error(`[policyController] getPolicyById error: ${err.message}`);
    next(err);
  }
}

/**
 * POST /api/policies
 * Creates a new policy. Admin only.
 */
async function createPolicy(req, res, next) {
  try {
    const { policyId, title, category, content, keywords = [], version = '1.0', active = true } = req.body;

    if (!policyId || !title || !category || !content) {
      return errorResponse(res, 'VALIDATION_ERROR', 'policyId, title, category, and content are required.', 400);
    }

    if (!VALID_CATEGORIES.includes(category.toLowerCase())) {
      return errorResponse(res, 'INVALID_CATEGORY', `Category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    const existing = await Policy.findOne({ policyId: policyId.toLowerCase() });
    if (existing) {
      return errorResponse(res, 'POLICY_EXISTS', `Policy '${policyId}' already exists.`, 409);
    }

    const policy = await Policy.create({
      policyId: policyId.toLowerCase(),
      title: title.trim(),
      category: category.toLowerCase(),
      content: content.trim(),
      keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim()),
      version,
      active
    });

    logger.info(`[policyController] policy created: ${policy.policyId}`);
    return successResponse(res, { policy }, 201);
  } catch (err) {
    logger.error(`[policyController] createPolicy error: ${err.message}`);
    next(err);
  }
}

/**
 * PUT /api/policies/:policyId
 * Updates an existing policy. Admin only.
 */
async function updatePolicy(req, res, next) {
  try {
    const { policyId } = req.params;
    const { title, category, content, keywords, version, active } = req.body;

    const policy = await Policy.findOne({
      $or: [{ policyId: policyId.toLowerCase() }, { policyId: policyId }]
    });

    if (!policy) {
      return errorResponse(res, 'POLICY_NOT_FOUND', `Policy '${policyId}' not found.`, 404);
    }

    if (category && !VALID_CATEGORIES.includes(category.toLowerCase())) {
      return errorResponse(res, 'INVALID_CATEGORY', `Category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    if (title !== undefined) policy.title = title.trim();
    if (category !== undefined) policy.category = category.toLowerCase();
    if (content !== undefined) policy.content = content.trim();
    if (keywords !== undefined) {
      policy.keywords = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
    }
    if (version !== undefined) policy.version = version;
    if (active !== undefined) policy.active = Boolean(active);
    policy.updatedAt = new Date();

    await policy.save();

    logger.info(`[policyController] policy updated: ${policy.policyId}`);
    return successResponse(res, { policy });
  } catch (err) {
    logger.error(`[policyController] updatePolicy error: ${err.message}`);
    next(err);
  }
}

/**
 * DELETE /api/policies/:policyId
 * Deactivates or removes a policy. Admin only.
 */
async function deletePolicy(req, res, next) {
  try {
    const { policyId } = req.params;

    const policy = await Policy.findOneAndDelete({
      $or: [{ policyId: policyId.toLowerCase() }, { policyId: policyId }]
    });

    if (!policy) {
      return errorResponse(res, 'POLICY_NOT_FOUND', `Policy '${policyId}' not found.`, 404);
    }

    logger.info(`[policyController] policy deleted: ${policy.policyId}`);
    return successResponse(res, { message: `Policy '${policyId}' successfully deleted.` });
  } catch (err) {
    logger.error(`[policyController] deletePolicy error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getPolicies,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy
};
