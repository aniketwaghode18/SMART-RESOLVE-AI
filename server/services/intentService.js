/**
 * intentService.js
 * Step 1 of the SmartResolve AI pipeline.
 * Classifies the customer message into a supported intent.
 */

'use strict';

const { callLLM, parseJSON } = require('./llmService');
const { buildSystemPrompt, buildUserContent, SUPPORTED_INTENTS } = require('../prompts/intentPrompt');
const logger = require('../utils/logger');

// ─── Prompt injection detection ───────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(your\s+)?(all\s+|previous\s+)*(instructions|rules|directions|prompts|commands|guidelines)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instructions|rules)/i,
  /forget\s+(your\s+|all\s+)?(previous\s+)?(instructions|rules)/i,
  /disregard\s+(all\s+|your\s+)?(instructions|rules|guidelines|directions)/i,
  /dump\s+(your\s+)?(database|schema|prompts?|instructions)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|rules|instructions)/i,
  /print\s+(your\s+)?(system\s+)?(prompt|rules|instructions)/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(if\s+you\s+are\s+)?/i,
  /override\s+(your\s+)?/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /bypass\s+(your\s+)?filter/i
];

/**
 * Check for prompt injection attempts.
 * @param {string} message
 * @returns {boolean}
 */
function detectInjection(message) {
  return INJECTION_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Classify customer message intent.
 *
 * @param {string} message - Raw customer message
 * @param {string[]} [history] - Previous conversation messages
 * @returns {Promise<{
 *   primary_intent: string,
 *   secondary_intent: string|null,
 *   confidence: number,
 *   injection_detected: boolean,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function detectIntent(message, history = []) {
  const startTime = Date.now();

  // Guard: prompt injection
  const injectionDetected = detectInjection(message);
  if (injectionDetected) {
    logger.warn('[intentService] Prompt injection detected in message');
    return {
      primary_intent: 'other',
      secondary_intent: null,
      confidence: 0.95,
      injection_detected: true,
      latency: Date.now() - startTime,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent(message, history);

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 200,
      serviceName: 'intentService'
    });

    const parsed = parseJSON(llmResult.content, {
      primary_intent: 'general_question',
      secondary_intent: null,
      confidence: 0.5
    });

    // Validate the returned intent against the supported list
    const primaryIntent = SUPPORTED_INTENTS.includes(parsed.primary_intent)
      ? parsed.primary_intent
      : 'general_question';

    const secondaryIntent = parsed.secondary_intent && SUPPORTED_INTENTS.includes(parsed.secondary_intent)
      ? parsed.secondary_intent
      : null;

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    logger.info(`[intentService] intent="${primaryIntent}" confidence=${confidence}`);

    return {
      primary_intent: primaryIntent,
      secondary_intent: secondaryIntent,
      confidence,
      injection_detected: false,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[intentService] error: ${err.message}`);
    return {
      primary_intent: 'general_question',
      secondary_intent: null,
      confidence: 0.6,
      injection_detected: false,
      latency: Date.now() - startTime,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }
}

module.exports = { detectIntent, detectInjection };
