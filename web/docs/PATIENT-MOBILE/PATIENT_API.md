# 📋 Patient Profile Management API Documentation

> **Last Updated:** November 19, 2025  
> **API Version:** v1  
> **Base URL:** `http://localhost:4000/v1` (Development)

---

## 🚀 Quick Start for Backend Team

### What You Need to Implement

**2 Endpoints:**
1. **PUT /v1/patient/profile** - Update patient profile data
2. **POST /v1/patient/avatar** - Upload patient avatar/profile picture

### Key Points

✅ **Avatar URL** is stored in `users.avatar_url` (NOT in patient_profiles)  
✅ **Insurance fields** are separate columns: `insurance_provider`, `insurance_number`, `insurance_member_id`  
✅ **JSONB fields** use camelCase: `chronicConditions`, `postalCode` (NOT snake_case)  
✅ **Date format**: YYYY-MM-DD (e.g., "1990-05-15")  
✅ **All fields are optional** - support partial updates  
✅ **Auto-create profile** if doesn't exist (INSERT on first update)  

### Quick Implementation Steps

1. Install multer: `npm install multer`
2. Create `uploads/avatars/` directory
3. Copy code from **Backend Implementation Guide** section below
4. Test with cURL commands provided
5. Verify mobile app integration works

### Data Flow

