const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const VerificationLog = require('./models/VerificationLog');
const mongoose = require('mongoose');
require('dotenv').config();

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // Check verification logs in DB
    const logsCount = await VerificationLog.countDocuments();
    console.log(`📊 Verification logs in DB: ${logsCount}`);
    
    if (logsCount > 0) {
      const sampleLog = await VerificationLog.findOne();
      console.log('Sample log:', JSON.stringify(sampleLog, null, 2));
    }
    
    // Get an admin user
    const adminUser = await User.findOne({ email: 'admin@hed.jharkhand.gov.in' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    console.log('✅ Admin user found:', adminUser.email);
    
    // Create a token for the admin
    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ JWT token created');
    
    // Try to fetch verification logs via API
    try {
      const response = await API.get('/verification?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ API Response:', JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.log('❌ API Error Status:', err.response?.status);
      console.log('❌ API Error Data:', JSON.stringify(err.response?.data, null, 2));
      console.log('❌ API Error Message:', err.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
})();
