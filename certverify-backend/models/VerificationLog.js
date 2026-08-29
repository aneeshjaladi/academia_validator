const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema({
  verificationId: { type: String, required: true, unique: true },
  
  // What was verified
  certificateId: { type: String },
  uploadedFile: { type: String },
  
  // Who verified
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifierName: { type: String },
  verifierOrg: { type: String },
  verifierIp: { type: String },
  
  // OCR extracted data
  extractedData: {
    studentName: String,
    rollNumber: String,
    institutionName: String,
    course: String,
    degree: String,
    passoutYear: String,
    cgpa: String,
    percentage: String,
    certificateId: String,
    issueDate: String,
    rawText: String
  },
  
  // Result
  status: {
    type: String,
    enum: ['authentic', 'suspicious', 'fake', 'not_found', 'pending'],
    default: 'pending'
  },
  confidenceScore: { type: Number, min: 0, max: 100 },
  matchedCertificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
  
  // Anomalies
  anomalies: [{
    type: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    description: { type: String },
    field: { type: String }
  }],
  
  // Analysis details
  analysisDetails: {
    ocrConfidence: Number,
    formatCheck: Boolean,
    institutionExists: Boolean,
    certificateIdValid: Boolean,
    dataMatchScore: Number,
    tamperingDetected: Boolean,
    duplicateDetected: Boolean
  },
  
  processingTime: { type: Number }, // in ms
  
  createdAt: { type: Date, default: Date.now }
});

verificationLogSchema.index({ createdAt: -1 });
verificationLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationLog', verificationLogSchema);