```
Mobile App (EditProfileScreen)
    ↓ (snake_case)
PUT /v1/patient/profile → patient_profiles table
POST /v1/patient/avatar → users.avatar_url
    ↓
Database Updated
    ↓
Response (JSON)
    ↓
Mobile Redux Updated
```

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Endpoint PUT /v1/patient/profile](#endpoint-put-v1patientprofile)
3. [Endpoint POST /v1/patient/avatar](#endpoint-post-v1patientavatar)
4. [Error Handling](#error-handling)
5. [Testing Guide](#testing-guide)
6. [Mobile Integration](#mobile-integration)

---

## Overview

API ini menyediakan endpoint khusus untuk patient profile management dengan struktur data yang optimal untuk aplikasi mobile. Menggunakan JSONB fields untuk fleksibilitas data.

### Authentication
Semua endpoint **WAJIB** menggunakan Bearer token authentication:
```
Authorization: Bearer <accessToken>
```

### Database Schema
```sql
-- Table: users (contains avatar_url)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  password_hash TEXT NOT NULL,
  roles TEXT[] DEFAULT ARRAY['patient'],
  avatar_url TEXT,           -- ✅ Avatar stored in users table
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: patient_profiles
CREATE TABLE patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  insurance_provider TEXT,    -- ✅ Separate column (not JSONB)
  insurance_number TEXT,      -- ✅ Separate column (not JSONB)
  insurance_member_id TEXT,   -- ✅ Separate column (not JSONB)
  address JSONB,              -- Flexible JSON structure
  emergency_contact JSONB,    -- Flexible JSON structure
  medical_details JSONB,      -- Flexible JSON structure (allergies, chronicConditions, medications, notes)
  preferred_language TEXT DEFAULT 'id',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## Endpoint: PUT /v1/patient/profile

Update patient profile information with JSONB fields for complex data structures.

### Request Details

**Method:** `PUT`  
**Path:** `/v1/patient/profile`  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `application/json`

### Request Body

**IMPORTANT:** This endpoint updates `patient_profiles` table only. Avatar is updated via separate endpoint (POST /v1/patient/avatar) which updates `users.avatar_url`.

```json
{
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "insurance_provider": "BPJS Kesehatan",
  "insurance_number": "0001234567890",
  "insurance_member_id": "PLAT-9912",
  "preferred_language": "id",
  "address": {
    "line1": "Jl. Sudirman No. 123",
    "line2": "Apartment Tower A, Unit 45",
    "city": "Jakarta Selatan",
    "province": "DKI Jakarta",
    "postalCode": "12190"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "+6281987654321",
    "relationship": "Spouse"
  },
  "medical_details": {
    "allergies": ["Penicillin", "Peanuts", "Shellfish"],
    "medications": ["Aspirin 100mg", "Vitamin D"],
    "chronicConditions": ["Hypertension", "Type 2 Diabetes"],
    "notes": "Regular checkup every 3 months"
  }
}
```

### Field Specifications

#### Root Level Fields (snake_case for database columns)

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `date_of_birth` | string | No | YYYY-MM-DD | Birth date in ISO format |
| `gender` | enum | No | male\|female\|other | Patient's gender |
| `insurance_provider` | string | No | 1-255 chars | Insurance company name |
| `insurance_number` | string | No | 1-100 chars | Insurance policy number |
| `insurance_member_id` | string | No | 1-100 chars | Insurance member ID |
| `preferred_language` | string | No | id\|en | Preferred language (default: 'id') |
| `address` | object | No | See below | Physical address (JSONB) |
| `emergency_contact` | object | No | See below | Emergency contact info (JSONB) |
| `medical_details` | object | No | See below | Medical information (JSONB) |

#### Address Object (JSONB)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `line1` | string | No | Primary address line |
| `line2` | string | No | Secondary address (apt, suite, etc) |
| `city` | string | No | City name |
| `province` | string | No | Province/state name |
| `postalCode` | string | No | Postal/ZIP code (camelCase in JSONB) |

#### Emergency Contact Object (JSONB)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Emergency contact name |
| `phone` | string | No | Emergency contact phone |
| `relationship` | string | No | Relationship to patient |

#### Medical Details Object (JSONB)

**IMPORTANT:** Use camelCase for JSONB field names (chronicConditions, not chronic_conditions)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allergies` | array | No | List of allergies (can be empty []) |
| `medications` | array | No | List of current medications (can be empty []) |
| `chronicConditions` | array | No | List of chronic conditions (camelCase!) |
| `notes` | string | No | Additional medical notes |

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user_id": 123,
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001234567890",
    "insurance_member_id": "PLAT-9912",
    "preferred_language": "id",
    "address": {
      "line1": "Jl. Sudirman No. 123",
      "line2": "Apartment Tower A, Unit 45",
      "city": "Jakarta Selatan",
      "province": "DKI Jakarta",
      "postalCode": "12190"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "phone": "+6281987654321",
      "relationship": "Spouse"
    },
    "medical_details": {
      "allergies": ["Penicillin", "Peanuts", "Shellfish"],
      "medications": ["Aspirin 100mg", "Vitamin D"],
      "chronicConditions": ["Hypertension", "Type 2 Diabetes"],
      "notes": "Regular checkup every 3 months"
    },
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-19T14:20:00.000Z"
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Gender
```json
{
  "statusCode": 400,
  "message": "Invalid gender value. Must be male, female, or other"
}
```

#### 400 Bad Request - Invalid Date Format
```json
{
  "statusCode": 400,
  "message": "Invalid date_of_birth format. Use YYYY-MM-DD"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden - Not a Patient
```json
{
  "statusCode": 403,
  "message": "Access denied. Patient role required"
}
```

### cURL Example

```bash
curl -X PUT http://localhost:4000/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001234567890",
    "insurance_member_id": "PLAT-9912",
    "preferred_language": "id",
    "address": {
      "line1": "Jl. Sudirman No. 123",
      "line2": "Apt 45",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "12190"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "phone": "+6281987654321",
      "relationship": "Spouse"
    },
    "medical_details": {
      "allergies": ["Penicillin"],
      "medications": ["Aspirin 100mg"],
      "chronicConditions": ["Hypertension"],
      "notes": "Regular checkup needed"
    }
  }'
```

---

## Endpoint: POST /v1/patient/avatar

Upload patient profile picture (avatar image).

### Request Details

**Method:** `POST`  
**Path:** `/v1/patient/avatar`  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `multipart/form-data`

### Request Body (Form Data)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `avatar` | file | ✅ Yes | Image file (JPEG/PNG), Max 5MB |

### File Specifications

- **Allowed formats:** JPEG (.jpg, .jpeg), PNG (.png)
- **Maximum size:** 5 MB (5,242,880 bytes)
- **Recommended dimensions:** 512x512px or 1024x1024px
- **File naming:** Auto-generated as `patient-{userId}-{timestamp}.{ext}`

### Success Response (200 OK)

**NOTE:** This endpoint updates `users.avatar_url` (NOT patient_profiles table)

```json
{
  "status": "success",
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "/uploads/avatars/patient-123-1704067200000-987654321.jpg"
  }
}
```

### Error Responses

#### 400 Bad Request - No File
```json
{
  "statusCode": 400,
  "message": "No file uploaded"
}
```

#### 400 Bad Request - Invalid File Type
```json
{
  "statusCode": 400,
  "message": "Only image files (JPEG, PNG) are allowed"
}
```

#### 400 Bad Request - File Too Large
```json
{
  "statusCode": 400,
  "message": "File size exceeds 5MB limit"
}
```

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden - Not a Patient
```json
{
  "statusCode": 403,
  "message": "Access denied. Patient role required"
}
```

### cURL Example

```bash
curl -X POST http://localhost:4000/v1/patient/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "avatar=@/path/to/profile-picture.jpg"
```

### Behavior Notes

1. **Automatic Cleanup:** When uploading a new avatar, the old avatar file is automatically deleted from the server
2. **Updates users.avatar_url:** This endpoint updates the `users` table (NOT `patient_profiles`)
3. **Transaction Safety:** Uses database transactions - if upload fails, no changes are persisted
4. **File Rollback:** If database update fails after upload, the uploaded file is automatically deleted
5. **Authentication Required:** Must be authenticated as a patient role

---

## Error Handling

### Standard Error Response Format

All errors follow this structure:
```json
{
  "statusCode": 400,
  "message": "Error description"
}
```

### Common HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|---------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input data or validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User doesn't have required role (not a patient) |
| 404 | Not Found | User not found in database |
| 500 | Internal Server Error | Database error or server issue |

---

## Backend Implementation Guide

### 1. Update Profile Endpoint (PUT /v1/patient/profile)

**File: `backend/src/controllers/patientController.js`**

```javascript
const pool = require('../config/database');

exports.updatePatientProfile = async (req, res) => {
  const userId = req.user.id; // From JWT middleware
  const {
    date_of_birth,
    gender,
    insurance_provider,
    insurance_number,
    insurance_member_id,
    preferred_language,
    address,
    emergency_contact,
    medical_details,
  } = req.body;

  try {
    // Validate gender if provided
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid gender value. Must be male, female, or other',
      });
    }

    // Validate date format if provided
    if (date_of_birth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date_of_birth)) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Invalid date_of_birth format. Use YYYY-MM-DD',
        });
      }
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if patient profile exists
      const checkResult = await client.query(
        'SELECT id FROM patient_profiles WHERE user_id = $1',
        [userId]
      );

      let query, values;

      if (checkResult.rows.length > 0) {
        // UPDATE existing profile
        query = `
          UPDATE patient_profiles 
          SET 
            date_of_birth = COALESCE($1, date_of_birth),
            gender = COALESCE($2, gender),
            insurance_provider = COALESCE($3, insurance_provider),
            insurance_number = COALESCE($4, insurance_number),
            insurance_member_id = COALESCE($5, insurance_member_id),
            preferred_language = COALESCE($6, preferred_language),
            address = COALESCE($7, address),
            emergency_contact = COALESCE($8, emergency_contact),
            medical_details = COALESCE($9, medical_details),
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $10
          RETURNING *
        `;
        
        values = [
          date_of_birth,
          gender,
          insurance_provider,
          insurance_number,
          insurance_member_id,
          preferred_language,
          address ? JSON.stringify(address) : null,
          emergency_contact ? JSON.stringify(emergency_contact) : null,
          medical_details ? JSON.stringify(medical_details) : null,
          userId,
        ];
      } else {
        // INSERT new profile
        query = `
          INSERT INTO patient_profiles (
            user_id, date_of_birth, gender, 
            insurance_provider, insurance_number, insurance_member_id,
            preferred_language, address, emergency_contact, medical_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
        
        values = [
          userId,
          date_of_birth,
          gender,
          insurance_provider,
          insurance_number,
          insurance_member_id,
          preferred_language || 'id',
          address ? JSON.stringify(address) : null,
          emergency_contact ? JSON.stringify(emergency_contact) : null,
          medical_details ? JSON.stringify(medical_details) : null,
        ];
      }

      const result = await client.query(query, values);
      await client.query('COMMIT');

      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: result.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating patient profile:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};
```

### 2. Upload Avatar Endpoint (POST /v1/patient/avatar)

**File: `backend/src/controllers/patientController.js`**

```javascript
const fs = require('fs').promises;
const path = require('path');

exports.uploadPatientAvatar = async (req, res) => {
  const userId = req.user.id; // From JWT middleware

  try {
    if (!req.file) {
      return res.status(400).json({
        statusCode: 400,
        message: 'No file uploaded',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get old avatar URL to delete old file
      const oldAvatarResult = await client.query(
        'SELECT avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const oldAvatarUrl = oldAvatarResult.rows[0]?.avatar_url;

      // Update user's avatar_url in users table (NOT patient_profiles)
      await client.query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [avatarUrl, userId]
      );

      await client.query('COMMIT');

      // Delete old avatar file if exists
      if (oldAvatarUrl) {
        const oldFilePath = path.join(__dirname, '../../', oldAvatarUrl);
        try {
          await fs.unlink(oldFilePath);
          console.log('✅ Old avatar deleted:', oldFilePath);
        } catch (unlinkError) {
          console.warn('⚠️ Could not delete old avatar:', unlinkError.message);
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Avatar uploaded successfully',
        data: {
          avatar_url: avatarUrl,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Delete uploaded file if database update fails
      const uploadedFilePath = path.join(__dirname, '../../uploads/avatars/', req.file.filename);
      try {
        await fs.unlink(uploadedFilePath);
        console.log('🗑️ Rolled back file upload');
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file after rollback:', unlinkError);
      }
      
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to upload avatar',
      error: error.message,
    });
  }
};
```

### 3. Multer Configuration

**File: `backend/src/middleware/upload.js`**

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const ext = path.extname(file.originalname);
    cb(null, `patient-${userId}-${timestamp}-${randomNum}${ext}`);
  },
});

