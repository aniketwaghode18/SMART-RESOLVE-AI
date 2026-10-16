const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'HIGH' },
  department: { type: String, enum: ['SUPPORT', 'PAYMENTS', 'SECURITY', 'LEGAL', 'MANAGEMENT'], default: 'SUPPORT' },
  reason: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  aiAnalysisSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
  agentNotes: { type: String, default: '' },
  resolution: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Escalation', escalationSchema);
