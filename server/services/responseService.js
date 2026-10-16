/**
 * responseService.js
 * Step 7 of the SmartResolve AI pipeline.
 * Generates the customer-facing response using all pipeline outputs.
 */

'use strict';

const { callLLM } = require('./llmService');
const { buildSystemPrompt, buildUserContent } = require('../prompts/responsePrompt');
const logger = require('../utils/logger');

// Escalation response template (injected before LLM, no hallucination risk)
const INJECTION_BLOCKED_RESPONSE =
  "I'm sorry, I can't provide internal system instructions. However, I'm here to help you with your order or any support request. How can I assist you today?";

/**
 * Generate a customer-facing support response.
 *
 * @param {object} params
 * @param {string} params.message - Customer message
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.context - Extracted context
 * @param {object} params.policyDecision - Output from policyService
 * @param {object} params.resolution - Output from resolutionService
 * @param {object|null} params.order - Order data (or null)
 * @param {string[]} params.history - Recent conversation messages
 * @param {boolean} params.escalated - Whether this case is being escalated
 * @param {string|null} params.caseId - Escalation case ID (if escalated)
 * @param {boolean} params.injectionDetected - Whether injection was detected
 * @returns {Promise<{
 *   response: string,
 *   latency: number,
 *   tokens: object
 * }>}
 */
async function generateResponse({
  message,
  intent,
  sentiment,
  urgency,
  context,
  policyDecision,
  resolution,
  order,
  history = [],
  escalated = false,
  caseId = null,
  injectionDetected = false
}) {
  // Prompt injection: return safe canned response, never pass to LLM
  if (injectionDetected) {
    logger.warn('[responseService] Blocked injection — returning canned response');
    return {
      response: INJECTION_BLOCKED_RESPONSE,
      latency: 0,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildUserContent({
      message,
      intent,
      sentiment,
      urgency,
      context,
      policyDecision,
      resolution,
      order,
      history,
      escalated,
      caseId
    });

    const llmResult = await callLLM(systemPrompt, userContent, {
      jsonMode: false,
      temperature: 0.4,
      maxTokens: 600,
      serviceName: 'responseService'
    });

    const response = llmResult.content?.trim() || 'I apologize, but I was unable to generate a response. Please try again or contact a support agent.';

    logger.info(`[responseService] response generated (${response.length} chars)`);

    return {
      response,
      latency: llmResult.latency,
      tokens: llmResult.tokens
    };
  } catch (err) {
    logger.error(`[responseService] error: ${err.message}`);
    return {
      response: "Thank you for reaching out to SmartResolve AI support. I have received your request regarding your order. Let me look into this for you. If you have any additional details or photos, please feel free to share them so we can assist you promptly.",
      latency: 0,
      tokens: { prompt: 0, completion: 0, total: 0 }
    };
  }
}

module.exports = { generateResponse };
