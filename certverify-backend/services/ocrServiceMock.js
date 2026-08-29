const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// Mock OCR for testing (simulates successful OCR)
const runOCRMock = async (filePath) => {
  const startTime = Date.now();
  
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    // Simulate OCR delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock certificate data
    const mockData = {
      studentName: 'Amit Kumar Singh',
      rollNumber: 'BTH2020001',
      certificateId: 'JHK2024001',
      institution: 'Ranchi University',
      course: 'B.Tech Computer Science',
      yearOfPassing: '2024',
      percentage: '78.5',
      cgpa: '7.85'
    };

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      rawText: `RANCHI UNIVERSITY
Certificate of ${mockData.course}

This is to certify that ${mockData.studentName}, Roll No. ${mockData.rollNumber}
has successfully completed the ${mockData.course} degree 
from ${mockData.institution}.

Certificate ID: ${mockData.certificateId}
Year of Passing: ${mockData.yearOfPassing}
Percentage: ${mockData.percentage}%
CGPA: ${mockData.cgpa}/10

[Mock - No actual OCR performed]`,
      extractedFields: mockData,
      confidence: 85,
      processingTime,
      mock: true
    };
  } catch (error) {
    console.error('Mock OCR Error:', error.message);
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      rawText: '',
      extractedFields: {},
      confidence: 0,
      processingTime,
      mock: true
    };
  }
};

module.exports = { runOCRMock };
