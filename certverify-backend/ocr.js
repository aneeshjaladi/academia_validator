const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Extract text from image/PDF using OCR
async function extractTextFromFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    let imagePath = filePath;
    
    // For PDFs, we use pdf-parse for text extraction
    if (ext === '.pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        return {
          text: pdfData.text,
          confidence: 90,
          method: 'pdf-parse',
          pages: pdfData.numpages
        };
      } catch (pdfErr) {
        console.log('PDF parse failed, trying OCR:', pdfErr.message);
      }
    }
    
    // OCR for images
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {}
    });
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      method: 'ocr',
      words: result.data.words?.length || 0
    };
  } catch (err) {
    console.error('OCR Error:', err);
    return { text: '', confidence: 0, method: 'failed', error: err.message };
  }
}

// Parse extracted text to find certificate fields
function parseExtractedText(text) {
  if (!text) return {};
  
  const extracted = {};
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Extract student name - look for patterns after common labels
  const namePatterns = [
    /(?:this is to certify that|certified that|name[:\s]+)([A-Z][a-zA-Z\s]{3,50})(?:\s|$|has|have|son|daughter|is)/i,
    /(?:^|\n)([A-Z][A-Z\s]{5,40})(?:\n|has successfully|passed)/m,
  ];
  for (const p of namePatterns) {
    const m = normalizedText.match(p);
    if (m) { extracted.studentName = m[1].trim(); break; }
  }

  // Roll number / enrollment number
  const rollPatterns = [
    /(?:roll\s*(?:no|number|num)[.:\s]+)([A-Z0-9\-\/]{4,20})/i,
    /(?:enrollment\s*(?:no|number)[.:\s]+)([A-Z0-9\-\/]{4,20})/i,
    /(?:registration\s*(?:no|number)[.:\s]+)([A-Z0-9\-\/]{4,20})/i,
    /\b([A-Z]{2,4}\d{2}[A-Z0-9]{4,10})\b/
  ];
  for (const p of rollPatterns) {
    const m = normalizedText.match(p);
    if (m) { extracted.rollNumber = m[1].trim(); break; }
  }

  // Certificate ID
  const certIdPatterns = [
    /(?:certificate\s*(?:no|number|id)[.:\s]+)([A-Z0-9\-\/]{4,25})/i,
    /(?:cert[.:\s]+)([A-Z0-9\-]{6,20})/i
  ];
  for (const p of certIdPatterns) {
    const m = normalizedText.match(p);
    if (m) { extracted.certificateId = m[1].trim(); break; }
  }
  
  // Institution name
  const instPatterns = [
    /(?:university|college|institute|polytechnic)\s*of\s*[a-zA-Z\s]{3,50}/i,
    /([A-Z][a-zA-Z\s]{3,50}(?:University|College|Institute|Polytechnic|Board))/
  ];
  for (const p of instPatterns) {
    const m = normalizedText.match(p);
    if (m) { extracted.institutionName = m[0].trim(); break; }
  }

  // Degree/Course
  const degreePatterns = [
    /(?:degree\s*of|awarded|conferred)\s+([A-Z][a-zA-Z\s\.]{2,50}?)(?:\s+in|\s+degree|\.|,)/i,
    /\b(Bachelor of [A-Za-z\s]{2,40}|Master of [A-Za-z\s]{2,40}|B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|B\.?A|M\.?A|B\.?Com|M\.?Com|Ph\.?D|MBA|MCA|BCA)\b/i
  ];
  for (const p of degreePatterns) {
    const m = normalizedText.match(p);
    if (m) { extracted.degree = m[1]?.trim() || m[0].trim(); break; }
  }

  // Year of passing
  const yearMatch = normalizedText.match(/(?:year of passing|passed in|graduation year|year[:\s]+)(20\d{2}|19\d{2})/i)
    || normalizedText.match(/\b(20[0-2]\d)\b/g);
  if (yearMatch) {
    extracted.passoutYear = Array.isArray(yearMatch) 
      ? yearMatch[yearMatch.length - 1] 
      : yearMatch[1];
  }

  // CGPA / Percentage
  const cgpaMatch = normalizedText.match(/(?:cgpa|gpa)[:\s]+(\d+\.\d{1,2})/i);
  if (cgpaMatch) extracted.cgpa = cgpaMatch[1];
  
  const percentMatch = normalizedText.match(/(\d{2,3}\.?\d{0,2})\s*%/);
  if (percentMatch) extracted.percentage = percentMatch[1];

  // Issue date
  const dateMatch = normalizedText.match(/(?:date[:\s]+|issued on[:\s]+|dated[:\s]+)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i)
    || normalizedText.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i);
  if (dateMatch) extracted.issueDate = dateMatch[1];

  extracted.rawText = normalizedText.substring(0, 2000);
  return extracted;
}

