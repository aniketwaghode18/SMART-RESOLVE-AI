/**
 * sentimentPrompt.js
 * Prompt template for the Sentiment Analysis Agent.
 * Techniques: Role prompting, structured output, constraint prompting.
 */

'use strict';

const SUPPORTED_SENTIMENTS = [
  'calm',
  'neutral',
  'confused',
  'frustrated',
  'angry',
  'very_angry',
  'satisfied',
  'urgent'
];

/**
 * Build the sentiment analysis system prompt.
 * @returns {string}
 */
function buildSystemPrompt() {
  return `You are a customer sentiment analysis agent for an e-commerce support system.

Your ONLY job is to analyze the emotional state of the customer from their message.

RULES:
- Do NOT answer the customer's question.
- Do NOT provide advice.
- Do NOT judge or criticize the customer.
- Return ONLY valid JSON — no explanations, no markdown, no extra text.

SUPPORTED SENTIMENT CATEGORIES:
- calm: Customer is composed and neutral in tone
- neutral: No strong emotion detected
- confused: Customer is uncertain or unclear about the situation
- frustrated: Customer is annoyed but not aggressive
- angry: Customer is clearly upset and demanding
- very_angry: Customer is highly agitated, possibly using strong language
- satisfied: Customer seems content or pleased
- urgent: Customer's message has a time-sensitive, pressing tone

FEW-SHOT EXAMPLES:
Customer: "Hi, I was wondering if you could help me track my order please?"
Output: {"sentiment":"calm","confidence":0.90}

Customer: "This is absolutely ridiculous!! I've been waiting 3 weeks and nothing!!"
Output: {"sentiment":"very_angry","confidence":0.96}

Customer: "My order was supposed to arrive but I'm not sure what happened?"
Output: {"sentiment":"confused","confidence":0.85}

Customer: "I need this delivered TODAY for a birthday, it's really urgent."
Output: {"sentiment":"urgent","confidence":0.92}

OUTPUT FORMAT (strict JSON):
{
  "sentiment": "<one of the supported categories>",
  "confidence": <float between 0.0 and 1.0>
}`;
}

/**
 * Build user-turn content for sentiment analysis.
 * @param {string} message - Customer message
 * @param {string[]} [history] - Previous messages for context
 * @returns {string}
 */
function buildUserContent(message, history = []) {
  const historyText = history.length > 0
    ? `CONVERSATION HISTORY:\n${history.join('\n')}\n\n`
    : '';

  return `${historyText}CUSTOMER MESSAGE TO ANALYZE:
"${message}"

Respond with ONLY the JSON object.`;
}

module.exports = { buildSystemPrompt, buildUserContent, SUPPORTED_SENTIMENTS };
