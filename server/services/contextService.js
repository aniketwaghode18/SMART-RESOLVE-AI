/**
 * contextService.js
 * Step 4 of the SmartResolve AI pipeline.
 * Extracts structured context from the customer message.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent } = require('../prompts/contextPrompt');
const logger = require('../utils/logger');

/**
 * Extract structured context from the customer message.
 * Never invents data — all fields return null if not found.
 *
 * @param {string} message - Raw customer message
 * @param {string} intent - Detected intent (for context)
 * @param {string[]} [history] - Previous messages
 * @returns {Promise<{
 *   order_id: string|null,
 *   product_name: string|null,
 *   problem: string|null,
 *   requested_action: string|null,
 *   date_reference: string|null,
 *   amount: string|null,
 *   other_information: string[],
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function extractContext(message, intent, history = []) {
  const defaultContext = {
    order_id: null,
    product_name: null,
    problem: null,
    requested_action: null,
    date_reference: null,
    amount: null,
    other_information: []
  };

  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent(message, intent, history);

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.0,
      maxTokens: 400,
      serviceName: 'contextService'
    });

    const parsed = parseJSON(llmResult.content, defaultContext);

    // Sanitize: ensure all expected fields exist and types are correct
    const context = {
      order_id: typeof parsed.order_id === 'string' ? parsed.order_id.trim() || null : null,
      product_name: typeof parsed.product_name === 'string' ? parsed.product_name.trim() || null : null,
      problem: typeof parsed.problem === 'string' ? parsed.problem.trim() || null : null,
      requested_action: typeof parsed.requested_action === 'string' ? parsed.requested_action.trim() || null : null,
      date_reference: typeof parsed.date_reference === 'string' ? parsed.date_reference.trim() || null : null,
      amount: typeof parsed.amount === 'string' ? parsed.amount.trim() || null : null,
      other_information: Array.isArray(parsed.other_information) ? parsed.other_information : []
    };

    logger.info(`[contextService] extracted order_id="${context.order_id}" problem="${context.problem}"`);

    return {
      ...context,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[contextService] error: ${err.message}`);
    throw Object.assign(new Error(`Context extraction failed: ${err.message}`), {
      code: 'CONTEXT_SERVICE_ERROR'
    });
  }
}

module.exports = { extractContext };