// Detect anomalies in certificate
function detectAnomalies(extractedData, dbCertificate, institutionExists) {
  const anomalies = [];
  
  if (!institutionExists) {
    anomalies.push({
      type: 'institution_not_found',
      severity: 'critical',
      description: 'The institution name on the certificate does not match any registered institution',
      field: 'institutionName'
    });
  }

  if (dbCertificate) {
    // Check for data mismatches
    const checks = [
      { extracted: extractedData.studentName, db: dbCertificate.studentName, field: 'studentName', label: 'Student name' },
      { extracted: extractedData.rollNumber, db: dbCertificate.rollNumber, field: 'rollNumber', label: 'Roll number' },
      { extracted: extractedData.degree, db: dbCertificate.degree, field: 'degree', label: 'Degree' },
      { extracted: extractedData.passoutYear, db: String(dbCertificate.passoutYear), field: 'passoutYear', label: 'Year of passing' },
    ];

    for (const check of checks) {
      if (check.extracted && check.db) {
        const similarity = stringSimilarity(check.extracted.toLowerCase(), check.db.toLowerCase());
        if (similarity < 0.75) {
          anomalies.push({
            type: 'data_mismatch',
            severity: 'high',
            description: `${check.label} mismatch: extracted "${check.extracted}" but database has "${check.db}"`,
            field: check.field
          });
        }
      }
    }

    // Check CGPA/percentage anomaly (inflated grades)
    if (extractedData.cgpa && dbCertificate.cgpa) {
      const diff = Math.abs(parseFloat(extractedData.cgpa) - dbCertificate.cgpa);
      if (diff > 0.1) {
        anomalies.push({
          type: 'grade_tampering',
          severity: 'critical',
          description: `CGPA mismatch: document shows ${extractedData.cgpa} but database has ${dbCertificate.cgpa}`,
          field: 'cgpa'
        });
      }
    }

    if (extractedData.percentage && dbCertificate.percentage) {
      const diff = Math.abs(parseFloat(extractedData.percentage) - dbCertificate.percentage);
      if (diff > 0.5) {
        anomalies.push({
          type: 'grade_tampering',
          severity: 'critical',
          description: `Percentage mismatch: document shows ${extractedData.percentage}% but database has ${dbCertificate.percentage}%`,
          field: 'percentage'
        });
      }
    }

    if (dbCertificate.status === 'revoked') {
      anomalies.push({
        type: 'revoked_certificate',
        severity: 'critical',
        description: `This certificate has been revoked. Reason: ${dbCertificate.revokeReason || 'Not specified'}`,
        field: 'status'
      });
    }

    if (dbCertificate.status === 'duplicate') {
      anomalies.push({
        type: 'duplicate_certificate',
        severity: 'high',
        description: 'This certificate ID is marked as a duplicate',
        field: 'certificateId'
      });
    }
  } else if (extractedData.certificateId) {
    anomalies.push({
      type: 'certificate_not_found',
      severity: 'high',
      description: `Certificate ID "${extractedData.certificateId}" not found in any institutional database`,
      field: 'certificateId'
    });
  }

  // Check for suspicious formatting patterns
  if (!extractedData.studentName || extractedData.studentName.length < 3) {
    anomalies.push({
      type: 'missing_key_data',
      severity: 'medium',
      description: 'Could not extract student name from the document',
      field: 'studentName'
    });
  }

  return anomalies;
}

// Calculate confidence score
function calculateConfidenceScore(extractedData, dbCertificate, anomalies, institutionExists) {
  let score = 100;
  
  for (const anomaly of anomalies) {
    switch (anomaly.severity) {
      case 'critical': score -= 35; break;
      case 'high': score -= 20; break;
      case 'medium': score -= 10; break;
      case 'low': score -= 5; break;
    }
  }

  if (!dbCertificate) score -= 15;
  if (!institutionExists) score -= 20;
  if (!extractedData.rollNumber) score -= 5;
  if (!extractedData.degree) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// Determine verification status
function determineStatus(confidenceScore, anomalies) {
  const hasCritical = anomalies.some(a => a.severity === 'critical');
  if (hasCritical || confidenceScore < 30) return 'fake';
  if (confidenceScore < 60) return 'suspicious';
  if (confidenceScore >= 80) return 'authentic';
  return 'suspicious';
}

// Simple string similarity (Jaccard-like)
function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Generate hash for certificate data
function generateCertificateHash(data) {
  const str = `${data.certificateId}${data.studentName}${data.rollNumber}${data.institutionName}${data.course}${data.passoutYear}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

module.exports = {
  extractTextFromFile,
  parseExtractedText,
  detectAnomalies,
  calculateConfidenceScore,
  determineStatus,
  generateCertificateHash,
  stringSimilarity
};