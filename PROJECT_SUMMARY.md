# Certificate Authenticity Validator - Project Summary

## 📋 Project Overview

**Certificate Authenticity Validator** is a comprehensive full-stack web application designed to verify the authenticity of educational certificates using OCR (Optical Character Recognition) technology, tamper detection, and database validation. The system helps institutions, employers, and educational bodies authenticate certificates and detect fraudulent documents.

---

## 🏗️ System Architecture

### Frontend: Authenticity-Validator (React + Vite)
- **Port:** 5174
- **Framework:** React 19.2.5 with Vite 8.0.10
- **Authentication:** JWT-based with localStorage persistence
- **UI Components:** Custom React components with CSS Modules

### Backend: CertVerify-Backend (Express.js + MongoDB)
- **Port:** 5000
- **Framework:** Node.js/Express.js
- **Database:** MongoDB (localhost:27017)
- **OCR Engine:** Google Cloud Vision API (handles PDFs + images)
- **File Uploads:** Multer middleware with 50MB limit

---

## 👥 User Roles & Access Control

### 1. **Admin** (Government/Educational Board)
   - Email: `admin@hed.jharkhand.gov.in`
   - Access: Dashboard, Admin Panel, Alerts, Institutions, Certificates management
   - Permissions: Create institutions, manage users, view all verification logs, manage alerts

### 2. **Institution Admin** (College/University)
   - Email: `admin@ru.ac.in` or `admin@bit.ac.in`
   - Access: Dashboard, Certificates, Institutions
   - Permissions: Upload certificates, verify certificates, manage institution data

### 3. **Employer** (HR/Recruitment)
   - Email: `hr@tcs.com` or `recruit@infosys.com`
   - Access: Dashboard, Certificate Verification
   - Permissions: Verify certificates in private mode, check certificate authenticity

---

## 🎯 Key Features & Functionalities

### 1️⃣ **Certificate Verification** (Core Feature)
**What it does:** Verifies if a submitted certificate is authentic by cross-checking with the database

**How it works:**
- User uploads a PDF/image certificate
- Google Cloud Vision API extracts text (OCR)
- System extracts: Student Name, Roll Number, Certificate ID, Course, Passout Year, Institution
- Compares extracted data with database records
- Calculates confidence score (0-100%)
- Detects anomalies: missing fields, data mismatches, duplicate certificates

**Result:** 
- ✅ **Authentic** - Certificate matches database record
- ⚠️ **Suspicious** - Minor discrepancies detected
- ❌ **Fake** - Major mismatches found
- ❓ **Not Found** - Certificate ID not in system

---

### 2️⃣ **Dashboard** (User Home)
**What it does:** Central hub showing verification statistics and recent activity

**Features:**
- **Quick Stats:** Total verifications, genuine, forged, suspicious counts
- **Activity Chart:** Line graph showing verification trends
- **Recent Verifications:** Table of latest 8 verification logs
- **Quick Actions:** Links to verify certificate, view institutions

**Data Shown:**
- Student name, certificate ID, verification result
- Confidence score, verification date
- Institution name, verifier details

---

### 3️⃣ **Admin Panel** (Administrators Only)
**What it does:** Comprehensive administrative dashboard for system management

**Sections:**

**A. Overview Tab**
- System-wide statistics (total verifications, authentic %, forged %)
- Institution count
- Bar chart: Authentic vs Forged certificates
- Line chart: Verification trends

**B. Institutions Tab**
- List of all registered institutions
- Add new institution (name, type: college/university)
- View institution details and certificate count
- Manage institution status

**C. Users Tab**
- View all registered users (admin, institution, employer)
- User roles and status
- User creation date

**D. Verification Logs Tab**
- Searchable table of all verification attempts
- Filter by result (authentic/fake/suspicious)
- Filter by date range
- Export-ready format

**E. Alerts Tab**
- Fraud alerts and suspicious activities
- Alert types: Fake certificate, Suspicious activity, Duplicate found, Bulk forgery
- Alert severity: Critical, High, Medium, Low
- Mark alerts as investigated/resolved

