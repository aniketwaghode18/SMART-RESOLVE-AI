const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  policyId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['return', 'refund', 'replacement', 'cancellation', 'shipping', 'payment', 'security', 'general'],
    required: true,
  },
  content: { type: String, required: true },
  keywords: { type: [String], default: [] },
  version: { type: String, default: '1.0' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

policySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Policy', policySchema);
