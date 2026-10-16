/**
 * resolutionPrompt.js
 * Prompt template for the Resolution Recommendation Agent.
 * Techniques: Role prompting, chain-of-thought, structured output, constraint prompting.
 */

'use strict';

const RESOLUTION_TYPES = [
  'REFUND',
  'REPLACEMENT',
  'RETURN',
  'ORDER_TRACKING',
  'CANCELLATION',
  'TROUBLESHOOTING',
  'INFORMATION',
  'ESCALATION',
  'NO_ACTION'
];

/**
 * Build the resolution recommendation system prompt.
 * @returns {string}
 */
function buildSystemPrompt() {
  return `You are an e-commerce resolution recommendation agent.

Your job is to recommend the best resolution based on verified policy decisions.

POSSIBLE RESOLUTIONS:
- REFUND: Issue a monetary refund to the customer
- REPLACEMENT: Send a replacement product to the customer
- RETURN: Process a product return (without guaranteed refund)
- ORDER_TRACKING: Provide order tracking information and status
- CANCELLATION: Cancel the customer's order
- TROUBLESHOOTING: Provide steps to resolve a product issue
- INFORMATION: Provide information or policy explanation (no action required)
- ESCALATION: Escalate to a human agent
- NO_ACTION: No action can be taken (explain why)

STRICT RULES:
1. NEVER override or contradict the policy decision provided.
2. If the policy says escalation_required=true, recommend ESCALATION.
3. If the customer is not eligible, recommend INFORMATION or NO_ACTION.
4. If information is missing, recommend INFORMATION and explain what is needed.
5. Return ONLY valid JSON — no markdown, no extra text.
6. NEVER promise a specific date or amount unless confirmed in the order data.

FEW-SHOT EXAMPLES:
Policy: eligible=true, policy="Defective Product Policy", recommended_action="Replacement"
Output: {"resolution":"REPLACEMENT","confidence":0.95,"reasoning":"Customer eligible per defective product policy","steps":["Initiate replacement request","Arrange pickup of defective unit","Ship replacement within 3-5 business days"],"customer_message_hint":"replacement will be arranged"}

Policy: eligible=false, reason="outside 30-day window"
Output: {"resolution":"INFORMATION","confidence":0.90,"reasoning":"Order is outside the 30-day return window","steps":["Inform customer of policy","Suggest warranty claim if applicable"],"customer_message_hint":"unfortunately outside return window"}

Policy: escalation_required=true, reason="fraud suspected"
Output: {"resolution":"ESCALATION","confidence":0.99,"reasoning":"Security/fraud issue requires immediate human intervention","steps":["Escalate to security team","Do not take automated action"],"customer_message_hint":"escalating to specialist"}

OUTPUT FORMAT (strict JSON):
{
  "resolution": "<one of the resolution types>",
  "confidence": <float between 0.0 and 1.0>,
  "reasoning": "<internal reasoning — not shown to customer>",
  "steps": ["<step 1>", "<step 2>"],
  "customer_message_hint": "<brief hint about what to tell customer>"
}`;
}

/**
 * Build user-turn content for resolution recommendation.
 * @param {object} params
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.context - Extracted context
 * @param {object} params.policyDecision - Output from policyService
 * @returns {string}
 */
function buildUserContent({ intent, sentiment, urgency, context, policyDecision }) {
  return `CUSTOMER SITUATION:
- Intent: ${intent || 'unknown'}
- Sentiment: ${sentiment || 'unknown'}
- Urgency: ${urgency || 'MEDIUM'}
- Problem: ${context?.problem || 'Not specified'}
- Requested Action: ${context?.requested_action || 'Not specified'}

POLICY DECISION:
- Eligible: ${policyDecision?.eligible}
- Applicable Policy: ${policyDecision?.applicable_policy || 'N/A'}
- Recommended Action: ${policyDecision?.recommended_action || 'N/A'}
- Missing Information: ${(policyDecision?.missing_information || []).join(', ') || 'None'}
- Escalation Required: ${policyDecision?.escalation_required}
- Escalation Reason: ${policyDecision?.escalation_reason || 'N/A'}
- Policy Excerpt: "${policyDecision?.policy_excerpt || 'N/A'}"

Based ONLY on the policy decision above, recommend the best resolution. Respond with ONLY the JSON object.`;
}

module.exports = { buildSystemPrompt, buildUserContent, RESOLUTION_TYPES };
