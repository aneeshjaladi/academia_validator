const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, organization, phone } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Only allow certain public roles during self-registration
    const allowedRoles = ['employer', 'agency', 'public'];
    const assignedRole = allowedRoles.includes(role) ? role : 'public';

    const user = await User.create({ name, email, password, role: assignedRole, organization, phone });
    const token = generateToken(user._id);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated' });

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, organization, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, organization, phone, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/seed-admin (dev only)
router.post('/seed-admin', async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) return res.json({ success: true, message: 'Admin already exists', email: existing.email });
    
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@certverify.gov.in',
      password: 'Admin@123456',
      role: 'admin',
      isActive: true,
      isVerified: true,
      organization: 'Higher Education Department, Jharkhand'
    });
    
    res.json({ success: true, message: 'Admin created', email: admin.email, password: 'Admin@123456' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;