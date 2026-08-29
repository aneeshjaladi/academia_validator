const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

// Initialize Google Vision client
let visionClient = null;

const initializeVisionClient = () => {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      visionClient = new vision.ImageAnnotatorClient();
      console.log('✅ Google Vision Client initialized');
      return true;
    }
  } catch (e) {
    console.warn('⚠️ Google Vision initialization failed:', e.message);
  }
  return false;
};

const OCR_PATTERNS = {
  certificateId: [
    /(?:certificate\s*(?:no|number|id)[.:\s]*)([\w\-\/]+)/i,
    /(?:cert(?:\.|\s)*no[.:\s]*)([\w\-\/]+)/i,
    /(?:serial\s*no[.:\s]*)([\w\-\/]+)/i,
    /((?:JHK|CERT|UNIV|COL|DIP|BTH|MST)[A-Z0-9\-\/]{5,20})/i
  ],
  rollNumber: [
    /(?:roll\s*(?:no|number)[.:\s]*)([\w\-\/]+)/i,
    /(?:enrollment\s*(?:no|number)[.:\s]*)([\w\-\/]+)/i,
    /(?:reg(?:istration)?\s*(?:no|number)[.:\s]*)([\w\-\/]+)/i
  ],
  studentName: [
    /(?:this is to certify that\s*)([\w\s]+?)(?:\s*(?:has|s\/o|d\/o|son|daughter))/i,
    /(?:name[.:\s]*)([\w\s]{5,50})(?:\n|roll)/i,
    /(?:certified that\s*)([\w\s]+?)(?:\s*(?:has|bearing))/i
  ],
  yearOfPassing: [
    /(?:year\s*of\s*(?:passing|graduation)[.:\s]*)(\d{4})/i,
    /(?:passed|graduation|awarded)\s*in\s*(\d{4})/i,
    /(\d{4})\s*(?:examination|batch)/i
  ],
  percentage: [
    /(?:percentage|marks\s*obtained)[.:\s]*(\d{1,3}(?:\.\d{1,2})?)\s*%?/i,
    /(\d{1,3}\.\d{1,2})\s*%/i
  ],
  cgpa: [
    /(?:cgpa|gpa|grade\s*point)[.:\s]*(\d{1}\.\d{1,2})/i,
    /(\d\.\d{2})\s*(?:cgpa|out\s*of)/i
  ],
  course: [
    /(?:degree\s*of\s*)([\w\s()\.]+?)(?:\s*in\s*)([\w\s()\.]+?)(?:\n|with|having)/i,
    /(?:bachelor|master|doctor|b\.tech|m\.tech|bsc|msc|b\.com|m\.com|ba|ma|mba|bca|mca)[^\n]*/i,
    /(?:course[.:\s]*)([\w\s()]{5,60})(?:\n)/i
  ],
  institution: [
    /^([\w\s,]+(?:university|college|institute|polytechnic|school)[^\n]*)/im,
    /(?:affiliated\s*to[.:\s]*)([\w\s,]+(?:university|college)[^\n]*)/i
  ]
};

const extractField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val = (match[2] || match[1] || '').trim();
      if (val.length > 1) return val;
    }
  }
  return null;
};

const calculateConfidence = (extracted) => {
  const fields = Object.values(extracted).filter(Boolean);
  const totalFields = Object.keys(extracted).length;
  return Math.round((fields.length / totalFields) * 100);
};

const runOCR = async (filePath) => {
  const startTime = Date.now();
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found: ' + filePath);
    }

    console.log(`Running OCR on: ${filePath}`);
    
    if (!visionClient) {
      throw new Error('Google Vision Client not initialized. Check GOOGLE_APPLICATION_CREDENTIALS.');
    }

    const fileContent = fs.readFileSync(filePath);
    const base64Image = fileContent.toString('base64');

    const request = {
      image: { content: base64Image },
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION' },
      ],
    };

    console.log('📄 Processing with Google Cloud Vision API...');
    const [result] = await visionClient.annotateImage(request);
    const fullTextAnnotation = result.fullTextAnnotation;
    
    if (!fullTextAnnotation || !fullTextAnnotation.text) {
      throw new Error('No text detected in document');
    }

    const rawText = fullTextAnnotation.text;
    const processingTime = Date.now() - startTime;

    const extractedFields = {
      studentName: extractField(rawText, OCR_PATTERNS.studentName),
      rollNumber: extractField(rawText, OCR_PATTERNS.rollNumber),
      certificateId: extractField(rawText, OCR_PATTERNS.certificateId),
      institution: extractField(rawText, OCR_PATTERNS.institution),
      course: extractField(rawText, OCR_PATTERNS.course),
      yearOfPassing: extractField(rawText, OCR_PATTERNS.yearOfPassing),
      percentage: extractField(rawText, OCR_PATTERNS.percentage),
      cgpa: extractField(rawText, OCR_PATTERNS.cgpa)
    };

    const confidence = calculateConfidence(extractedFields);

    return {
      success: true,
      rawText,
      extractedFields,
      confidence,
      processingTime,
      engine: 'google_vision'
    };
  } catch (error) {
    console.error('OCR Error:', error.message);
    return {
      success: false,
      error: error.message,
      rawText: '',
      extractedFields: {},
      confidence: 0,
      processingTime: Date.now() - startTime
    };
  }
};

// Analyze document for tampering/anomalies based on OCR patterns
const analyzeDocumentIntegrity = (rawText, extractedFields) => {
  const issues = [];

  // Check for inconsistencies in year
  const yearMatches = rawText.match(/\b(19|20)\d{2}\b/g) || [];
  const years = [...new Set(yearMatches.map(Number))];
  if (years.length > 0) {
    const currentYear = new Date().getFullYear();
    years.forEach(y => {
      if (y > currentYear) {
        issues.push({ type: 'format_anomaly', severity: 'high', description: `Future year detected: ${y}` });
      }
    });
  }

  // Check for common fake certificate markers
  const fakeMarkers = ['specimen', 'sample', 'void', 'copy only', 'not valid'];
  fakeMarkers.forEach(marker => {
    if (rawText.toLowerCase().includes(marker)) {
      issues.push({ type: 'format_anomaly', severity: 'critical', description: `Suspicious text found: "${marker}"` });
    }
  });

  // Check percentage validity
  if (extractedFields.percentage) {
    const pct = parseFloat(extractedFields.percentage);
    if (pct > 100 || pct < 0) {
      issues.push({ type: 'grade_mismatch', severity: 'high', description: `Invalid percentage: ${pct}` });
    }
  }

  // Check CGPA validity
  if (extractedFields.cgpa) {
    const cgpa = parseFloat(extractedFields.cgpa);
    if (cgpa > 10 || cgpa < 0) {
      issues.push({ type: 'grade_mismatch', severity: 'high', description: `Invalid CGPA: ${cgpa}` });
    }
  }

  return issues;
};

module.exports = { runOCR, analyzeDocumentIntegrity, initializeVisionClient };