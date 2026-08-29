const crypto = require('crypto');
const Certificate = require('../models/Certificate');
const Institution = require('../models/Institution');
const VerificationLog = require('../models/VerificationLog');
const Alert = require('../models/Alert');
const { runOCR, analyzeDocumentIntegrity } = require('./ocrService');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const SIMILARITY_THRESHOLD = 0.75;

// Levenshtein distance based similarity
const stringSimilarity = (a, b) => {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLen = longer.length;
  if (longerLen === 0) return 1;
  return (longerLen - editDistance(longer, shorter)) / longerLen;
};

const editDistance = (s1, s2) => {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

const computeFileHash = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

const verifyCertificate = async ({ submittedData, filePath, verifierId, verifierType, verifierOrg, ipAddress }) => {
  const verificationId = `VRF-${uuidv4().toUpperCase().replace(/-/g, '').slice(0, 12)}`;
  const anomalies = [];
  let certificate = null;
  let confidenceScore = 0;
  let result = 'not_found';
  let ocrResult = { extractedFields: {}, rawText: '', confidence: 0, processingTime: 0 };

  // --- Step 1: OCR if file uploaded ---
  if (filePath) {
    ocrResult = await runOCR(filePath);
    if (ocrResult.success && ocrResult.rawText) {
      const integrityIssues = analyzeDocumentIntegrity(ocrResult.rawText, ocrResult.extractedFields);
      anomalies.push(...integrityIssues);
      
      // Merge OCR data with submitted data (submitted takes precedence)
      const ocr = ocrResult.extractedFields;
      if (!submittedData.certificateId && ocr.certificateId) submittedData.certificateId = ocr.certificateId;
      if (!submittedData.rollNumber && ocr.rollNumber) submittedData.rollNumber = ocr.rollNumber;
      if (!submittedData.studentName && ocr.studentName) submittedData.studentName = ocr.studentName;
    }
  }

  // --- Step 2: Compute file hash & check duplicate ---
  const fileHash = filePath ? computeFileHash(filePath) : null;
  if (fileHash) {
    const duplicate = await Certificate.findOne({ documentHash: fileHash });
    if (duplicate && duplicate._id.toString() !== (certificate?._id?.toString())) {
      anomalies.push({
        type: 'duplicate_detected',
        severity: 'critical',
        description: 'This document has been submitted for verification before under a different entry'
      });
    }
  }

  // --- Step 3: Database lookup ---
  let dbCert = null;
  
  // Try by certificate ID first (most reliable)
  if (submittedData.certificateId) {
    dbCert = await Certificate.findOne({
      certificateId: submittedData.certificateId.toUpperCase()
    }).populate('institution');
  }
  
  // Fallback: roll number + institution
  if (!dbCert && submittedData.rollNumber) {
    const query = { rollNumber: submittedData.rollNumber.toUpperCase() };
    dbCert = await Certificate.findOne(query).populate('institution');
  }

  // --- Step 4: Cross-verification ---
  if (dbCert) {
    certificate = dbCert;
    const scores = [];

    // Check institution blacklist
    if (dbCert.institution?.isBlacklisted) {
      anomalies.push({
        type: 'institution_blacklisted',
        severity: 'critical',
        field: 'institution',
        description: `Institution "${dbCert.institution.name}" is blacklisted: ${dbCert.institution.blacklistReason}`
      });
    }

    // Check certificate status
    if (dbCert.status !== 'active') {
      anomalies.push({
        type: 'certificate_revoked',
        severity: 'critical',
        field: 'status',
        expected: 'active',
        found: dbCert.status,
        description: `Certificate is ${dbCert.status}. Reason: ${dbCert.revokeReason || 'Not specified'}`
      });
    }

    // Name match
    if (submittedData.studentName) {
      const nameSim = stringSimilarity(submittedData.studentName, dbCert.studentName);
      scores.push(nameSim);
      if (nameSim < SIMILARITY_THRESHOLD) {
        anomalies.push({
          type: 'name_mismatch',
          severity: nameSim < 0.5 ? 'high' : 'medium',
          field: 'studentName',
          expected: dbCert.studentName,
          found: submittedData.studentName,
          description: `Name mismatch (similarity: ${Math.round(nameSim * 100)}%)`
        });
      }
    } else {
      scores.push(0.5); // neutral
    }

    // Course match
    if (submittedData.course) {
      const courseSim = stringSimilarity(submittedData.course, dbCert.course);
      scores.push(courseSim);
      if (courseSim < SIMILARITY_THRESHOLD) {
        anomalies.push({
          type: 'course_mismatch',
          severity: 'high',
          field: 'course',
          expected: dbCert.course,
          found: submittedData.course,
          description: `Course mismatch`
        });
      }
    } else scores.push(0.5);

    // Year match
    if (submittedData.yearOfPassing) {
      const yearMatch = parseInt(submittedData.yearOfPassing) === dbCert.yearOfPassing;
      scores.push(yearMatch ? 1 : 0);
      if (!yearMatch) {
        anomalies.push({
          type: 'year_mismatch',
          severity: 'medium',
          field: 'yearOfPassing',
          expected: String(dbCert.yearOfPassing),
          found: String(submittedData.yearOfPassing),
          description: `Year of passing does not match`
        });
      }
    } else scores.push(0.5);

    // Percentage/grade check
    if (submittedData.percentage && dbCert.percentage) {
      const diff = Math.abs(parseFloat(submittedData.percentage) - dbCert.percentage);
      const gradeScore = diff <= 2 ? 1 : diff <= 5 ? 0.7 : 0.2;
      scores.push(gradeScore);
      if (diff > 2) {
        anomalies.push({
          type: 'grade_mismatch',
          severity: diff > 10 ? 'critical' : 'high',
          field: 'percentage',
          expected: String(dbCert.percentage),
          found: submittedData.percentage,
          description: `Percentage discrepancy of ${diff.toFixed(1)}%`
        });
      }
    } else scores.push(0.5);

    // Certificate ID exact match
    if (submittedData.certificateId) {
      const certIdMatch = submittedData.certificateId.toUpperCase() === dbCert.certificateId;
      scores.push(certIdMatch ? 1 : 0.3);
    } else scores.push(0.5);

    // Calculate final confidence
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter(a => a.severity === 'high').length;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    confidenceScore = Math.round(avgScore * 100);
    confidenceScore = Math.max(0, confidenceScore - (criticalAnomalies * 25) - (highAnomalies * 10));

    if (criticalAnomalies > 0) result = 'fake';
    else if (highAnomalies > 0 || confidenceScore < 70) result = 'suspicious';
    else result = 'verified';

    // Update certificate stats
    await Certificate.findByIdAndUpdate(dbCert._id, {
      $inc: { verificationCount: 1 },
      lastVerified: new Date()
    });

    await Institution.findByIdAndUpdate(dbCert.institution._id, {
      $inc: { verificationCount: 1, ...(result === 'fake' ? { fraudCount: 1 } : {}) }
    });

  } else {
    // Not found in DB
    anomalies.push({
      type: 'not_found',
      severity: 'critical',
      description: submittedData.certificateId
        ? `Certificate ID "${submittedData.certificateId}" not found in any institutional database`
        : 'No matching record found in database'
    });
    result = 'not_found';
    confidenceScore = 0;
  }

  // --- Step 5: Save verification log ---
  const logEntry = await VerificationLog.create({
    certificate: certificate?._id,
    verificationId,
    submittedData: {
      ...submittedData,
      filePath,
      fileHash
    },
    ocrExtracted: {
      rawText: ocrResult.rawText?.slice(0, 5000),
      extractedFields: ocrResult.extractedFields,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime
    },
    result,
    confidenceScore,
    anomalies,
    verifiedBy: verifierId,
    verifierType,
    verifierOrganization: verifierOrg,
    ipAddress
  });

  // --- Step 6: Create alert if fake/suspicious ---
  if (result === 'fake' || result === 'not_found') {
    await Alert.create({
      type: result === 'fake' ? 'fake_certificate' : 'suspicious_activity',
      severity: result === 'fake' ? 'critical' : 'high',
      title: result === 'fake' ? 'Fake Certificate Detected' : 'Unverified Certificate Submitted',
      description: `Certificate ID: ${submittedData.certificateId || 'Unknown'}. Submitted by: ${verifierOrg || verifierId || 'Anonymous'}. Anomalies: ${anomalies.length}`,
      relatedVerification: logEntry._id,
      relatedCertificate: certificate?._id,
      reportedBy: verifierId
    });
  }

  return {
    verificationId,
    result,
    confidenceScore,
    anomalies,
    certificate: certificate ? {
      certificateId: certificate.certificateId,
      studentName: certificate.studentName,
      course: certificate.course,
      degreeType: certificate.degreeType,
      yearOfPassing: certificate.yearOfPassing,
      percentage: certificate.percentage,
      cgpa: certificate.cgpa,
      division: certificate.division,
      institution: certificate.institution?.name,
      status: certificate.status
    } : null,
    ocrData: {
      extractedFields: ocrResult.extractedFields,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime
    },
    verifiedAt: new Date()
  };
};

module.exports = { verifyCertificate };