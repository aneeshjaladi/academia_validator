const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['fake_certificate', 'suspicious_activity', 'duplicate_found', 'institution_fraud', 'bulk_forgery'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  relatedCertificate: { type: String },
  relatedInstitution: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  relatedVerification: { type: mongoose.Schema.Types.ObjectId, ref: 'VerificationLog' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  status: { type: String, enum: ['open', 'investigating', 'resolved', 'dismissed'], default: 'open' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolution: { type: String },
  
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);