/**
 * urgencyService.js
 * Step 3 of the SmartResolve AI pipeline.
 * Detects urgency level of the customer's issue.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent, URGENCY_LEVELS } = require('../prompts/urgencyPrompt');
const logger = require('../utils/logger');

/**
 * Detect urgency level of the customer's issue.
 *
 * @param {string} message - Raw customer message
 * @param {string} sentiment - Detected sentiment (from sentimentService)
 * @param {string[]} [history] - Previous conversation messages
 * @returns {Promise<{
 *   urgency: string,
 *   confidence: number,
 *   reasoning: string,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function detectUrgency(message, sentiment, history = []) {
  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent(message, sentiment, history);

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 200,
      serviceName: 'urgencyService'
    });

    const parsed = parseJSON(llmResult.content, {
      urgency: 'MEDIUM',
      confidence: 0.5,
      reasoning: 'Defaulted to MEDIUM urgency'
    });

    const urgency = URGENCY_LEVELS.includes(parsed.urgency)
      ? parsed.urgency
      : 'MEDIUM';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    // Override: if sentiment is very_angry and confidence was low, bump urgency
    let finalUrgency = urgency;
    if (sentiment === 'very_angry' && urgency === 'LOW') {
      finalUrgency = 'MEDIUM';
      logger.info('[urgencyService] Bumped urgency from LOW to MEDIUM due to very_angry sentiment');
    }

    logger.info(`[urgencyService] urgency="${finalUrgency}" confidence=${confidence}`);

    return {
      urgency: finalUrgency,
      confidence,
      reasoning: parsed.reasoning || '',
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[urgencyService] error: ${err.message}`);
    throw Object.assign(new Error(`Urgency detection failed: ${err.message}`), {
      code: 'URGENCY_SERVICE_ERROR'
    });
  }
}

module.exports = { detectUrgency };
