# Backend API - Patient Profile Endpoints

## Overview
Mobile app sudah siap untuk update profile, tapi backend endpoint masih belum ada. Implementasikan endpoint berikut untuk save data ke database.

---

## 1. Update Patient Profile

### Endpoint
```
PUT /v1/patient/profile
```

### Authentication
```
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "date_of_birth": "1995-08-15",
  "gender": "male",
  "insurance_provider": "BPJS Kesehatan",
  "insurance_number": "0001112387267",
  "insurance_member_id": "PLAT-1922",
  "preferred_language": "id",
  "address": {
    "line1": "Jl. Merdeka No. 123",
    "line2": "Apt 5B",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12312"
  },
  "medical_details": {
    "allergies": ["Penisilin", "Aspirin"],
    "chronicConditions": ["Diabetes"],
    "medications": ["Insulin 10mg 2x/day"],
    "notes": "Riwayat gigi sensitif"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "+6281234567890",
    "relationship": "Istri"
  }
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 123,
    "user_id": 456,
    "date_of_birth": "1995-08-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001112387267",
    "insurance_member_id": "PLAT-1922",
    "preferred_language": "id",
    "address": { ... },
    "medical_details": { ... },
    "emergency_contact": { ... },
    "updated_at": "2025-11-19T10:30:00Z"
  }
}
```

### Response Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid date format"
}
```

### Response Error (401)
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

---

## 2. Upload Patient Avatar

### Endpoint
```
POST /v1/patient/avatar
```

### Authentication
```
Authorization: Bearer <accessToken>
```

### Request Body (multipart/form-data)
```
avatar: <file> (image/jpeg, image/png, max 5MB)
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "avatar_url": "/uploads/avatars/456-1700480400000.jpg"
}
```

### Response Error (400)
```json
{
  "success": false,
  "error": "Invalid file",
  "message": "File too large or invalid format"
}
```

---

## Implementation Guide

### Node.js + Express + PostgreSQL

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Middleware untuk autentikasi JWT
const authenticate = require('../middleware/authenticate');

// ===== 1. UPDATE PROFILE =====

router.put('/patient/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Dari JWT token
    const {
      date_of_birth,
      gender,
      insurance_provider,
      insurance_number,
      insurance_member_id,
      preferred_language,
      address,
      medical_details,
      emergency_contact
    } = req.body;

    // Validate date format
    if (date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Update patient_profiles table
    const query = `
      UPDATE patient_profiles 
      SET 
        date_of_birth = $1,
        gender = $2,
        insurance_provider = $3,
        insurance_number = $4,
        insurance_member_id = $5,
        preferred_language = $6,
        address = $7,
        medical_details = $8,
        emergency_contact = $9,
        updated_at = NOW()
      WHERE user_id = $10
      RETURNING *
    `;

    const values = [
      date_of_birth,
      gender,
      insurance_provider,
      insurance_number,
      insurance_member_id,
      preferred_language || 'id',
      JSON.stringify(address),
      JSON.stringify(medical_details),
      JSON.stringify(emergency_contact),
      userId
    ];

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'Patient profile does not exist'
      });
    }

    // Parse JSONB fields back to objects
    const profile = result.rows[0];
    profile.address = typeof profile.address === 'string' 
      ? JSON.parse(profile.address) 
      : profile.address;
    profile.medical_details = typeof profile.medical_details === 'string'
      ? JSON.parse(profile.medical_details)
      : profile.medical_details;
    profile.emergency_contact = typeof profile.emergency_contact === 'string'
      ? JSON.parse(profile.emergency_contact)
      : profile.emergency_contact;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update profile'
    });
  }
});

// ===== 2. UPLOAD AVATAR =====

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG allowed.'));
    }
  }
});

router.post('/patient/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload an image file'
      });
    }

    // Generate avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update users table
    const query = 'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url';
    const result = await db.query(query, [avatarUrl, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to upload avatar'
    });
  }
});

module.exports = router;
```

### Database Schema Verification

Pastikan table `patient_profiles` memiliki kolom berikut:

```sql
-- Check existing columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patient_profiles';

-- Should have:
-- date_of_birth (DATE)
-- gender (TEXT)
-- insurance_provider (TEXT)
-- insurance_number (TEXT)
-- insurance_member_id (TEXT)
-- preferred_language (TEXT)
-- address (JSONB)
-- medical_details (JSONB)
-- emergency_contact (JSONB)
-- updated_at (TIMESTAMPTZ)
```

### Test the Endpoint

```bash
# 1. Test Update Profile
curl -X PUT http://localhost:4000/v1/patient/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "date_of_birth": "1995-08-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001112387267",
    "insurance_member_id": "PLAT-1922",
    "preferred_language": "id",
    "address": {
      "line1": "Jl. Merdeka No. 123",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postalCode": "12312"
    },
    "medical_details": {
      "allergies": ["Penisilin"],
      "chronicConditions": ["Diabetes"],
      "medications": ["Insulin"],
      "notes": "Aduh pusing"
    },
    "emergency_contact": null
  }'

# 2. Test Upload Avatar
curl -X POST http://localhost:4000/v1/patient/avatar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

---

## Current Status

### ✅ Mobile App
- Form edit profile: **READY**
- Avatar upload UI: **READY**
- API integration: **READY**
- Redux state: **READY**

### ❌ Backend
- `PUT /v1/patient/profile`: **NOT IMPLEMENTED**
- `POST /v1/patient/avatar`: **NOT IMPLEMENTED**

### 🔄 Temporary Behavior
Mobile app akan:
- ✅ Save ke Redux (data tampil di app)
- ⚠️ Show warning: "Profil tersimpan di aplikasi (belum sinkron ke server)"
- ❌ Data TIDAK tersimpan ke database
- ❌ Data HILANG saat reload app

### 🎯 After Backend Implementation
- ✅ Data tersimpan ke database
- ✅ Data persist setelah reload
- ✅ Avatar tersimpan di `/uploads/avatars/`
- ✅ Success message: "Profil berhasil diperbarui!"

---

## Priority: HIGH
Implementasikan endpoint ini SEGERA agar data user tidak hilang!