// File filter (only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG) are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: fileFilter,
});

module.exports = upload;
```

### 4. Routes Configuration

**File: `backend/src/routes/patient.js`**

```javascript
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateJWT, requirePatientRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// PUT /v1/patient/profile - Update patient profile
router.put(
  '/profile',
  authenticateJWT,
  requirePatientRole,
  patientController.updatePatientProfile
);

// POST /v1/patient/avatar - Upload avatar
router.post(
  '/avatar',
  authenticateJWT,
  requirePatientRole,
  upload.single('avatar'),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          statusCode: 400,
          message: 'File size exceeds 5MB limit',
        });
      }
    } else if (err) {
      return res.status(400).json({
        statusCode: 400,
        message: err.message,
      });
    }
    next();
  },
  patientController.uploadPatientAvatar
);

module.exports = router;
```

### 5. Mount Routes in Server

**File: `backend/src/server.js` or `backend/src/app.js`**

```javascript
const express = require('express');
const path = require('path');
const patientRoutes = require('./routes/patient');

const app = express();

// Middleware
app.use(express.json());

// Serve static files (avatars)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount patient routes
app.use('/v1/patient', patientRoutes);

// ... other routes

module.exports = app;
```

### 6. Authentication Middleware Example

**File: `backend/src/middleware/auth.js`**

```javascript
const jwt = require('jsonwebtoken');

