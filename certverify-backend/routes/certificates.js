const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const { protect, authorize } = require('../middleware/auth');
const { uploadCertificate } = require('../middleware/upload');

// @GET /api/certificates - List all (institution/admin)
router.get('/', protect, authorize('admin', 'institution'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, institutionId, status, year } = req.query;
    const query = {};
    
    // Institutions can only see their own
    if (req.user.role === 'institution') {
      query.institutionId = req.user.institutionId;
    } else if (institutionId) {
      query.institutionId = institutionId;
    }
    
    if (status) query.status = status;
    if (year) query.passoutYear = parseInt(year);
    if (search) {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { certificateId: { $regex: search, $options: 'i' } }
      ];
    }

    const certs = await Certificate.find(query)
      .populate('institutionId', 'name code')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Certificate.countDocuments(query);
    res.json({ success: true, certificates: certs, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @GET /api/certificates/:id
router.get('/:id', async (req, res) => {
  try {
    const cert = await Certificate.findOne({
      certificateId: req.params.id
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      certificate: cert
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// @POST /api/certificates - Upload single certificate (institution/admin)
router.post('/', protect, authorize('admin', 'institution'), uploadCertificate.single('document'), async (req, res) => {
  try {
    const {
      certificateId, studentName, rollNumber, dateOfBirth, fatherName,
      institutionId, course, courseCode, degree, specialization,
      enrollmentYear, passoutYear, issueDate, cgpa, percentage, division, isLegacy
    } = req.body;

    // Validate institution
    const institution = await Institution.findById(institutionId);
    if (!institution) return res.status(400).json({ success: false, message: 'Institution not found' });
    if (institution.isBlacklisted) return res.status(400).json({ success: false, message: 'Institution is blacklisted' });

    // Check for duplicate
    const existing = await Certificate.findOne({ certificateId });
    if (existing) return res.status(400).json({ success: false, message: 'Certificate ID already exists' });

    // Generate QR code
    const qrData = JSON.stringify({ id: certificateId, institution: institution.code, roll: rollNumber });
    const qrCodeBase64 = await qrcode.toDataURL(qrData);

    const certData = {
      certificateId,
      studentName, rollNumber, dateOfBirth, fatherName,
      institutionId, institutionName: institution.name,
      course, courseCode, degree, specialization,
      enrollmentYear: parseInt(enrollmentYear),
      passoutYear: parseInt(passoutYear),
      issueDate: new Date(issueDate),
      cgpa: cgpa ? parseFloat(cgpa) : undefined,
      percentage: percentage ? parseFloat(percentage) : undefined,
      division,
      qrCode: qrCodeBase64,
      isLegacy: isLegacy === 'true',
      uploadedBy: req.user._id,
      status: 'active'
    };

    if (req.file) {
      certData.documentUrl = `/uploads/certificates/${req.file.filename}`;
    }

    const certificate = await Certificate.create(certData);

    // Update institution cert count
    await Institution.findByIdAndUpdate(institutionId, { $inc: { certificateCount: 1 } });

    res.status(201).json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/certificates/bulk - Bulk upload via JSON
router.post('/bulk', protect, authorize('admin', 'institution'), async (req, res) => {
  try {
    const { certificates, institutionId } = req.body;
    if (!Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({ success: false, message: 'No certificates provided' });
    }

    const institution = await Institution.findById(institutionId);
    if (!institution) return res.status(400).json({ success: false, message: 'Institution not found' });

    const results = { success: [], failed: [] };

    for (const cert of certificates) {
      try {
        const existing = await Certificate.findOne({ certificateId: cert.certificateId });
        if (existing) {
          results.failed.push({ id: cert.certificateId, reason: 'Already exists' });
          continue;
        }

        const qrData = JSON.stringify({ id: cert.certificateId, institution: institution.code, roll: cert.rollNumber });
        const qrCodeBase64 = await qrcode.toDataURL(qrData);

        const newCert = await Certificate.create({
          ...cert,
          institutionId,
          institutionName: institution.name,
          qrCode: qrCodeBase64,
          uploadedBy: req.user._id,
          isLegacy: cert.isLegacy || false,
          status: 'active'
        });
        results.success.push(newCert.certificateId);
      } catch (e) {
        results.failed.push({ id: cert.certificateId, reason: e.message });
      }
    }

    await Institution.findByIdAndUpdate(institutionId, { $inc: { certificateCount: results.success.length }, lastSync: new Date() });

    res.json({
      success: true,
      message: `${results.success.length} imported, ${results.failed.length} failed`,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @PUT /api/certificates/:id/revoke
router.put('/:id/revoke', protect, authorize('admin', 'institution'), async (req, res) => {
  try {
    const { reason } = req.body;
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked', revokeReason: reason, updatedAt: new Date() },
      { new: true }
    );
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/certificates/seed/sample - Seed sample data
router.post('/seed/sample', protect, authorize('admin'), async (req, res) => {
  try {
    const institutions = await Institution.find().limit(4);
    if (institutions.length === 0) return res.status(400).json({ success: false, message: 'Seed institutions first' });

    const sampleCerts = [
      {
        certificateId: 'RU2020001234',
        studentName: 'Rahul Kumar Sharma',
        rollNumber: 'RU20BSC001',
        institutionId: institutions[0]._id,
        institutionName: institutions[0].name,
        course: 'Bachelor of Science',
        degree: 'B.Sc',
        specialization: 'Computer Science',
        enrollmentYear: 2017,
        passoutYear: 2020,
        issueDate: new Date('2020-07-15'),
        percentage: 78.5,
        cgpa: 7.8,
        division: 'First',
        status: 'active'
      },
      {
        certificateId: 'JRU2021005678',
        studentName: 'Priya Singh',
        rollNumber: 'JRU21BTECH002',
        institutionId: institutions[1]._id,
        institutionName: institutions[1].name,
        course: 'Bachelor of Technology',
        degree: 'B.Tech',
        specialization: 'Electronics and Communication',
        enrollmentYear: 2017,
        passoutYear: 2021,
        issueDate: new Date('2021-08-20'),
        percentage: 82.3,
        cgpa: 8.2,
        division: 'First',
        status: 'active'
      },
      {
        certificateId: 'BIT2019009012',
        studentName: 'Amit Kumar Gupta',
        rollNumber: 'BIT19BTECH003',
        institutionId: institutions[2]._id,
        institutionName: institutions[2].name,
        course: 'Bachelor of Technology',
        degree: 'B.Tech',
        specialization: 'Mechanical Engineering',
        enrollmentYear: 2015,
        passoutYear: 2019,
        issueDate: new Date('2019-06-10'),
        percentage: 71.8,
        cgpa: 7.1,
        division: 'First',
        status: 'active'
      },
      {
        certificateId: 'NIT2022003456',
        studentName: 'Sunita Devi',
        rollNumber: 'NIT22MBA004',
        institutionId: institutions[3]._id,
        institutionName: institutions[3].name,
        course: 'Master of Business Administration',
        degree: 'MBA',
        specialization: 'Finance',
        enrollmentYear: 2020,
        passoutYear: 2022,
        issueDate: new Date('2022-09-01'),
        percentage: 88.6,
        cgpa: 8.9,
        division: 'Distinction',
        status: 'active'
      },
      {
        certificateId: 'RU2018007777',
        studentName: 'Vikash Yadav',
        rollNumber: 'RU18BA005',
        institutionId: institutions[0]._id,
        institutionName: institutions[0].name,
        course: 'Bachelor of Arts',
        degree: 'B.A',
        specialization: 'History',
        enrollmentYear: 2015,
        passoutYear: 2018,
        issueDate: new Date('2018-05-25'),
        percentage: 65.2,
        cgpa: 6.5,
        division: 'Second',
        status: 'revoked',
        revokeReason: 'Misconduct during examination'
      }
    ];

    const created = [];
    for (const cert of sampleCerts) {
      const exists = await Certificate.findOne({ certificateId: cert.certificateId });
      if (!exists) {
        const qrData = JSON.stringify({ id: cert.certificateId, roll: cert.rollNumber });
        cert.qrCode = await qrcode.toDataURL(qrData);
        cert.uploadedBy = req.user._id;
        created.push(await Certificate.create(cert));
      }
    }

    res.json({ success: true, message: `${created.length} certificates seeded` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;