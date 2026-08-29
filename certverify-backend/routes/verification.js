const express = require('express');
const router = express.Router();
const VerificationLog = require('../models/VerificationLog');
const { verifyCertificate } = require('../services/verificationEngine');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const PDFDocument = require('pdfkit');

// POST /api/verify - main verification endpoint (public)
router.post('/', upload.single('document'), async (req, res) => {
  try {
    const {
      certificateId, rollNumber, studentName, course,
      yearOfPassing, percentage, institution, verifierOrganization, verifierType
    } = req.body;

    const submittedData = {
      certificateId: certificateId?.trim(),
      rollNumber: rollNumber?.trim(),
      studentName: studentName?.trim(),
      course: course?.trim(),
      yearOfPassing: yearOfPassing ? parseInt(yearOfPassing) : undefined,
      percentage: percentage?.trim(),
      institution: institution?.trim()
    };

    const result = await verifyCertificate({
      submittedData,
      filePath: req.file?.path,
      verifierId: req.user?._id,
      verifierType: verifierType || 'public',
      verifierOrg: verifierOrganization,
      ipAddress: req.ip
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verify/:verificationId - get verification result
router.get('/:verificationId', async (req, res) => {
  try {
    const log = await VerificationLog.findOne({ verificationId: req.params.verificationId })
      .populate('certificate')
      .populate('verifiedBy', 'name');
    if (!log) return res.status(404).json({ success: false, message: 'Verification record not found' });
    res.json({ success: true, verification: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verify - list verifications (admin/institution)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, result, from, to, search } = req.query;
    const query = {};
    if (result) query.result = result;
    if (from || to) {
      query.verifiedAt = {};
      if (from) query.verifiedAt.$gte = new Date(from);
      if (to) query.verifiedAt.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { 'submittedData.certificateId': new RegExp(search, 'i') },
        { 'submittedData.studentName': new RegExp(search, 'i') },
        { verificationId: new RegExp(search, 'i') }
      ];
    }

    const total = await VerificationLog.countDocuments(query);
    const logs = await VerificationLog.find(query)
      .populate('certificate', 'certificateId studentName')
      .populate('verifiedBy', 'name')
      .sort({ verifiedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / limit), logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;