exports.authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, roles }
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
};

exports.requirePatientRole = (req, res, next) => {
  if (!req.user.roles || !req.user.roles.includes('patient')) {
    return res.status(403).json({
      statusCode: 403,
      message: 'Access denied. Patient role required',
    });
  }
  next();
};
```

### 7. Required npm Packages

```bash
npm install multer
```

### 8. Folder Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── patientController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── routes/
│   │   └── patient.js
│   ├── config/
│   │   └── database.js
│   └── server.js
├── uploads/
│   └── avatars/          # Auto-created by multer
│       └── (avatar files stored here)
└── package.json
```

---

## Testing Guide

### Using HTML Test Interface

1. Open `test-patient-endpoints.html` in a browser
2. Step 1: Register a new patient to get access token
3. Step 2: Update profile with test data
4. Step 3: Upload an avatar image

### Manual Testing with cURL

#### 1. Register Patient
```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test Patient",
    "phone": "+6281234567890"
  }'
```

Save the `accessToken` from response.

#### 2. Update Profile
```bash
TOKEN="your_access_token_here"

curl -X PUT http://localhost:4000/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "address": {
      "line1": "Jl. Sudirman 123",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postal_code": "12190"
    },
    "emergency_contact": {
      "name": "Emergency Contact",
      "phone": "+628199999999",
      "relationship": "Family"
    },
    "medical_details": {
      "allergies": [],
      "current_medications": [],
      "medical_conditions": []
    }
  }'
```

#### 3. Upload Avatar
```bash
TOKEN="your_access_token_here"

curl -X POST http://localhost:4000/v1/patient/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@avatar.jpg"
```

---

## Mobile Integration

### Service Layer (patientService.js)

