/**
 * policyPrompt.js
 * Prompt template for the Policy Decision Agent (RAG step).
 * Techniques: Role prompting, RAG (policy injection), structured output, constraint prompting.
 */

'use strict';

/**
 * Build the policy evaluation system prompt.
 * @returns {string}
 */
function buildSystemPrompt() {
  return `You are a policy-grounded e-commerce decision agent.

Your job is to evaluate the customer's situation against the provided company policies and determine eligibility for the requested action.

STRICT RULES:
1. Use ONLY the information provided: customer data, order data, product data, and retrieved policy.
2. NEVER invent a policy. If no policy covers this situation, say so.
3. NEVER make decisions that contradict the provided policy.
4. If critical information is missing (e.g., order ID unknown), list it in missing_information.
5. Return ONLY valid JSON — no markdown, no extra text.

COMPANY POLICY RULES (always apply unless retrieved policy overrides):
- Returns are accepted within 30 days of delivery.
- Defective products are eligible for return/replacement within the return period.
- Wrong products are eligible for return or replacement.
- Damaged products are eligible for return or replacement.
- Refunds are issued for approved returns, defective products, wrong products, and eligible cancellations.
- Cancellations are allowed before shipment only.
- Security/fraud issues must ALWAYS be escalated to a human agent.
- Do NOT ask for or confirm passwords, CVV, full card numbers, or OTPs.

OUTPUT FORMAT (strict JSON):
{
  "eligible": <true | false | null>,
  "applicable_policy": "<policy name or 'No applicable policy found'>",
  "recommended_action": "<what the policy says should happen>",
  "missing_information": ["<list of info needed to make decision>"],
  "escalation_required": <true | false>,
  "escalation_reason": "<reason if escalation_required is true, else null>",
  "confidence": <float between 0.0 and 1.0>,
  "policy_excerpt": "<relevant excerpt from the retrieved policy>"
}`;
}

/**
 * Build user-turn content for policy evaluation.
 * @param {object} params
 * @param {string} params.message - Customer message
 * @param {string} params.intent - Detected intent
 * @param {string} params.sentiment - Detected sentiment
 * @param {string} params.urgency - Detected urgency
 * @param {object} params.context - Extracted context
 * @param {object|null} params.order - Order data from DB (or null)
 * @param {object|null} params.customer - Customer data from DB (or null)
 * @param {object|null} params.policy - Retrieved policy document (or null)
 * @returns {string}
 */
function buildUserContent({ message, intent, sentiment, urgency, context, order, customer, policy }) {
  const orderInfo = order
    ? `ORDER DATA:
- Order ID: ${order.orderId || 'N/A'}
- Product: ${order.productName || order.productId || 'N/A'}
- Status: ${order.status || 'N/A'}
- Order Date: ${order.orderDate ? new Date(order.orderDate).toDateString() : 'N/A'}
- Shipping Date: ${order.shippingDate ? new Date(order.shippingDate).toDateString() : 'N/A'}
- Expected Delivery: ${order.expectedDelivery ? new Date(order.expectedDelivery).toDateString() : 'N/A'}
- Actual Delivery: ${order.actualDelivery ? new Date(order.actualDelivery).toDateString() : 'Not yet delivered'}
- Amount: ${order.totalAmount ? `₹${order.totalAmount}` : 'N/A'}
- Payment Method: ${order.paymentMethod || 'N/A'}`
    : 'ORDER DATA: Not found or not provided';

  const customerInfo = customer
    ? `CUSTOMER DATA:
- Name: ${customer.name || 'N/A'}
- Membership: ${customer.membershipLevel || 'standard'}
- Member Since: ${customer.createdAt ? new Date(customer.createdAt).toDateString() : 'N/A'}`
    : 'CUSTOMER DATA: Not available';

  const policyInfo = policy
    ? `RETRIEVED POLICY:
Title: ${policy.title || 'N/A'}
Category: ${policy.category || 'N/A'}
Content: ${policy.content || 'N/A'}`
    : 'RETRIEVED POLICY: No specific policy found. Apply general company policy rules.';

  return `CUSTOMER MESSAGE: "${message}"

DETECTED INTENT: ${intent || 'unknown'}
DETECTED SENTIMENT: ${sentiment || 'unknown'}
DETECTED URGENCY: ${urgency || 'MEDIUM'}

EXTRACTED CONTEXT:
- Problem: ${context?.problem || 'Not specified'}
- Requested Action: ${context?.requested_action || 'Not specified'}
- Order ID mentioned: ${context?.order_id || 'Not mentioned'}
- Product mentioned: ${context?.product_name || 'Not mentioned'}

${customerInfo}

${orderInfo}

${policyInfo}

Evaluate eligibility and respond with ONLY the JSON object.`;
}

module.exports = { buildSystemPrompt, buildUserContent };