**F. Blacklist Management**
- Add certificates/institutions to blacklist
- Reason for blacklisting
- Prevents future verifications of blacklisted items

---

### 4️⃣ **Certificate Management** (Institution/Admin)
**What it does:** Upload and manage educational certificates in the system

**Features:**
- **Bulk Upload:** Upload multiple certificates at once (CSV/Excel)
- **Single Upload:** Add individual certificate with details:
  - Certificate ID (unique identifier)
  - Student Name
  - Roll Number
  - Course/Degree
  - Passout Year
  - Institution
  - CGPA/Percentage
  - Issue Date

**Validations:**
- Required fields enforcement
- Duplicate certificate prevention
- Data format validation
- Institution existence check

---

### 5️⃣ **Alerts & Fraud Detection** (Admin Only)
**What it does:** Monitors suspicious activities and potential fraud

**Alert Types:**
- **Fake Certificate:** Certificate detected as fraudulent
- **Suspicious Activity:** Unusual verification patterns
- **Duplicate Found:** Same certificate verified multiple times
- **Institution Fraud:** Fraudulent institution detected
- **Bulk Forgery:** Multiple fake certificates from one source

**Alert Management:**
- View all active alerts
- Search alerts by certificate/student name
- Filter by severity (critical/high/medium/low)
- Update alert status (open/investigating/resolved/dismissed)
- Add investigation notes

---

### 6️⃣ **Institution Management**
**What it does:** Maintain registry of educational institutions

**Features:**
- **Add Institution:**
  - Institution name
  - Type (College, University, Board)
  - Location/Address
  - Contact details
  - Admin assigned

- **View Institutions:**
  - Complete list with details
  - Certificate count per institution
  - Admin contact information
  - Status (active/inactive)

- **Manage:**
  - Enable/disable institutions
  - Update institution details
  - Assign/change institution admin

---

### 7️⃣ **Authentication & Security**
**Features:**
- **JWT-based Authentication:** Secure token-based login
- **Password Hashing:** bcryptjs encryption for all passwords
- **Role-based Access Control (RBAC):** Three distinct user roles
- **Protected Routes:** All sensitive endpoints require valid JWT token
- **Token Expiration:** 24-hour JWT lifespan
- **CORS Protection:** Cross-origin requests restricted
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Helmet Security:** HTTP security headers (CSP, X-Frame-Options, etc.)
- **Session Persistence:** Automatic re-login from localStorage

**Login Flow:**
1. User enters email + password
2. System finds user in database
3. Compares bcrypt password hash
4. Issues JWT token (valid 24 hours)
5. Stores token + user info in localStorage
6. All subsequent API calls include token in Authorization header

---

## 🔍 OCR & Text Extraction (Google Cloud Vision)

**What it does:** Converts images/PDFs into readable text for certificate verification

**Technology:** Google Cloud Vision API
- Supports: PDF files, PNG, JPG, GIF, WebP
- Extracts: Student name, certificate ID, institution, course, dates, signatures

**Flow:**
1. User uploads certificate file
2. System converts to base64
3. Sends to Google Cloud Vision API
4. API returns extracted text
5. System parses text for key fields
6. Compares with database records

**Advantages:**
- ✅ Native PDF support (handles scanned certificates)
- ✅ High accuracy (95%+)
- ✅ Handles multiple languages
- ✅ Detects document tampering clues

---

## 💾 Database Schema (MongoDB)

### Collections:

**1. Users Collection**
```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: String (admin/institution/employer),
  institution: ObjectId (ref to Institution),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**2. Institutions Collection**
```javascript
{
  name: String,
  type: String (college/university),
  address: String,
  contactEmail: String,
  admin: ObjectId (ref to User),
  isActive: Boolean,
  createdAt: Date
}
```

**3. Certificates Collection**
```javascript
{
  certificateId: String (unique, required),
  studentName: String (required),
  rollNumber: String,
  course: String,
  degree: String,
  passoutYear: Number (required),
  cgpa: String,
  percentage: String,
  institution: ObjectId (ref to Institution, required),
  issueDate: Date,
  expiryDate: Date,
  isRevoked: Boolean,
  createdAt: Date
}
```

**4. VerificationLog Collection**
```javascript
{
  verificationId: String (unique),
  certificateId: String,
  uploadedFile: String (file path),
  verifiedBy: ObjectId (ref to User),
  extractedData: {
    studentName: String,
    certificateId: String,
    institutionName: String,
    course: String,
    passoutYear: String
  },
  status: String (authentic/suspicious/fake/not_found),
  confidenceScore: Number (0-100),
  anomalies: [{type, severity, description}],
  verifiedAt: Date
}
```

**5. Alerts Collection**
```javascript
{
  type: String (fake_certificate/suspicious_activity/duplicate_found/institution_fraud/bulk_forgery),
  description: String,
  relatedCertificate: ObjectId (ref to Certificate),
  relatedVerification: ObjectId (ref to VerificationLog),
  severity: String (critical/high/medium/low),
  status: String (open/investigating/resolved/dismissed),
  reportedBy: ObjectId (ref to User),
  createdAt: Date,
  resolvedAt: Date
}
```

---

## 🔌 API Endpoints Summary

### Authentication Routes (`/api/auth`)
- `POST /login` - User login (returns JWT token)
- `POST /register` - User registration
- `GET /users` - List all users (admin only)

### Certificate Routes (`/api/certificates`)
- `GET /` - List certificates (with pagination)
- `POST /` - Create single certificate
- `POST /bulk` - Bulk upload certificates
- `GET /:id` - Get certificate by ID
- `PUT /:id` - Update certificate
- `DELETE /:id` - Delete certificate

### Verification Routes (`/api/verification`)
- `POST /` - Verify a certificate (upload + OCR)
- `GET /` - Get verification logs (paginated, requires auth)
- `GET /:verificationId` - Get specific verification result

### Institution Routes (`/api/institutions`)
- `GET /` - List all institutions
- `POST /` - Create institution (admin only)
- `GET /:id` - Get institution details
- `PUT /:id` - Update institution (admin only)

### Admin Routes (`/api/admin`)
- `GET /alerts` - Get all alerts
- `PUT /alerts/:id/resolve` - Resolve alert
- `POST /blacklist` - Add to blacklist
- `GET /blacklist` - Get blacklisted items

---

## 📊 Data Flow Example: Certificate Verification

```
USER ACTION: Upload a certificate PDF
    ↓
Frontend sends file to: POST /api/verification
    ↓
Backend receives file (Multer middleware)
    ↓
Google Cloud Vision API extracts text from PDF
    ↓
System parses extracted text for key fields:
  - Student Name: "John Doe"
  - Certificate ID: "JHK2024001"
  - Institution: "Ranchi University"
    ↓
Query MongoDB:
  - Find certificate matching ID
  - Compare submitted vs stored data
    ↓
Calculate confidence score:
  - All fields match = 95-100% (AUTHENTIC)
  - Minor mismatches = 70-85% (SUSPICIOUS)
  - Major mismatches = 0-60% (FAKE)
    ↓
Check for anomalies:
  - Duplicate certificate? → Alert generated
  - Data inconsistencies? → Log anomaly
  - Institution revoked? → Mark FAKE
    ↓
Create VerificationLog record
    ↓
Return result to Frontend:
{
  "success": true,
  "status": "authentic",
  "confidenceScore": 98,
  "matchedCertificate": {...},
  "anomalies": []
}
    ↓