The mobile app uses a dedicated service layer to handle API calls:

**File: `mobile/src/services/patientService.js`**

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000'; // Android emulator
    }
    return 'http://localhost:4000'; // iOS simulator
  }
  return 'https://api.dentalization.id'; // Production
};

const API_BASE_URL = getApiBaseUrl();

const getAccessToken = async () => {
  return await AsyncStorage.getItem('accessToken');
};

export const updatePatientProfile = async (profileData) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const response = await axios.put(
      `${API_BASE_URL}/v1/patient/profile`,
      profileData,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ Profile update failed:', error.response?.data || error.message);
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Please login again.',
        };
      } else if (status === 400) {
        return {
          success: false,
          error: 'Validation failed',
          message: data.message || 'Invalid data provided.',
        };
      }
    }
    
    return {
      success: false,
      error: 'Unknown error',
      message: error.message || 'Something went wrong.',
    };
  }
};

export const uploadPatientAvatar = async (avatarFile) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    const formData = new FormData();
    formData.append('avatar', {
      uri: Platform.OS === 'ios' ? avatarFile.uri.replace('file://', '') : avatarFile.uri,
      type: avatarFile.type,
      name: avatarFile.name,
    });

    const response = await axios.post(
      `${API_BASE_URL}/v1/patient/avatar`,
      formData,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ Avatar upload failed:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};
```

### EditProfileScreen Integration

**File: `mobile/src/features/settings/screens/EditProfileScreen.jsx`**

Key implementation points:

1. **Date Format Conversion:**
```javascript
// Display format: DD/MM/YYYY
// Backend format: YYYY-MM-DD

// Convert for display
const displayDate = patientProfile?.dateOfBirth 
  ? (() => {
      const date = new Date(patientProfile.dateOfBirth);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    })()
  : '';

// Convert for backend
const parts = form.dateOfBirth.trim().split('/');
const dateOfBirth = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
```

2. **Data Preparation for Backend (snake_case):**
```javascript
const profileDataForBackend = {
  // Direct columns (snake_case)
  date_of_birth: dateOfBirth,
  gender: form.gender.toLowerCase(),
  insurance_provider: form.insuranceProvider.trim() || null,
  insurance_number: form.insuranceNumber.trim() || null,
  insurance_member_id: form.insuranceMemberId.trim() || null,
  preferred_language: form.preferredLanguage || 'id',
  
  // JSONB fields (camelCase inside objects)
  address: {
    line1: form.addressLine1.trim() || null,
    line2: form.addressLine2.trim() || null,
    city: form.city.trim() || null,
    province: form.province.trim() || null,
    postalCode: form.postalCode.trim() || null,
  },
  medical_details: {
    allergies: form.allergies,
    chronicConditions: form.chronicConditions,
    medications: form.medications,
    notes: form.medicalNotes.trim() || null,
  },
  emergency_contact: form.emergencyContactName.trim() ? {
    name: form.emergencyContactName.trim(),
    phone: form.emergencyContactPhone.trim(),
    relationship: form.emergencyContactRelationship.trim(),
  } : null,
};
```

3. **Save Flow:**
```javascript
const handleSave = async () => {
  setLoading(true);

  try {
    // 1. Upload avatar first (if changed)
    let avatarUrl = user?.avatar_url;
    if (avatarFile) {
      const uploadResult = await uploadPatientAvatar(avatarFile);
      
      if (uploadResult.success) {
        avatarUrl = uploadResult.data.avatar_url;
        dispatch(updateUser({ avatar_url: avatarUrl }));
      }
    }

    // 2. Update profile
    const result = await updatePatientProfile(profileDataForBackend);
    
    if (result.success) {
      // 3. Update Redux
      dispatch(updateProfile(profileDataForRedux));
      
      Alert.alert('Success', 'Profil berhasil diperbarui!');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.message);
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};
```

### Redux Integration

**authSlice.js actions:**

```javascript
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    patientProfile: null,
    accessToken: null,
  },
  reducers: {
    updateProfile: (state, action) => {
      state.patientProfile = {
        ...state.patientProfile,
        ...action.payload,
      };
    },
    updateUser: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
  },
});

