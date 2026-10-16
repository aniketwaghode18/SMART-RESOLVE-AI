/**
 * sentimentService.js
 * Step 2 of the SmartResolve AI pipeline.
 * Analyzes customer sentiment from the message.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent, SUPPORTED_SENTIMENTS } = require('../prompts/sentimentPrompt');
const logger = require('../utils/logger');

/**
 * Detect sentiment in a customer message.
 *
 * @param {string} message - Raw customer message
 * @param {string[]} [history] - Previous conversation messages
 * @returns {Promise<{
 *   sentiment: string,
 *   confidence: number,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function detectSentiment(message, history = []) {
  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent(message, history);

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 100,
      serviceName: 'sentimentService'
    });

    const parsed = parseJSON(llmResult.content, {
      sentiment: 'neutral',
      confidence: 0.5
    });

    const sentiment = SUPPORTED_SENTIMENTS.includes(parsed.sentiment)
      ? parsed.sentiment
      : 'neutral';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    logger.info(`[sentimentService] sentiment="${sentiment}" confidence=${confidence}`);

    return {
      sentiment,
      confidence,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[sentimentService] error: ${err.message}`);
    throw Object.assign(new Error(`Sentiment detection failed: ${err.message}`), {
      code: 'SENTIMENT_SERVICE_ERROR'
    });
  }
}

module.exports = { detectSentiment };
