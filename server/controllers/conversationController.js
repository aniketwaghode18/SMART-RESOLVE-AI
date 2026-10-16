/**
 * conversationController.js
 * Controller for managing customer support conversations and messages.
 */

'use strict';

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AIAnalysis = require('../models/AIAnalysis');
const Escalation = require('../models/Escalation');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const VALID_STATUSES = ['active', 'resolved', 'escalated', 'closed'];

/**
 * GET /api/conversations
 * List conversations. Customers see their own, agents/admins see all with filters.
 */
async function getConversations(req, res, next) {
  try {
    const { role, _id: userId } = req.user;
    const { status, customerId, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role === 'customer') {
      query.customerId = userId;
    } else if (customerId) {
      query.customerId = customerId;
    }

    if (status && VALID_STATUSES.includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    if (search) {
      query.$or = [
        { conversationId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('customerId', 'name email membershipLevel')
      .lean();

    // Attach latest message snippet to each conversation
    const convIds = conversations.map(c => c.conversationId);
    const latestMessages = await Message.aggregate([
      { $match: { conversationId: { $in: convIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$conversationId',
          latestMessage: { $first: '$message' },
          lastSender: { $first: '$sender' },
          lastTimestamp: { $first: '$timestamp' },
          messageCount: { $sum: 1 }
        }
      }
    ]);

    const msgMap = {};
    latestMessages.forEach(m => {
      msgMap[m._id] = m;
    });

    const enrichedConversations = conversations.map(c => ({
      ...c,
      latestMessage: msgMap[c.conversationId]?.latestMessage || null,
      lastSender: msgMap[c.conversationId]?.lastSender || null,
      lastTimestamp: msgMap[c.conversationId]?.lastTimestamp || c.updatedAt,
      messageCount: msgMap[c.conversationId]?.messageCount || 0
    }));

    return successResponse(res, {
      conversations: enrichedConversations,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    logger.error(`[conversationController] getConversations error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/conversations/:conversationId
 * Returns conversation metadata, messages, analysis, and escalation details.
 */
async function getConversationById(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { role, _id: userId } = req.user;

    const conversation = await Conversation.findOne({ conversationId })
      .populate('customerId', 'name email membershipLevel')
      .lean();

    if (!conversation) {
      return errorResponse(res, 'CONVERSATION_NOT_FOUND', `Conversation '${conversationId}' not found.`, 404);
    }

    const convCustomerId = conversation.customerId?._id?.toString() || conversation.customerId?.toString();
    if (role === 'customer' && convCustomerId !== userId.toString()) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this conversation.', 403);
    }

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .lean();

    const latestAnalysis = await AIAnalysis.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .lean();

    const escalation = await Escalation.findOne({ conversationId })
      .populate('assignedAgent', 'name email')
      .lean();

    return successResponse(res, {
      conversation,
      messages: messages.map(m => ({
        id: m._id,
        sender: m.sender,
        message: m.message,
        timestamp: m.timestamp,
        metadata: m.metadata
      })),
      latestAnalysis: latestAnalysis || null,
      escalation: escalation || null
    });
  } catch (err) {
    logger.error(`[conversationController] getConversationById error: ${err.message}`);
    next(err);
  }
}

/**
 * PATCH /api/conversations/:conversationId/status
 * Updates status of a conversation.
 */
async function updateConversationStatus(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toLowerCase())) {
      return errorResponse(res, 'INVALID_STATUS', `Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const conversation = await Conversation.findOneAndUpdate(
      { conversationId },
      { status: status.toLowerCase(), updatedAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      return errorResponse(res, 'CONVERSATION_NOT_FOUND', `Conversation '${conversationId}' not found.`, 404);
    }

    logger.info(`[conversationController] conversation "${conversationId}" status set to "${status}"`);
    return successResponse(res, { conversation });
  } catch (err) {
    logger.error(`[conversationController] updateConversationStatus error: ${err.message}`);
    next(err);
  }
}

/**
 * POST /api/conversations/:conversationId/messages
 * Allows manual message posting by support agents or customers.
 */
async function addMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const { role, _id: userId } = req.user;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return errorResponse(res, 'INVALID_INPUT', 'Message text is required.', 400);
    }

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      return errorResponse(res, 'CONVERSATION_NOT_FOUND', `Conversation '${conversationId}' not found.`, 404);
    }

    const convCustomerId = conversation.customerId?.toString();
    if (role === 'customer' && convCustomerId !== userId.toString()) {
      return errorResponse(res, 'FORBIDDEN', 'Access denied to this conversation.', 403);
    }

    const sender = role === 'customer' ? 'customer' : 'agent';

    const newMessage = await Message.create({
      conversationId,
      sender,
      message: message.trim(),
      metadata: { authorId: userId, role }
    });

    await Conversation.findOneAndUpdate(
      { conversationId },
      { updatedAt: new Date() }
    );

    return successResponse(res, {
      message: {
        id: newMessage._id,
        sender: newMessage.sender,
        message: newMessage.message,
        timestamp: newMessage.timestamp,
        metadata: newMessage.metadata
      }
    }, 201);
  } catch (err) {
    logger.error(`[conversationController] addMessage error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getConversations,
  getConversationById,
  updateConversationStatus,
  addMessage
};