Frontend displays result with confidence score
```

---

## 🚀 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19.2.5, Vite 8.0.10, React Router, Axios |
| **Backend** | Node.js, Express.js 4.x |
| **Database** | MongoDB |
| **OCR** | Google Cloud Vision API |
| **Authentication** | JWT, bcryptjs |
| **File Upload** | Multer |
| **Security** | Helmet, CORS, Rate Limiting |
| **Charts** | Recharts |
| **Styling** | CSS Modules, Custom Properties |
| **Notifications** | React Hot Toast |

---

## 🔐 Security Features

✅ **JWT Authentication** - Secure token-based API access  
✅ **Password Hashing** - bcryptjs with salt rounds  
✅ **RBAC** - Three-tier role access control  
✅ **Rate Limiting** - Prevent brute force attacks  
✅ **CORS Protection** - Restrict cross-origin requests  
✅ **Helmet Security** - HTTP security headers  
✅ **Token Expiration** - 24-hour JWT lifespan  
✅ **Input Validation** - All inputs validated before processing  
✅ **Protected Routes** - Frontend route guards + backend middleware  
✅ **File Upload Limits** - 50MB max per file  

---

## 📈 Key Metrics & Statistics

The system tracks:
- Total certificates verified
- Authentic vs Fake vs Suspicious ratio
- Verification trends over time
- Average confidence scores
- Fraud detection rate
- Institution performance
- User activity logs
- Alert resolution time

---

## 🎓 Use Cases

### 1. **Employer Verification**
   - HR department uploads job applicant's certificate
   - System verifies authenticity in seconds
   - HR makes hiring decision with confidence

### 2. **Institution Quality Check**
   - University uploads all issued certificates
   - System creates database of legitimate certificates
   - Prevents counterfeit copies

### 3. **Fraud Detection**
   - Admin monitors alerts for suspicious patterns
   - Identifies bulk forgery attempts
   - Investigates and blacklists fraudulent certificates

### 4. **Government Auditing**
   - Educational board audits institutions
   - Cross-references all certificates issued
   - Maintains nation-wide certificate registry

### 5. **Public Verification**
   - Anyone can verify a certificate without login
   - Check certificate before making decisions
   - Build trust in educational system

---

## 🚀 Quick Start Guide

### Setup (One-time)
```bash
# Backend Setup
cd certverify-backend
npm install
node seed.js

# Frontend Setup
cd authenticity-validator
npm install
```

### Running the Application
```bash
# Terminal 1: Start Backend (port 5000)
cd certverify-backend
npm start

# Terminal 2: Start Frontend (port 5174)
cd authenticity-validator
npm run dev
```

### Test Login
```
Email: admin@hed.jharkhand.gov.in
Password: Admin@123
```

### Access Points
- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

---

## ✅ Current Status

- ✅ Backend running on port 5000
- ✅ Frontend running on port 5174
- ✅ Database seeded with test data
- ✅ Google Cloud Vision API integrated
- ✅ JWT authentication working
- ✅ All CRUD operations functional
- ✅ Verification workflow complete
- ✅ Admin panel fully operational
- ✅ Alert system active
- ✅ Role-based access control enforced

---

## 📝 Sample Data Available

**5 Pre-created Users:**
- admin@hed.jharkhand.gov.in (Admin)
- admin@ru.ac.in (Institution)
- admin@bit.ac.in (Institution)
- hr@tcs.com (Employer)
- recruit@infosys.com (Employer)

**6 Institutions:**
- Ranchi University
- BIT Mesra
- JTU Ranchi
- St. Xavier's College
- Dumka Engineering College
- Hazaribagh College

**8 Sample Certificates:**
- Ready for verification testing
- Different institutions
- Various passout years

---

## 🎯 Conclusion

The Certificate Authenticity Validator is a production-ready system that leverages OCR technology, database validation, and intelligent fraud detection to combat certificate fraud in educational institutions. The three-tier user model ensures appropriate access levels, while the comprehensive admin panel provides complete system oversight and management capabilities.

The system is now fully functional and ready for deployment, testing, and real-world usage.

---

**Generated:** May 7, 2026  
**Status:** ✅ Fully Operational  
**Version:** 1.0  
