const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Institution = require('../models/Institution');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/institutions - Public list
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, state } = req.query;
    const query = { isActive: true };
    if (search) query.$text = { $search: search };
    if (type) query.type = type;
    if (state) query['address.state'] = state;

    const institutions = await Institution.find(query)
      .select('-apiKey')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ name: 1 });

    const total = await Institution.countDocuments(query);
    res.json({ success: true, institutions, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/institutions/:id
router.get('/:id', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id).select('-apiKey');
    if (!institution) return res.status(404).json({ success: false, message: 'Institution not found' });
    res.json({ success: true, institution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/institutions - Admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const apiKey = uuidv4().replace(/-/g, '');
    const institution = await Institution.create({ ...req.body, apiKey });
    res.status(201).json({ success: true, institution });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Institution code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/institutions/:id
router.put('/:id', protect, authorize('admin', 'institution'), async (req, res) => {
  try {
    const { apiKey, ...updateData } = req.body; // Don't allow apiKey update through this route
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!institution) return res.status(404).json({ success: false, message: 'Institution not found' });
    res.json({ success: true, institution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/institutions/:id/blacklist
router.post('/:id/blacklist', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      { isBlacklisted: true, blacklistReason: reason, updatedAt: new Date() },
      { new: true }
    );
    if (!institution) return res.status(404).json({ success: false, message: 'Institution not found' });
    res.json({ success: true, institution, message: 'Institution blacklisted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/institutions/:id/unblacklist
router.post('/:id/unblacklist', protect, authorize('admin'), async (req, res) => {
  try {
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      { isBlacklisted: false, blacklistReason: null, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, institution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/institutions/seed/sample - Seed sample institutions
router.post('/seed/sample', protect, authorize('admin'), async (req, res) => {
  try {
    const sampleInstitutions = [
      {
        name: 'Ranchi University',
        code: 'RU001',
        type: 'university',
        affiliation: 'UGC',
        address: { city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', pincode: '834001' },
        contactEmail: 'registrar@ranchiuniversity.ac.in',
        establishedYear: 1960,
        recognitionNumber: 'UGC/RU/1960/001',
        courses: [
          { name: 'Bachelor of Science', code: 'BSC', duration: '3 years', degree: 'B.Sc' },
          { name: 'Bachelor of Arts', code: 'BA', duration: '3 years', degree: 'B.A' },
          { name: 'Bachelor of Commerce', code: 'BCOM', duration: '3 years', degree: 'B.Com' },
          { name: 'Master of Science', code: 'MSC', duration: '2 years', degree: 'M.Sc' },
        ]
      },
      {
        name: 'Jharkhand Rai University',
        code: 'JRU002',
        type: 'university',
        affiliation: 'UGC',
        address: { city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', pincode: '835217' },
        contactEmail: 'info@jru.edu.in',
        establishedYear: 2011,
        recognitionNumber: 'UGC/JRU/2011/002',
        courses: [
          { name: 'Bachelor of Technology', code: 'BTECH', duration: '4 years', degree: 'B.Tech' },
          { name: 'Master of Business Administration', code: 'MBA', duration: '2 years', degree: 'MBA' },
          { name: 'Bachelor of Computer Applications', code: 'BCA', duration: '3 years', degree: 'BCA' },
        ]
      },
      {
        name: 'BIT Mesra',
        code: 'BIT003',
        type: 'institute',
        affiliation: 'Deemed University',
        address: { city: 'Mesra', district: 'Ranchi', state: 'Jharkhand', pincode: '835215' },
        contactEmail: 'registrar@bitmesra.ac.in',
        establishedYear: 1955,
        recognitionNumber: 'UGC/BIT/1955/003',
        courses: [
          { name: 'Bachelor of Technology', code: 'BTECH', duration: '4 years', degree: 'B.Tech' },
          { name: 'Master of Technology', code: 'MTECH', duration: '2 years', degree: 'M.Tech' },
          { name: 'Doctor of Philosophy', code: 'PHD', duration: '3-5 years', degree: 'Ph.D' },
        ]
      },
      {
        name: 'NIT Jamshedpur',
        code: 'NITJ004',
        type: 'institute',
        affiliation: 'NIT Council',
        address: { city: 'Jamshedpur', district: 'East Singhbhum', state: 'Jharkhand', pincode: '831014' },
        contactEmail: 'director@nitjsr.ac.in',
        establishedYear: 1960,
        recognitionNumber: 'NIT/JSR/1960/004',
        courses: [
          { name: 'Bachelor of Technology', code: 'BTECH', duration: '4 years', degree: 'B.Tech' },
          { name: 'Master of Technology', code: 'MTECH', duration: '2 years', degree: 'M.Tech' },
          { name: 'Master of Business Administration', code: 'MBA', duration: '2 years', degree: 'MBA' },
        ]
      }
    ];

    const created = [];
    for (const inst of sampleInstitutions) {
      const exists = await Institution.findOne({ code: inst.code });
      if (!exists) {
        const apiKey = uuidv4().replace(/-/g, '');
        created.push(await Institution.create({ ...inst, apiKey }));
      }
    }

    res.json({ success: true, message: `${created.length} institutions seeded`, institutions: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;