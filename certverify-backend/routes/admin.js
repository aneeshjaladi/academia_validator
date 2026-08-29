const express = require('express');
const router = express.Router();
const VerificationLog = require('../models/VerificationLog');
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

const adminOnly = [protect, authorize('admin')];

// GET /api/admin/dashboard
router.get('/dashboard', ...adminOnly, async (req, res) => {
  try {
    const [
      totalCerts, totalInstitutions, totalVerifications,
      fakeCount, suspiciousCount, verifiedCount,
      blacklistedInstitutions, unreadAlerts,
      recentVerifications, topInstitutions
    ] = await Promise.all([
      Certificate.countDocuments(),
      Institution.countDocuments({ isActive: true }),
      VerificationLog.countDocuments(),
      VerificationLog.countDocuments({ result: 'fake' }),
      VerificationLog.countDocuments({ result: 'suspicious' }),
      VerificationLog.countDocuments({ result: 'verified' }),
      Institution.countDocuments({ isBlacklisted: true }),
      Alert.countDocuments({ isRead: false }),
      VerificationLog.find().sort({ verifiedAt: -1 }).limit(10)
        .populate('certificate', 'certificateId studentName')
        .populate('verifiedBy', 'name'),
      Institution.find().sort({ fraudCount: -1 }).limit(5)
        .select('name code fraudCount verificationCount riskScore isBlacklisted')
    ]);

    // Monthly verification trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await VerificationLog.aggregate([
      { $match: { verifiedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$verifiedAt' },
            month: { $month: '$verifiedAt' }
          },
          total: { $sum: 1 },
          fake: { $sum: { $cond: [{ $eq: ['$result', 'fake'] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$result', 'verified'] }, 1, 0] } },
          suspicious: { $sum: { $cond: [{ $eq: ['$result', 'suspicious'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Anomaly type distribution
    const anomalyDistribution = await VerificationLog.aggregate([
      { $unwind: '$anomalies' },
      { $group: { _id: '$anomalies.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Verifier type breakdown
    const verifierBreakdown = await VerificationLog.aggregate([
      { $group: { _id: '$verifierType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalCertificates: totalCerts,
        totalInstitutions,
        totalVerifications,
        fakeCount,
        suspiciousCount,
        verifiedCount,
        notFoundCount: await VerificationLog.countDocuments({ result: 'not_found' }),
        blacklistedInstitutions,
        unreadAlerts,
        fraudRate: totalVerifications > 0 ? ((fakeCount / totalVerifications) * 100).toFixed(1) : 0
      },
      recentVerifications,
      topRiskInstitutions: topInstitutions,
      monthlyTrend,
      anomalyDistribution,
      verifierBreakdown
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/alerts
router.get('/alerts', ...adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, isRead, type } = req.query;
    const query = {};
    if (severity) query.severity = severity;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (type) query.type = type;

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .populate('institution', 'name code')
      .populate('verificationLog', 'verificationId submittedData result')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/alerts/:id/read
router.put('/alerts/:id/read', ...adminOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/alerts/:id/resolve
router.put('/alerts/:id/resolve', ...adminOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, {
      isResolved: true, isRead: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
      resolution: req.body.resolution
    }, { new: true });
    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/alerts/read-all
router.put('/alerts/read-all', ...adminOnly, async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('institution', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, total, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', ...adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/analytics/fraud-trends
router.get('/analytics/fraud-trends', ...adminOnly, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const trends = await VerificationLog.aggregate([
      { $match: { verifiedAt: { $gte: since }, result: { $in: ['fake', 'suspicious'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$verifiedAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, trends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/users - create user
router.post('/users', ...adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, institutionId } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
    const user = await User.create({ name, email, password, role, institution: institutionId, isVerified: true });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;