export const { updateProfile, updateUser } = authSlice.actions;
export default authSlice.reducer;
```

---

## Implementation Checklist

### Backend ✅

- [ ] Install `multer` package: `npm install multer`
- [ ] Create `backend/uploads/avatars/` directory
- [ ] Create `backend/src/middleware/upload.js` (multer config)
- [ ] Create `backend/src/controllers/patientController.js`
- [ ] Add `updatePatientProfile` function
- [ ] Add `uploadPatientAvatar` function
- [ ] Create `backend/src/routes/patient.js`
- [ ] Mount routes in `server.js`: `app.use('/v1/patient', patientRoutes)`
- [ ] Configure static file serving: `app.use('/uploads', express.static(...))`
- [ ] Test PUT /v1/patient/profile with cURL
- [ ] Test POST /v1/patient/avatar with cURL
- [ ] Verify database updates (both `users.avatar_url` and `patient_profiles` columns)

### Database Verification ✅

- [ ] Verify `users` table has `avatar_url` column (TEXT)
- [ ] Verify `patient_profiles` table has these columns:
  - [ ] `date_of_birth` (DATE)
  - [ ] `gender` (TEXT)
  - [ ] `insurance_provider` (TEXT)
  - [ ] `insurance_number` (TEXT)
  - [ ] `insurance_member_id` (TEXT)
  - [ ] `preferred_language` (TEXT, default 'id')
  - [ ] `address` (JSONB)
  - [ ] `emergency_contact` (JSONB)
  - [ ] `medical_details` (JSONB)

### Frontend (Mobile) ✅

- [✅] Service layer created: `patientService.js`
- [✅] `updatePatientProfile()` function implemented
- [✅] `uploadPatientAvatar()` function implemented
- [✅] EditProfileScreen.jsx completed with:
  - [✅] Date format conversion (DD/MM/YYYY ↔ YYYY-MM-DD)
  - [✅] Avatar upload UI (camera + gallery)
  - [✅] Form validation
  - [✅] Redux integration
  - [✅] Snake_case data preparation for backend
  - [✅] Error handling
- [✅] Redux actions: `updateProfile`, `updateUser`
- [ ] Test profile update on iOS
- [ ] Test profile update on Android
- [ ] Test avatar upload on iOS
- [ ] Test avatar upload on Android

---

## Important Notes

### Database Structure

1. **Avatar Storage:**
   - ✅ `avatar_url` is stored in `users` table (NOT `patient_profiles`)
   - Updated via POST /v1/patient/avatar endpoint
   - Example: `/uploads/avatars/patient-123-1704067200000.jpg`

2. **Patient Profile Columns:**
   - Direct columns (snake_case): `date_of_birth`, `gender`, `insurance_provider`, `insurance_number`, `insurance_member_id`, `preferred_language`
   - JSONB columns: `address`, `emergency_contact`, `medical_details`

3. **JSONB Field Names:**
   - Use **camelCase** inside JSONB objects: `chronicConditions`, `postalCode`
   - Example: `medical_details.chronicConditions` (NOT `chronic_conditions`)

### Data Format Conventions

1. **Dates:**
   - Database/API: `YYYY-MM-DD` (e.g., "1990-05-15")
   - Mobile UI Display: `DD/MM/YYYY` (e.g., "15/08/1995")

2. **Column Names:**
   - Database columns: `snake_case` (e.g., `date_of_birth`)
   - JSONB fields: `camelCase` (e.g., `chronicConditions`)

3. **Null vs Empty:**
   - Arrays can be empty `[]` (allergies: [])
   - Strings use `null` if not provided
   - Objects use `null` if all fields are empty

### API Behavior

1. **Partial Updates:** All fields are optional - only send fields you want to update
2. **Transaction Safety:** Uses PostgreSQL transactions for data integrity
3. **File Management:** Automatic cleanup of old avatar files when uploading new ones
4. **Role Validation:** Endpoints restricted to users with 'patient' role
5. **Auto-Insert:** If patient profile doesn't exist, it will be created automatically

### Mobile App Integration

1. **Dual Data Preparation:**
   - Prepare data in snake_case for backend API
   - Store data in camelCase for Redux state

2. **Save Flow:**
   - Upload avatar first (if changed) → updates `users.avatar_url`
   - Update profile data → updates `patient_profiles` table
   - Update Redux store → local state management

3. **Error Handling:**
   - Graceful degradation if backend not ready
   - Saves to Redux even if API fails
   - Shows appropriate error messages to user

---

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Database schema: `backend/prisma/schema.prisma`
- Test interface: `test-patient-endpoints.html`
