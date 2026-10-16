/**
 * criticService.js
 * Step 8 of the SmartResolve AI pipeline.
 * Reviews the generated response for policy compliance, accuracy, and safety.
 * Implements self-critique with single-retry logic.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent } = require('../prompts/criticPrompt');
const logger = require('../utils/logger');

/**
 * Review a proposed response and return critic verdict.
 *
 * @param {object} params
 * @param {string} params.proposedResponse - Response to review
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {object} params.policyDecision - Policy decision context
 * @param {object} params.resolution - Resolution context
 * @param {boolean} params.escalated - Whether case is escalated
 * @returns {Promise<{
 *   approved: boolean,
 *   issues: string[],
 *   severity: string,
 *   corrected_response_required: boolean,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function reviewResponse({ proposedResponse, intent, sentiment, policyDecision, resolution, escalated }) {
  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent({
      proposedResponse,
      intent,
      sentiment,
      policyDecision,
      resolution,
      escalated
    });

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 300,
      serviceName: 'criticService'
    });

    const parsed = parseJSON(llmResult.content, {
      approved: true,
      issues: [],
      severity: 'LOW',
      corrected_response_required: false
    });

    const approved = Boolean(parsed.approved);
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const severity = ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.severity) ? parsed.severity : 'LOW';
    const corrected_response_required = Boolean(parsed.corrected_response_required);

    logger.info(`[criticService] approved=${approved} severity="${severity}" issues=${issues.length}`);

    return {
      approved,
      issues,
      severity,
      corrected_response_required,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[criticService] error: ${err.message}`);
    // On error, approve to avoid blocking the customer (but log prominently)
    logger.warn('[criticService] Approving response due to critic error (fail-open)');
    return {
      approved: true,
      issues: ['Critic service error — unable to review'],
      severity: 'LOW',
      corrected_response_required: false,
      latency: 0,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }
}

module.exports = { reviewResponse };
