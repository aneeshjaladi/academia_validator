const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['university', 'college', 'school', 'institute'], required: true },
  
  email: { type: String, unique: true, lowercase: true, sparse: true },
  phone: String,
  website: String,
  
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  apiKey: { type: String, unique: true, default: () => uuidv4().replace(/-/g, '') },
  
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isBlacklisted: { type: Boolean, default: false },
  blacklistReason: String,
  
  certificateCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

institutionSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Institution', institutionSchema);
