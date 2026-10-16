const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  intent: { type: String, default: 'other' },
  intentConfidence: { type: Number, default: 0, min: 0, max: 1 },
  secondaryIntent: { type: String, default: '' },
  sentiment: { type: String, default: 'neutral' },
  sentimentConfidence: { type: Number, default: 0, min: 0, max: 1 },
  urgency: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  urgencyConfidence: { type: Number, default: 0, min: 0, max: 1 },
  extractedContext: { type: mongoose.Schema.Types.Mixed, default: {} },
  policyUsed: { type: String, default: '' },
  policyId: { type: String, default: '' },
  resolution: { type: String, default: 'INFORMATION' },
  resolutionConfidence: { type: Number, default: 0, min: 0, max: 1 },
  criticApproved: { type: Boolean, default: true },
  criticIssues: { type: [String], default: [] },
  criticSeverity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  escalated: { type: Boolean, default: false },
  escalationReason: { type: String, default: '' },
  promptInjectionDetected: { type: Boolean, default: false },
  latency: { type: Number, default: 0 }, // ms
  tokenUsage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AIAnalysis', aiAnalysisSchema);
