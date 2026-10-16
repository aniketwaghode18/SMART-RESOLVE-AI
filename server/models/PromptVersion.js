const mongoose = require('mongoose');

const promptVersionSchema = new mongoose.Schema({
  promptVersion: { type: String, required: true },
  promptName: { type: String, required: true }, // e.g. 'intent_v1', 'response_v2'
  promptType: { type: String, enum: ['intent', 'sentiment', 'urgency', 'context', 'policy', 'resolution', 'response', 'critic'], required: true },
  promptText: { type: String, required: true },
  description: { type: String, default: '' },
  accuracy: { type: Number, default: null },
  latency: { type: Number, default: null }, // average ms
  tokenUsage: { type: Number, default: null }, // average tokens
  hallucinationRate: { type: Number, default: null },
  sampleSize: { type: Number, default: 0 },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PromptVersion', promptVersionSchema);
