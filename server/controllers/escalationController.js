/**
 * escalationController.js
 * Controller for managing human escalation cases.
 */

'use strict';

const mongoose = require('mongoose');
const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AIAnalysis = require('../models/AIAnalysis');
const { successResponse, errorResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_DEPARTMENTS = ['SUPPORT', 'PAYMENTS', 'SECURITY', 'LEGAL', 'MANAGEMENT'];

/**
 * GET /api/escalations
 * Returns list of escalated cases for support agents and admins.
 */
async function getEscalations(req, res, next) {
  try {
    const { status, priority, department, assignedToMe, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && VALID_STATUSES.includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
      query.priority = priority.toUpperCase();
    }

    if (department && VALID_DEPARTMENTS.includes(department.toUpperCase())) {
      query.department = department.toUpperCase();
    }

    if (assignedToMe === 'true') {
      query.assignedAgent = req.user._id;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Escalation.countDocuments(query);
    const escalations = await Escalation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('customerId', 'name email membershipLevel')
      .populate('assignedAgent', 'name email')
      .lean();

    return successResponse(res, {
      escalations,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    logger.error(`[escalationController] getEscalations error: ${err.message}`);
    next(err);
  }
}

/**
 * GET /api/escalations/:id
 * Returns a single escalation case by caseId or ObjectId.
 */
async function getEscalationById(req, res, next) {
  try {
    const { id } = req.params;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId
      ? { $or: [{ _id: id }, { caseId: id.toUpperCase() }, { caseId: id }] }
      : { $or: [{ caseId: id.toUpperCase() }, { caseId: id }] };

    const escalation = await Escalation.findOne(query)
      .populate('customerId', 'name email membershipLevel')
      .populate('assignedAgent', 'name email')
      .lean();

    if (!escalation) {
      return errorResponse(res, 'ESCALATION_NOT_FOUND', `Escalation case '${id}' not found.`, 404);
    }

    // Retrieve conversation history
    const messages = await Message.find({ conversationId: escalation.conversationId })
      .sort({ timestamp: 1 })
      .lean();

    // Retrieve latest AI analysis
    const analysis = await AIAnalysis.findOne({ conversationId: escalation.conversationId })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, {
      escalation,
      messages,
      analysis: analysis || null
    });
  } catch (err) {
    logger.error(`[escalationController] getEscalationById error: ${err.message}`);
    next(err);
  }
}

/**
 * PATCH /api/escalations/:id
 * Updates status, notes, assignment, or resolution for an escalated case.
 */
async function updateEscalation(req, res, next) {
  try {
    const { id } = req.params;
    const { status, assignedAgent, agentNotes, resolution, priority, department } = req.body;

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const query = isMongoId
      ? { $or: [{ _id: id }, { caseId: id.toUpperCase() }, { caseId: id }] }
      : { $or: [{ caseId: id.toUpperCase() }, { caseId: id }] };

    const escalation = await Escalation.findOne(query);
    if (!escalation) {
      return errorResponse(res, 'ESCALATION_NOT_FOUND', `Escalation case '${id}' not found.`, 404);
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status.toLowerCase())) {
        return errorResponse(res, 'INVALID_STATUS', `Status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
      }
      escalation.status = status.toLowerCase();
      if (['resolved', 'closed'].includes(status.toLowerCase())) {
        escalation.resolvedAt = new Date();

        // Also update parent conversation status
        await Conversation.findOneAndUpdate(
          { conversationId: escalation.conversationId },
          { status: 'resolved', updatedAt: new Date() }
        );
      }
    }

    if (assignedAgent !== undefined) {
      escalation.assignedAgent = assignedAgent || null;
    }

    if (agentNotes !== undefined) {
      escalation.agentNotes = agentNotes;
    }

    if (resolution !== undefined) {
      escalation.resolution = resolution;
    }

    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
      escalation.priority = priority.toUpperCase();
    }

    if (department && VALID_DEPARTMENTS.includes(department.toUpperCase())) {
      escalation.department = department.toUpperCase();
    }

    await escalation.save();

    const updated = await Escalation.findById(escalation._id)
      .populate('customerId', 'name email membershipLevel')
      .populate('assignedAgent', 'name email')
      .lean();

    logger.info(`[escalationController] escalation "${escalation.caseId}" updated status="${escalation.status}"`);
    return successResponse(res, { escalation: updated });
  } catch (err) {
    logger.error(`[escalationController] updateEscalation error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getEscalations,
  getEscalationById,
  updateEscalation
};
