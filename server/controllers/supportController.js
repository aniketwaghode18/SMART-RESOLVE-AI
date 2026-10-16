/**
 * supportController.js
 * Orchestrates the complete 9-step SmartResolve AI pipeline.
 *
 * POST /api/support/message
 * POST /api/support/conversation/start
 * GET  /api/support/conversation/:conversationId/history
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

// Models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AIAnalysis = require('../models/AIAnalysis');

// Pipeline services
const { detectIntent } = require('../services/intentService');
const { detectSentiment } = require('../services/sentimentService');
const { detectUrgency } = require('../services/urgencyService');
const { extractContext } = require('../services/contextService');
const { evaluatePolicy } = require('../services/policyService');
const { recommendResolution } = require('../services/resolutionService');
const { generateResponse } = require('../services/responseService');
const { reviewResponse } = require('../services/criticService');
const { shouldEscalate, createEscalation } = require('../services/escalationService');

const helpers = require('../utils/helpers');
const logger = require('../utils/logger');

// ─── Max message length guard ─────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 2000;

// ─── POST /api/support/message ────────────────────────────────────────────────

/**
 * Process a customer message through the full 9-step AI pipeline.
 */
async function processMessage(req, res, next) {
  const pipelineStart = Date.now();

  try {
    const { conversationId, message } = req.body;
    const customerId = req.user?._id || req.user?.id;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!conversationId || typeof conversationId !== 'string') {
      return helpers.errorResponse(res, 'INVALID_INPUT', 'conversationId is required', 400);
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return helpers.errorResponse(res, 'INVALID_INPUT', 'message is required and cannot be empty', 400);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return helpers.errorResponse(res, 'MESSAGE_TOO_LONG', `Message exceeds ${MAX_MESSAGE_LENGTH} characters`, 400);
    }

    const trimmedMessage = message.trim();

    // ── Step 0: Verify/create conversation ───────────────────────────────────
    let conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      conversation = await Conversation.create({
        conversationId,
        customerId,
        status: 'active',
        subject: trimmedMessage.substring(0, 80)
      });
    }

    // ── Step 0b: Save customer message ───────────────────────────────────────
    const customerMessage = await Message.create({
      conversationId,
      sender: 'customer',
      message: trimmedMessage,
      metadata: { source: 'web_chat' }
    });

    // ── Step 0c: Load conversation history ────────────────────────────────────
    const recentMessages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const historyTexts = recentMessages
      .reverse()
      .filter(m => m._id.toString() !== customerMessage._id.toString())
      .map(m => `${m.sender === 'customer' ? 'Customer' : 'AI'}: ${m.message}`);

    // ── Step 1: Intent Detection ──────────────────────────────────────────────
    logger.info(`[pipeline] step=1 intent conversationId="${conversationId}"`);
    const intentResult = await detectIntent(trimmedMessage, historyTexts);

    // ── Step 2: Sentiment Detection ───────────────────────────────────────────
    logger.info(`[pipeline] step=2 sentiment`);
    const sentimentResult = await detectSentiment(trimmedMessage, historyTexts);

    // ── Step 3: Urgency Detection ─────────────────────────────────────────────
    logger.info(`[pipeline] step=3 urgency`);
    const urgencyResult = await detectUrgency(trimmedMessage, sentimentResult.sentiment, historyTexts);

    // ── Step 4: Context Extraction ────────────────────────────────────────────
    logger.info(`[pipeline] step=4 context`);
    const contextResult = await extractContext(trimmedMessage, intentResult.primary_intent, historyTexts);

    // ── Step 5: Policy Retrieval + Eligibility Evaluation (RAG) ──────────────
    logger.info(`[pipeline] step=5 policy`);
    const policyResult = await evaluatePolicy({
      message: trimmedMessage,
      intent: intentResult.primary_intent,
      sentiment: sentimentResult.sentiment,
      urgency: urgencyResult.urgency,
      context: contextResult,
      customerId: customerId?.toString()
    });

    // ── Step 6: Resolution Recommendation ────────────────────────────────────
    logger.info(`[pipeline] step=6 resolution`);
    const resolutionResult = await recommendResolution({
      intent: intentResult.primary_intent,
      sentiment: sentimentResult.sentiment,
      urgency: urgencyResult.urgency,
      context: contextResult,
      policyDecision: policyResult
    });

    // ── Step 7: Escalation Decision (pre-response) ────────────────────────────
    logger.info(`[pipeline] step=7 escalation check`);
    const escalationDecision = shouldEscalate({
      message: trimmedMessage,
      intent: intentResult.primary_intent,
      intentConfidence: intentResult.confidence,
      urgency: urgencyResult.urgency,
      policyDecision: policyResult,
      criticVerdict: { approved: true, severity: 'LOW' } // pre-critic placeholder
    });

    // Create escalation record if needed
    let escalationRecord = null;
    if (escalationDecision.should_escalate) {
      escalationRecord = await createEscalation({
        conversationId,
        customerId: customerId?.toString(),
        reason: escalationDecision.reason,
        priority: escalationDecision.priority,
        department: escalationDecision.department
      });

      // Update conversation status
      await Conversation.findOneAndUpdate(
        { conversationId },
        { status: 'escalated', updatedAt: new Date() }
      );
    }

    // ── Step 8: Response Generation ───────────────────────────────────────────
    logger.info(`[pipeline] step=8 response generation`);
    const responseResult = await generateResponse({
      message: trimmedMessage,
      intent: intentResult.primary_intent,
      sentiment: sentimentResult.sentiment,
      urgency: urgencyResult.urgency,
      context: contextResult,
      policyDecision: policyResult,
      resolution: resolutionResult,
      order: policyResult.order,
      history: historyTexts,
      escalated: escalationDecision.should_escalate,
      caseId: escalationRecord?.caseId || null,
      injectionDetected: intentResult.injection_detected
    });

    // ── Step 9: Critic Review ─────────────────────────────────────────────────
    logger.info(`[pipeline] step=9 critic review`);
    let finalResponse = responseResult.response;
    let criticResult = await reviewResponse({
      proposedResponse: responseResult.response,
      intent: intentResult.primary_intent,
      sentiment: sentimentResult.sentiment,
      policyDecision: policyResult,
      resolution: resolutionResult,
      escalated: escalationDecision.should_escalate
    });

    // Single retry if critic rejects with HIGH severity
    if (!criticResult.approved && criticResult.severity === 'HIGH') {
      logger.warn('[pipeline] critic rejected response, retrying response generation');
      const retryResponse = await generateResponse({
        message: trimmedMessage,
        intent: intentResult.primary_intent,
        sentiment: sentimentResult.sentiment,
        urgency: urgencyResult.urgency,
        context: contextResult,
        policyDecision: policyResult,
        resolution: resolutionResult,
        order: policyResult.order,
        history: historyTexts,
        escalated: escalationDecision.should_escalate,
        caseId: escalationRecord?.caseId || null,
        injectionDetected: intentResult.injection_detected
      });

      finalResponse = retryResponse.response;

      // Re-review
      criticResult = await reviewResponse({
        proposedResponse: finalResponse,
        intent: intentResult.primary_intent,
        sentiment: sentimentResult.sentiment,
        policyDecision: policyResult,
        resolution: resolutionResult,
        escalated: escalationDecision.should_escalate
      });
    }

    // ── Save AI message ───────────────────────────────────────────────────────
    const aiMessage = await Message.create({
      conversationId,
      sender: 'ai',
      message: finalResponse,
      metadata: {
        intent: intentResult.primary_intent,
        sentiment: sentimentResult.sentiment,
        urgency: urgencyResult.urgency,
        resolution: resolutionResult.resolution,
        escalated: escalationDecision.should_escalate
      }
    });

    // ── Calculate total pipeline latency + tokens ─────────────────────────────
    const totalLatency = Date.now() - pipelineStart;
    const totalTokens =
      (intentResult.tokens?.total || 0) +
      (sentimentResult.tokens?.total || 0) +
      (urgencyResult.tokens?.total || 0) +
      (contextResult.tokens?.total || 0) +
      (policyResult.tokens?.total || 0) +
      (resolutionResult.tokens?.total || 0) +
      (responseResult.tokens?.total || 0) +
      (criticResult.tokens?.total || 0);

    // ── Save AI Analysis ──────────────────────────────────────────────────────
    await AIAnalysis.create({
      conversationId,
      messageId: aiMessage._id,
      intent: intentResult.primary_intent,
      intentConfidence: intentResult.confidence,
      secondaryIntent: intentResult.secondary_intent || '',
      sentiment: sentimentResult.sentiment,
      sentimentConfidence: sentimentResult.confidence,
      urgency: urgencyResult.urgency,
      urgencyConfidence: urgencyResult.confidence,
      extractedContext: contextResult,
      policyUsed: policyResult.applicable_policy || '',
      policyId: policyResult.policy?._id?.toString() || '',
      resolution: resolutionResult.resolution,
      resolutionConfidence: resolutionResult.confidence,
      criticApproved: criticResult.approved,
      criticIssues: criticResult.issues || [],
      criticSeverity: criticResult.severity || 'LOW',
      escalated: escalationDecision.should_escalate,
      escalationReason: escalationDecision.reason || '',
      promptInjectionDetected: intentResult.injection_detected,
      latency: totalLatency,
      tokenUsage: totalTokens
    });

    logger.info(`[pipeline] complete conversationId="${conversationId}" latency=${totalLatency}ms escalated=${escalationDecision.should_escalate}`);

    // ── Build response ─────────────────────────────────────────────────────
    return helpers.successResponse(res, {
      message: finalResponse,
      analysis: {
        intent: intentResult.primary_intent,
        intentConfidence: intentResult.confidence,
        sentiment: sentimentResult.sentiment,
        urgency: urgencyResult.urgency,
        resolution: resolutionResult.resolution,
        policyApplied: policyResult.applicable_policy,
        criticApproved: criticResult.approved,
        injectionDetected: intentResult.injection_detected
      },
      escalated: escalationDecision.should_escalate,
      escalation: escalationDecision.should_escalate ? {
        caseId: escalationRecord?.caseId,
        priority: escalationDecision.priority,
        department: escalationDecision.department,
        reason: escalationDecision.reason
      } : null,
      conversationId,
      latency: totalLatency
    });
  } catch (err) {
    logger.error(`[supportController] pipeline error: ${err.message}`);
    next(err);
  }
}

// ─── POST /api/support/conversation/start ─────────────────────────────────────

/**
 * Start a new conversation for the authenticated customer.
 */
async function startConversation(req, res, next) {
  try {
    const customerId = req.user?._id || req.user?.id;
    const { subject } = req.body;

    const conversationId = `conv_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    const conversation = await Conversation.create({
      conversationId,
      customerId,
      status: 'active',
      subject: subject || 'Customer Support Request'
    });

    return helpers.successResponse(res, {
      conversationId: conversation.conversationId,
      status: conversation.status,
      subject: conversation.subject,
      createdAt: conversation.createdAt
    }, 201);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/support/conversation/:conversationId/history ────────────────────

/**
 * Get conversation history for a conversation.
 */
async function getHistory(req, res, next) {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .lean();

    const analysis = await AIAnalysis.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    return helpers.successResponse(res, {
      conversationId,
      messages: messages.map(m => ({
        id: m._id,
        sender: m.sender,
        message: m.message,
        timestamp: m.timestamp,
        metadata: m.metadata
      })),
      latestAnalysis: analysis[0] || null
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { processMessage, startConversation, getHistory };
