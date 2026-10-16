/**
 * escalationService.js
 * Step 9 of the SmartResolve AI pipeline.
 * Decides whether to escalate to a human agent and creates the escalation record.
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const Escalation = require('../models/Escalation');
const logger = require('../utils/logger');

// ─── Escalation Triggers ──────────────────────────────────────────────────────

const SECURITY_INTENTS = [
  'payment_issue',
  'payment_failure'
];

const SECURITY_KEYWORDS = [
  'fraud',
  'unauthorized',
  'hack',
  'stolen',
  'scam',
  'phishing',
  'account taken',
  'someone else',
  'illegal',
  'police',
  'lawyer',
  'sue',
  'court',
  'legal action',
  'i want to speak',
  'speak to a human',
  'speak to a person',
  'speak to a manager',
  'speak to an agent',
  'human agent',
  'real person',
  'escalate'
];

const HUMAN_REQUEST_PATTERNS = [
  /(?:speak|talk|chat|connect|transfer|need|want|get|reach|insist)(?:\s+\w+){0,5}\s+(?:human|agent|person|manager|supervisor|representative)/i,
  /\b(?:human\s+(?:agent|supervisor|representative|support|help|operator)|real\s+person)\b/i,
  /\b(?:escalate|supervisor|manager)\b/i
];

/**
 * Check if the customer message explicitly requests a human agent.
 * @param {string} message
 * @returns {boolean}
 */
function requestsHuman(message) {
  const lower = message.toLowerCase();
  if (SECURITY_KEYWORDS.some(kw => lower.includes(kw))) return true;
  return HUMAN_REQUEST_PATTERNS.some(pattern => pattern.test(lower));
}

/**
 * Determine if this case should be escalated based on all pipeline signals.
 *
 * @param {object} params
 * @param {string} params.message - Customer message
 * @param {string} params.intent - Detected intent
 * @param {number} params.intentConfidence - Confidence from intent detection
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.policyDecision - Policy evaluation result
 * @param {object} params.criticVerdict - Critic review result
 * @returns {{ should_escalate: boolean, reason: string|null, priority: string, department: string }}
 */
function shouldEscalate({ message, intent, intentConfidence, urgency, policyDecision, criticVerdict }) {
  const reasons = [];

  // Trigger 1: Low confidence
  if (intentConfidence < 0.70) {
    reasons.push(`Low AI confidence (${(intentConfidence * 100).toFixed(0)}%)`);
  }

  // Trigger 2: CRITICAL urgency
  if (urgency === 'CRITICAL') {
    reasons.push('CRITICAL urgency detected');
  }

  // Trigger 3: Policy requires escalation
  if (policyDecision?.escalation_required) {
    reasons.push(policyDecision.escalation_reason || 'Policy requires escalation');
  }

  // Trigger 4: Critic rejected the response
  if (criticVerdict?.approved === false && criticVerdict?.severity === 'HIGH') {
    reasons.push('AI critic rejected response (HIGH severity)');
  }

  // Trigger 5: Customer requests human
  if (requestsHuman(message)) {
    reasons.push('Customer explicitly requested human agent');
  }

  // Trigger 6: Security/fraud intent
  if (SECURITY_INTENTS.includes(intent) && urgency !== 'LOW') {
    reasons.push('Payment or security-related issue detected');
  }

  const should_escalate = reasons.length > 0;

  // Determine department (must match Escalation schema: SUPPORT, PAYMENTS, SECURITY, LEGAL, MANAGEMENT)
  let department = 'SUPPORT';
  if (reasons.some(r => r.toLowerCase().includes('fraud') || r.toLowerCase().includes('security'))) {
    department = 'SECURITY';
  } else if (reasons.some(r => r.toLowerCase().includes('payment') || r.toLowerCase().includes('billing'))) {
    department = 'PAYMENTS';
  } else if (reasons.some(r => r.toLowerCase().includes('legal'))) {
    department = 'LEGAL';
  } else {
    department = 'SUPPORT';
  }

  // Determine priority
  let priority = 'LOW';
  if (urgency === 'CRITICAL' || department === 'SECURITY') priority = 'CRITICAL';
  else if (urgency === 'HIGH') priority = 'HIGH';
  else if (should_escalate) priority = 'MEDIUM';

  return {
    should_escalate,
    reason: should_escalate ? reasons.join('; ') : null,
    priority,
    department: should_escalate ? department : null
  };
}

/**
 * Create an escalation record in MongoDB.
 *
 * @param {object} params
 * @param {string} params.conversationId - Conversation ID
 * @param {string} params.customerId - Customer user ID
 * @param {string} params.reason - Escalation reason
 * @param {string} params.priority - Priority level
 * @param {string} params.department - Target department
 * @returns {Promise<object>} - Created Escalation document
 */
async function createEscalation({ conversationId, customerId, reason, priority, department }) {
  try {
    const caseId = `CASE${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Normalize department to valid enum
    const validDepts = ['SUPPORT', 'PAYMENTS', 'SECURITY', 'LEGAL', 'MANAGEMENT'];
    const assignedDept = validDepts.includes(department?.toUpperCase())
      ? department.toUpperCase()
      : 'SUPPORT';

    const escalation = await Escalation.create({
      caseId,
      conversationId,
      customerId,
      reason,
      priority: priority || 'MEDIUM',
      department: assignedDept,
      status: 'open'
    });

    logger.info(`[escalationService] created escalation caseId="${caseId}" priority="${priority}"`);
    return escalation;
  } catch (err) {
    logger.error(`[escalationService] failed to create escalation: ${err.message}`);
    // Return a partial object so pipeline can continue
    return {
      caseId: `CASE${Date.now()}`,
      reason,
      priority,
      department: department || 'SUPPORT',
      status: 'open'
    };
  }
}

module.exports = { shouldEscalate, createEscalation, requestsHuman };
