/**
 * llmService.js
 * LLM abstraction layer — supports OpenAI, Gemini, and offline demo mode.
 * No other module should call the LLM provider directly.
 */

'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');

// ─── Demo responses (offline / fallback mode) ──────────────────────────────────

const DEMO_RESPONSES = {
  intent: JSON.stringify({
    primary_intent: 'order_status',
    secondary_intent: 'delivery_delay',
    confidence: 0.87
  }),
  sentiment: JSON.stringify({
    sentiment: 'frustrated',
    confidence: 0.83
  }),
  urgency: JSON.stringify({
    urgency: 'MEDIUM',
    confidence: 0.80,
    reasoning: 'Customer is asking about a delayed delivery'
  }),
  context: JSON.stringify({
    order_id: null,
    product_name: null,
    problem: 'order not received',
    requested_action: 'status update',
    date_reference: null,
    other_information: []
  }),
  policy: JSON.stringify({
    eligible: true,
    applicable_policy: 'Standard Shipping Policy',
    recommended_action: 'Provide order status and tracking information',
    missing_information: [],
    escalation_required: false,
    confidence: 0.85
  }),
  resolution: JSON.stringify({
    resolution: 'ORDER_TRACKING',
    confidence: 0.88,
    reasoning: 'Customer needs order status update',
    steps: ['Check order status', 'Provide tracking link', 'Give estimated delivery']
  }),
  response: 'Thank you for reaching out to SmartResolve AI. I understand your concern about your order. Let me look into this for you. Based on our records, your order is currently being processed. If you have your order ID, please share it and I will provide you with exact tracking details and the latest status update.',
  critic: JSON.stringify({
    approved: true,
    issues: [],
    severity: 'LOW',
    corrected_response_required: false
  }),
  escalation: JSON.stringify({
    should_escalate: false,
    reason: null,
    priority: 'LOW',
    department: null
  })
};

// ─── Provider: OpenAI ─────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt, userContent, options = {}) {
  const apiKey = env.openai?.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY is not configured in .env. Please set a valid key to use OpenAI API.');
  }

  const { OpenAI } = require('openai');
  const client = new OpenAI({ apiKey });

  const model = env.openai?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const startTime = Date.now();

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1024,
    response_format: options.jsonMode ? { type: 'json_object' } : undefined
  });

  const latency = Date.now() - startTime;
  const content = completion.choices[0]?.message?.content?.trim() || '';
  const usage = completion.usage || {};

  return {
    content,
    latency,
    tokens: {
      prompt: usage.prompt_tokens || 0,
      completion: usage.completion_tokens || 0,
      total: usage.total_tokens || 0
    },
    provider: 'openai',
    model
  };
}

// ─── Provider: Gemini ─────────────────────────────────────────────────────────

async function callGemini(systemPrompt, userContent, options = {}) {
  const apiKey = env.gemini?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please set a valid key to use Gemini API.');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName = env.gemini?.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const generationConfig = {
    temperature: options.temperature ?? 0.2,
    maxOutputTokens: Math.max(options.maxTokens || 1024, 800)
  };

  if (options.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
    generationConfig
  });

  const startTime = Date.now();
  let result;
  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      result = await model.generateContent(userContent);
      break;
    } catch (err) {
      lastErr = err;
      const isTransient = err.message?.includes('503') || err.message?.includes('429') || err.message?.includes('demand');
      if (isTransient && attempt < 3) {
        logger.warn(`[llmService] Gemini transient error on attempt ${attempt}: ${err.message}. Retrying in ${attempt * 1000}ms...`);
        await new Promise(r => setTimeout(r, attempt * 1000));
      } else {
        throw err;
      }
    }
  }

  const response = await result.response;
  const latency = Date.now() - startTime;
  const content = response.text()?.trim() || '';
  const usage = response.usageMetadata || {};

  return {
    content,
    latency,
    tokens: {
      prompt: usage.promptTokenCount || 0,
      completion: usage.candidatesTokenCount || 0,
      total: usage.totalTokenCount || 0
    },
    provider: 'gemini',
    model: modelName
  };
}

// ─── Provider: Demo (offline fallback) ────────────────────────────────────────

async function callDemo(systemPrompt, _userContent, options = {}) {
  // Simulate a small network delay
  await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

  // Determine demo response by serviceName or systemPrompt
  let service = options.serviceName ? options.serviceName.replace(/Service$/i, '').toLowerCase() : '';
  if (!service || !DEMO_RESPONSES[service]) {
    const lowerPrompt = systemPrompt.toLowerCase();
    if (lowerPrompt.includes('intent classifier')) service = 'intent';
    else if (lowerPrompt.includes('sentiment classifier')) service = 'sentiment';
    else if (lowerPrompt.includes('urgency classifier')) service = 'urgency';
    else if (lowerPrompt.includes('extract structured information')) service = 'context';
    else if (lowerPrompt.includes('policy-grounded')) service = 'policy';
    else if (lowerPrompt.includes('resolution recommendation')) service = 'resolution';
    else if (lowerPrompt.includes('critic')) service = 'critic';
    else if (lowerPrompt.includes('escalat')) service = 'escalation';
    else service = 'response';
  }

  let content = DEMO_RESPONSES[service] || DEMO_RESPONSES.response;

  return {
    content,
    latency: Math.floor(300 + Math.random() * 200),
    tokens: { prompt: 150, completion: 80, total: 230 },
    provider: 'demo',
    model: 'demo-v1'
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call the configured LLM provider.
 *
 * @param {string} systemPrompt  - The system / instruction prompt
 * @param {string} userContent   - The user turn (message + context)
 * @param {object} options       - { temperature, maxTokens, jsonMode, serviceName }
 * @returns {Promise<{ content: string, latency: number, tokens: object, provider: string, model: string }>}
 */
async function callLLM(systemPrompt, userContent, options = {}) {
  const provider = (env.llmProvider || process.env.LLM_PROVIDER || 'demo').toLowerCase();
  const service = options.serviceName || 'unknown';

  logger.info(`[llmService] calling provider="${provider}" service="${service}"`);

  let result;
  try {
    if (provider === 'openai') {
      result = await callOpenAI(systemPrompt, userContent, options);
    } else if (provider === 'gemini') {
      result = await callGemini(systemPrompt, userContent, options);
    } else {
      result = await callDemo(systemPrompt, userContent, options);
    }
  } catch (err) {
    logger.error(`[llmService] provider="${provider}" error: ${err.message}`);
    throw Object.assign(new Error(`LLM provider error: ${err.message}`), {
      code: 'LLM_PROVIDER_ERROR',
      provider
    });
  }

  logger.info(`[llmService] service="${service}" latency=${result.latency}ms tokens=${result.tokens.total}`);
  return result;
}

/**
 * Parse a JSON response from the LLM, with graceful fallback.
 *
 * @param {string} rawContent - Raw LLM output
 * @param {object} fallback   - Fallback object if parse fails
 * @returns {object}
 */
function parseJSON(rawContent, fallback = {}) {
  if (!rawContent || typeof rawContent !== 'string') return fallback;
  try {
    // Strip markdown code fences if present
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    try {
      // Find JSON object or array substring if LLM output included conversational text
      const match = rawContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch {
      // Fallback
    }
    logger.warn(`[llmService] JSON parse failed, using fallback. Raw: ${rawContent?.substring(0, 120)}`);
    return fallback;
  }
}

module.exports = { callLLM, parseJSON };
