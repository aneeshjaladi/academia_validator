require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Institution = require('./models/Institution');
const Certificate = require('./models/Certificate');
const Alert = require('./models/Alert');
const VerificationLog = require('./models/VerificationLog');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify';

const institutions = [
  { name: 'Ranchi University', code: 'RU001', type: 'university', district: 'Ranchi', website: 'https://ranchiuniversity.ac.in', contactEmail: 'vc@ru.ac.in' },
  { name: 'Birsa Institute of Technology', code: 'BIT001', type: 'institute', district: 'Bokaro', website: 'https://bit.ac.in', contactEmail: 'director@bit.ac.in' },
  { name: 'Jharkhand Technical University', code: 'JTU001', type: 'university', district: 'Ranchi', website: 'https://jtu.ac.in', contactEmail: 'info@jtu.ac.in' },
  { name: 'St. Xaviers College Ranchi', code: 'SXC001', type: 'college', district: 'Ranchi', contactEmail: 'admin@sxcranchi.com' },
  { name: 'Dumka Engineering College', code: 'DEC001', type: 'college', district: 'Dumka', contactEmail: 'principal@dec.ac.in', isBlacklisted: true, blacklistReason: 'Multiple fraudulent certificates detected' },
  { name: 'Hazaribagh College of Engineering', code: 'HCE001', type: 'college', district: 'Hazaribagh', contactEmail: 'principal@hce.edu.in' }
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Institution.deleteMany({}),
      Certificate.deleteMany({}),
      Alert.deleteMany({}),
      VerificationLog.deleteMany({})
    ]);
    console.log('Cleared existing data');

    // Create institutions
    const createdInstitutions = await Institution.insertMany(institutions);
    console.log(`Created ${createdInstitutions.length} institutions`);

    // Create users
    const users = [
      { name: 'Admin HED', email: 'admin@hed.jharkhand.gov.in', password: 'Admin@123', role: 'admin', isVerified: true },
      { name: 'Ranchi University Admin', email: 'admin@ru.ac.in', password: 'Inst@123', role: 'institution', institutionId: createdInstitutions[0]._id, isVerified: true },
      { name: 'BIT Admin', email: 'admin@bit.ac.in', password: 'Inst@123', role: 'institution', institutionId: createdInstitutions[1]._id, isVerified: true },
      { name: 'TCS HR', email: 'hr@tcs.com', password: 'Employer@123', role: 'employer', isVerified: true },
      { name: 'Infosys Recruiter', email: 'recruit@infosys.com', password: 'Employer@123', role: 'employer', isVerified: true },
    ];
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create certificates
    const certData = [
      { certificateId: 'JHK2024001', rollNumber: 'BTH2020001', studentName: 'Amit Kumar', fatherName: 'Rajesh Kumar', course: 'B.Tech', specialization: 'Computer Science', degree: 'Bachelor', enrollmentYear: 2020, passoutYear: 2024, percentage: 78.5, cgpa: 7.85, division: 'First', institutionId: createdInstitutions[0]._id, institutionName: 'Ranchi University' },
      { certificateId: 'JHK2024002', rollNumber: 'BTH2020002', studentName: 'Priya Sharma', fatherName: 'Suresh Sharma', course: 'B.Tech', specialization: 'Electronics', degree: 'Bachelor', enrollmentYear: 2020, passoutYear: 2024, percentage: 85.2, cgpa: 8.52, division: 'First', institutionId: createdInstitutions[0]._id, institutionName: 'Ranchi University' },
      { certificateId: 'JHK2023001', rollNumber: 'MST2021001', studentName: 'Rohit Singh', fatherName: 'Mohan Singh', course: 'M.Tech', specialization: 'Mechanical', degree: 'Master', enrollmentYear: 2021, passoutYear: 2023, percentage: 72.0, cgpa: 7.20, division: 'First', institutionId: createdInstitutions[1]._id, institutionName: 'Birsa Institute of Technology' },
      { certificateId: 'JHK2023002', rollNumber: 'BSC2019001', studentName: 'Sunita Devi', fatherName: 'Ram Prasad', course: 'B.Sc', specialization: 'Physics', degree: 'Bachelor', enrollmentYear: 2019, passoutYear: 2023, percentage: 68.5, cgpa: 6.85, division: 'Second', institutionId: createdInstitutions[3]._id, institutionName: 'St. Xaviers College Ranchi' },
      { certificateId: 'JHK2022001', rollNumber: 'MBA2020001', studentName: 'Vikram Gupta', fatherName: 'Anil Gupta', course: 'MBA', specialization: 'Finance', degree: 'Master', enrollmentYear: 2020, passoutYear: 2022, percentage: 76.8, cgpa: 7.68, division: 'First', institutionId: createdInstitutions[2]._id, institutionName: 'Jharkhand Technical University' },
      { certificateId: 'JHK2024003', rollNumber: 'BTH2020003', studentName: 'Deepa Kumari', fatherName: 'Shyam Lal', course: 'B.Tech', specialization: 'Civil Engineering', degree: 'Bachelor', enrollmentYear: 2020, passoutYear: 2024, percentage: 91.5, cgpa: 9.15, division: 'First', institutionId: createdInstitutions[0]._id, institutionName: 'Ranchi University' },
      { certificateId: 'JHK2021001', rollNumber: 'PHD2017001', studentName: 'Dr. Anand Tiwari', fatherName: 'Prakash Tiwari', course: 'PhD', specialization: 'Chemistry', degree: 'PhD', enrollmentYear: 2017, passoutYear: 2021, percentage: 0, institutionId: createdInstitutions[0]._id, institutionName: 'Ranchi University' },
      { certificateId: 'JHK2024004', rollNumber: 'DIP2022001', studentName: 'Ravi Mahto', fatherName: 'Ganesh Mahto', course: 'Diploma', specialization: 'Mechanical', degree: 'Diploma', enrollmentYear: 2022, passoutYear: 2024, percentage: 65.0, division: 'Second', institutionId: createdInstitutions[5]._id, institutionName: 'Hazaribagh College of Engineering' },
    ];

    for (const cert of certData) {
      await Certificate.create(cert);
    }
    console.log(`Created ${certData.length} certificates`);

    // Update institution cert counts
    for (const inst of createdInstitutions) {
      const count = await Certificate.countDocuments({ institution: inst._id });
      await Institution.findByIdAndUpdate(inst._id, { totalCertificates: count });
    }

    // Create sample alerts
    await Alert.create([
      {
        type: 'fake_certificate',
        severity: 'critical',
        title: 'Fake Certificate Detected',
        description: 'A forged certificate from Ranchi University was submitted by TCS HR'
      },
      {
        type: 'institution_fraud',
        severity: 'high',
        title: 'Institution Fraud',
        description: 'Dumka Engineering College has been flagged for multiple fraud cases',
        relatedInstitution: createdInstitutions[4]._id
      },
      {
        type: 'suspicious_activity',
        severity: 'medium',
        title: 'Multiple Verification Attempts',
        description: 'Same certificate verified 5 times in 10 minutes from different IPs'
      }
    ]);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('Login credentials:');
    console.log('─────────────────────────────────────────');
    console.log('Admin:       admin@hed.jharkhand.gov.in / Admin@123');
    console.log('Institution: admin@ru.ac.in / Inst@123');
    console.log('Employer:    hr@tcs.com / Employer@123');
    console.log('─────────────────────────────────────────');
    console.log('\nSample Certificate IDs to test:');
    console.log('  Valid:    JHK2024001, JHK2024002, JHK2023001');
    console.log('  Revoke one and test fake detection');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seed();
