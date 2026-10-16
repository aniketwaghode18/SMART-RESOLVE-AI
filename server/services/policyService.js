/**
 * policyService.js
 * Step 5 of the SmartResolve AI pipeline.
 * Retrieves the relevant policy from MongoDB and evaluates eligibility.
 * Implements RAG (Retrieval-Augmented Generation) using MongoDB keyword matching.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent } = require('../prompts/policyPrompt');
const Policy = require('../models/Policy');
const Order = require('../models/Order');
const User = require('../models/User');
const logger = require('../utils/logger');

// ─── Policy Retrieval (RAG) ───────────────────────────────────────────────────

/**
 * Map intents to policy categories for keyword matching.
 */
const INTENT_TO_CATEGORY = {
  return_request: 'returns',
  refund_request: 'refunds',
  replacement_request: 'replacements',
  damaged_product: 'returns',
  defective_product: 'returns',
  wrong_product: 'returns',
  order_cancellation: 'cancellations',
  payment_issue: 'payments',
  payment_failure: 'payments',
  delivery_delay: 'shipping',
  order_status: 'shipping',
  order_tracking: 'shipping',
  missing_item: 'returns',
  product_complaint: 'returns'
};

/**
 * Retrieve the most relevant policy from MongoDB using keyword matching.
 * @param {string} intent - Detected intent
 * @param {object} context - Extracted context
 * @returns {Promise<object|null>} - Policy document or null
 */
async function retrievePolicy(intent, context) {
  try {
    // 1. Try category-based lookup
    const category = INTENT_TO_CATEGORY[intent];
    if (category) {
      const policy = await Policy.findOne({ category, active: true }).lean();
      if (policy) {
        logger.info(`[policyService] retrieved policy by category="${category}"`);
        return policy;
      }
    }

    // 2. Fallback: keyword search in policy content
    const keywords = [
      intent?.replace(/_/g, ' '),
      context?.problem,
      context?.requested_action
    ].filter(Boolean);

    if (keywords.length > 0) {
      const query = {
        active: true,
        $or: keywords.map(kw => ({
          $or: [
            { keywords: { $regex: kw, $options: 'i' } },
            { content: { $regex: kw, $options: 'i' } },
            { title: { $regex: kw, $options: 'i' } }
          ]
        }))
      };

      const policy = await Policy.findOne(query).lean();
      if (policy) {
        logger.info(`[policyService] retrieved policy by keyword matching`);
        return policy;
      }
    }

    // 3. Return general support policy if nothing found
    const generalPolicy = await Policy.findOne({ category: 'general', active: true }).lean();
    if (generalPolicy) return generalPolicy;

    logger.warn('[policyService] No matching policy found in DB');
    return null;
  } catch (err) {
    logger.error(`[policyService] policy retrieval error: ${err.message}`);
    return null;
  }
}

/**
 * Look up the order by ID from context or customerId.
 * @param {string|null} orderId - Order ID from context
 * @param {string} customerId - Customer's user ID
 * @returns {Promise<object|null>}
 */
async function lookupOrder(orderId, customerId) {
  try {
    if (orderId) {
      // Normalize: strip prefix variations like "#", "ORD-", etc.
      const cleanId = orderId.replace(/^#/, '').trim();
      const order = await Order.findOne({
        $or: [
          { orderId: { $regex: cleanId, $options: 'i' } },
          { orderId: cleanId }
        ]
      }).lean();
      if (order) return order;
    }

    // If no order ID, get the most recent order for this customer
    if (customerId) {
      const order = await Order.findOne({ customerId })
        .sort({ orderDate: -1 })
        .lean();
      return order || null;
    }

    return null;
  } catch (err) {
    logger.warn(`[policyService] order lookup error: ${err.message}`);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve policy, look up order, and evaluate eligibility via LLM.
 *
 * @param {object} params
 * @param {string} params.message - Customer message
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.context - Extracted context
 * @param {string} params.customerId - Customer user ID
 * @returns {Promise<{
 *   eligible: boolean|null,
 *   applicable_policy: string,
 *   recommended_action: string,
 *   missing_information: string[],
 *   escalation_required: boolean,
 *   escalation_reason: string|null,
 *   confidence: number,
 *   policy_excerpt: string,
 *   order: object|null,
 *   policy: object|null,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function evaluatePolicy({ message, intent, sentiment, urgency, context, customerId }) {
  // Retrieve order and policy in parallel
  const [order, policy, customer] = await Promise.all([
    lookupOrder(context?.order_id, customerId),
    retrievePolicy(intent, context),
    User.findById(customerId).select('-passwordHash').lean().catch(() => null)
  ]);

  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent({
      message,
      intent,
      sentiment,
      urgency,
      context,
      order,
      customer,
      policy
    });

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 500,
      serviceName: 'policyService'
    });

    const parsed = parseJSON(llmResult.content, {
      eligible: null,
      applicable_policy: 'General Policy',
      recommended_action: 'Provide information to customer',
      missing_information: [],
      escalation_required: false,
      escalation_reason: null,
      confidence: 0.5,
      policy_excerpt: ''
    });

    // Hard rule: CRITICAL urgency always escalates
    if (urgency === 'CRITICAL') {
      parsed.escalation_required = true;
      parsed.escalation_reason = parsed.escalation_reason || 'CRITICAL urgency detected';
    }

    logger.info(`[policyService] eligible=${parsed.eligible} escalation=${parsed.escalation_required}`);

    return {
      eligible: parsed.eligible ?? null,
      applicable_policy: parsed.applicable_policy || 'General Policy',
      recommended_action: parsed.recommended_action || 'Provide information',
      missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
      escalation_required: Boolean(parsed.escalation_required),
      escalation_reason: parsed.escalation_reason || null,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      policy_excerpt: parsed.policy_excerpt || '',
      order,
      policy,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[policyService] error: ${err.message}`);
    throw Object.assign(new Error(`Policy evaluation failed: ${err.message}`), {
      code: 'POLICY_SERVICE_ERROR'
    });
  }
}

module.exports = { evaluatePolicy, retrievePolicy, lookupOrder };
