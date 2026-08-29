const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true, trim: true },
  studentName: { type: String, required: true, trim: true },
  rollNumber: { type: String, required: true, trim: true },
  dateOfBirth: Date,
  fatherName: { type: String, trim: true },
  
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  institutionName: { type: String, required: true },
  
  course: { type: String, trim: true },
  courseCode: { type: String, trim: true },
  degree: { type: String, trim: true },
  specialization: { type: String, trim: true },
  
  enrollmentYear: Number,
  passoutYear: { type: Number, required: true },
  issueDate: Date,
  cgpa: Number,
  percentage: Number,
  division: { type: String, enum: ['First', 'Second', 'Third', 'Pass'] },
  
  qrCode: String,
  documentUrl: String,
  
  isLegacy: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active' },
  
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

certificateSchema.index({ studentName: 'text', rollNumber: 'text', certificateId: 'text' });

module.exports = mongoose.model('Certificate', certificateSchema);
