/**
 * resolutionService.js
 * Step 6 of the SmartResolve AI pipeline.
 * Recommends the best resolution based on verified policy decision.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent, RESOLUTION_TYPES } = require('../prompts/resolutionPrompt');
const logger = require('../utils/logger');

/**
 * Recommend a resolution based on the policy decision.
 *
 * @param {object} params
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.context - Extracted context
 * @param {object} params.policyDecision - Output from policyService
 * @returns {Promise<{
 *   resolution: string,
 *   confidence: number,
 *   reasoning: string,
 *   steps: string[],
 *   customer_message_hint: string,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function recommendResolution({ intent, sentiment, urgency, context, policyDecision }) {
  // If policy already determined escalation, skip LLM and return ESCALATION directly
  if (policyDecision?.escalation_required) {
    logger.info('[resolutionService] Escalation required by policy, returning ESCALATION directly');
    return {
      resolution: 'ESCALATION',
      confidence: 0.99,
      reasoning: policyDecision.escalation_reason || 'Escalation required by policy',
      steps: ['Escalate to human agent', 'Create escalation case', 'Notify customer'],
      customer_message_hint: 'escalating to specialist',
      latency: 0,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent({ intent, sentiment, urgency, context, policyDecision });

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 400,
      serviceName: 'resolutionService'
    });

    const parsed = parseJSON(llmResult.content, {
      resolution: 'INFORMATION',
      confidence: 0.5,
      reasoning: 'Default resolution',
      steps: [],
      customer_message_hint: 'providing information'
    });

    const resolution = RESOLUTION_TYPES.includes(parsed.resolution)
      ? parsed.resolution
      : 'INFORMATION';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    logger.info(`[resolutionService] resolution="${resolution}" confidence=${confidence}`);

    return {
      resolution,
      confidence,
      reasoning: parsed.reasoning || '',
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      customer_message_hint: parsed.customer_message_hint || '',
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[resolutionService] error: ${err.message}`);
    throw Object.assign(new Error(`Resolution recommendation failed: ${err.message}`), {
      code: 'RESOLUTION_SERVICE_ERROR'
    });
  }
}

module.exports = { recommendResolution };
