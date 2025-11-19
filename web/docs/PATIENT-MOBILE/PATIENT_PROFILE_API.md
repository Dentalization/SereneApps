# 📋 Patient Profile Management API Documentation

> **Last Updated:** January 2025  
> **API Version:** v1  
> **Base URL:** `http://localhost:4000/v1` (Development)

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
-- Table: patient_profiles
CREATE TABLE patient_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  address JSONB,           -- Flexible JSON structure
  emergency_contact JSONB, -- Flexible JSON structure
  medical_details JSONB,   -- Flexible JSON structure
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

```json
{
  "full_name": "John Doe",
  "phone": "+6281234567890",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "address": {
    "line1": "Jl. Sudirman No. 123",
    "line2": "Apartment Tower A, Unit 45",
    "city": "Jakarta Selatan",
    "province": "DKI Jakarta",
    "postal_code": "12190"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "phone": "+6281987654321",
    "relationship": "Spouse"
  },
  "medical_details": {
    "allergies": ["Penicillin", "Peanuts", "Shellfish"],
    "current_medications": ["Aspirin 100mg", "Vitamin D"],
    "medical_conditions": ["Hypertension", "Type 2 Diabetes"],
    "blood_type": "A+",
    "notes": "Regular checkup every 3 months"
  }
}
```

### Field Specifications

#### Root Level Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `full_name` | string | No | 1-255 chars | Patient's full name |
| `phone` | string | No | E.164 format | Phone number with country code |
| `date_of_birth` | string | No | YYYY-MM-DD | Birth date in ISO format |
| `gender` | enum | No | male\|female\|other | Patient's gender |
| `address` | object | No | See below | Physical address |
| `emergency_contact` | object | No | See below | Emergency contact info |
| `medical_details` | object | No | See below | Medical information |

#### Address Object (JSONB)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `line1` | string | ✅ Yes | Primary address line |
| `line2` | string | No | Secondary address (apt, suite, etc) |
| `city` | string | ✅ Yes | City name |
| `province` | string | ✅ Yes | Province/state name |
| `postal_code` | string | ✅ Yes | Postal/ZIP code |

#### Emergency Contact Object (JSONB)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Emergency contact name |
| `phone` | string | ✅ Yes | Emergency contact phone |
| `relationship` | string | ✅ Yes | Relationship to patient |

#### Medical Details Object (JSONB)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `allergies` | array | ✅ Yes | List of allergies (can be empty []) |
| `current_medications` | array | ✅ Yes | List of medications (can be empty []) |
| `medical_conditions` | array | ✅ Yes | List of conditions (can be empty []) |
| `blood_type` | string | No | Blood type (A+, B-, O+, etc) |
| `notes` | string | No | Additional medical notes |

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 123,
      "full_name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+6281234567890",
      "role": "patient"
    },
    "profile": {
      "user_id": 123,
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "address": {
        "line1": "Jl. Sudirman No. 123",
        "line2": "Apartment Tower A, Unit 45",
        "city": "Jakarta Selatan",
        "province": "DKI Jakarta",
        "postal_code": "12190"
      },
      "emergency_contact": {
        "name": "Jane Doe",
        "phone": "+6281987654321",
        "relationship": "Spouse"
      },
      "medical_details": {
        "allergies": ["Penicillin", "Peanuts", "Shellfish"],
        "current_medications": ["Aspirin 100mg", "Vitamin D"],
        "medical_conditions": ["Hypertension", "Type 2 Diabetes"],
        "blood_type": "A+",
        "notes": "Regular checkup every 3 months"
      },
      "avatar_url": "/uploads/avatars/patient-123-1234567890.jpg"
    }
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

#### 400 Bad Request - Incomplete Address
```json
{
  "statusCode": 400,
  "message": "Address must include line1, city, province, and postal_code"
}
```

#### 400 Bad Request - Incomplete Emergency Contact
```json
{
  "statusCode": 400,
  "message": "Emergency contact must include name, phone, and relationship"
}
```

#### 400 Bad Request - Invalid Medical Details
```json
{
  "statusCode": 400,
  "message": "Medical details must include arrays for allergies, current_medications, and medical_conditions"
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
    "full_name": "John Doe",
    "phone": "+6281234567890",
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "address": {
      "line1": "Jl. Sudirman No. 123",
      "line2": "Apt 45",
      "city": "Jakarta",
      "province": "DKI Jakarta",
      "postal_code": "12190"
    },
    "emergency_contact": {
      "name": "Jane Doe",
      "phone": "+6281987654321",
      "relationship": "Spouse"
    },
    "medical_details": {
      "allergies": ["Penicillin"],
      "current_medications": ["Aspirin"],
      "medical_conditions": ["Hypertension"],
      "blood_type": "A+",
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
2. **Profile Creation:** If patient profile doesn't exist, it will be created automatically
3. **Transaction Safety:** Uses database transactions - if upload fails, no changes are persisted
4. **File Rollback:** If database update fails after upload, the uploaded file is automatically deleted

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

### Redux Integration

#### Action Types
```typescript
// types/profileTypes.ts
export const UPDATE_PATIENT_PROFILE_REQUEST = 'UPDATE_PATIENT_PROFILE_REQUEST';
export const UPDATE_PATIENT_PROFILE_SUCCESS = 'UPDATE_PATIENT_PROFILE_SUCCESS';
export const UPDATE_PATIENT_PROFILE_FAILURE = 'UPDATE_PATIENT_PROFILE_FAILURE';

export const UPLOAD_PATIENT_AVATAR_REQUEST = 'UPLOAD_PATIENT_AVATAR_REQUEST';
export const UPLOAD_PATIENT_AVATAR_SUCCESS = 'UPLOAD_PATIENT_AVATAR_SUCCESS';
export const UPLOAD_PATIENT_AVATAR_FAILURE = 'UPLOAD_PATIENT_AVATAR_FAILURE';
```

#### Action Creators
```typescript
// actions/profileActions.ts
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const updatePatientProfile = (profileData) => async (dispatch) => {
  dispatch({ type: UPDATE_PATIENT_PROFILE_REQUEST });
  
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    const response = await fetch(`${API_BASE_URL}/patient/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      dispatch({
        type: UPDATE_PATIENT_PROFILE_SUCCESS,
        payload: data.data
      });
      return { success: true, data: data.data };
    } else {
      dispatch({
        type: UPDATE_PATIENT_PROFILE_FAILURE,
        payload: data.message
      });
      return { success: false, error: data.message };
    }
  } catch (error) {
    dispatch({
      type: UPDATE_PATIENT_PROFILE_FAILURE,
      payload: error.message
    });
    return { success: false, error: error.message };
  }
};

export const uploadPatientAvatar = (imageUri) => async (dispatch) => {
  dispatch({ type: UPLOAD_PATIENT_AVATAR_REQUEST });
  
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg'
    });
    
    const response = await fetch(`${API_BASE_URL}/patient/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      dispatch({
        type: UPLOAD_PATIENT_AVATAR_SUCCESS,
        payload: data.data.avatar_url
      });
      return { success: true, avatar_url: data.data.avatar_url };
    } else {
      dispatch({
        type: UPLOAD_PATIENT_AVATAR_FAILURE,
        payload: data.message
      });
      return { success: false, error: data.message };
    }
  } catch (error) {
    dispatch({
      type: UPLOAD_PATIENT_AVATAR_FAILURE,
      payload: error.message
    });
    return { success: false, error: error.message };
  }
};
```

#### Reducer
```typescript
// reducers/profileReducer.ts
const initialState = {
  loading: false,
  error: null,
  user: null,
  profile: null,
  avatarUrl: null
};

export default function profileReducer(state = initialState, action) {
  switch (action.type) {
    case UPDATE_PATIENT_PROFILE_REQUEST:
    case UPLOAD_PATIENT_AVATAR_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case UPDATE_PATIENT_PROFILE_SUCCESS:
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        profile: action.payload.profile,
        error: null
      };
      
    case UPLOAD_PATIENT_AVATAR_SUCCESS:
      return {
        ...state,
        loading: false,
        avatarUrl: action.payload,
        error: null
      };
      
    case UPDATE_PATIENT_PROFILE_FAILURE:
    case UPLOAD_PATIENT_AVATAR_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    default:
      return state;
  }
}
```

#### Component Usage
```tsx
// screens/ProfileEditScreen.tsx
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updatePatientProfile, uploadPatientAvatar } from '../actions/profileActions';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileEditScreen() {
  const dispatch = useDispatch();
  const { loading, profile } = useSelector(state => state.profile);
  
  const [formData, setFormData] = useState({
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || 'male',
    address: profile?.address || {
      line1: '',
      line2: '',
      city: '',
      province: '',
      postal_code: ''
    },
    emergency_contact: profile?.emergency_contact || {
      name: '',
      phone: '',
      relationship: ''
    },
    medical_details: profile?.medical_details || {
      allergies: [],
      current_medications: [],
      medical_conditions: [],
      blood_type: '',
      notes: ''
    }
  });
  
  const handleSubmit = async () => {
    const result = await dispatch(updatePatientProfile(formData));
    if (result.success) {
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      Alert.alert('Error', result.error);
    }
  };
  
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const uploadResult = await dispatch(uploadPatientAvatar(result.assets[0].uri));
      if (uploadResult.success) {
        Alert.alert('Success', 'Avatar uploaded successfully');
      } else {
        Alert.alert('Error', uploadResult.error);
      }
    }
  };
  
  // Render form...
}
```

### Date Format Handling

The backend uses **YYYY-MM-DD** format for dates. Here's how to convert:

```typescript
// From display format (DD/MM/YYYY) to API format (YYYY-MM-DD)
const displayToApi = (displayDate: string): string => {
  const [day, month, year] = displayDate.split('/');
  return `${year}-${month}-${day}`;
};

// From API format (YYYY-MM-DD) to display format (DD/MM/YYYY)
const apiToDisplay = (apiDate: string): string => {
  const [year, month, day] = apiDate.split('-');
  return `${day}/${month}/${year}`;
};
```

---

## Implementation Checklist

### Backend ✅

- [✅] Create `backend/src/routes/patient.js`
- [✅] Create `backend/src/controllers/patientController.js`
- [✅] Mount routes in `backend/src/server.js`
- [✅] Test PUT /v1/patient/profile endpoint
- [✅] Test POST /v1/patient/avatar endpoint

### Frontend (Mobile) 📱

- [ ] Update `API_BASE_URL` in config
- [ ] Create Redux actions for profile update
- [ ] Create Redux actions for avatar upload
- [ ] Add profile reducer
- [ ] Implement ProfileEditScreen component
- [ ] Add image picker for avatar
- [ ] Handle date format conversion
- [ ] Add form validation
- [ ] Test on iOS and Android

---

## Notes

1. **JSONB Flexibility:** `address`, `emergency_contact`, and `medical_details` use JSONB for flexible schema
2. **Partial Updates:** All fields are optional - only send fields you want to update
3. **Transaction Safety:** Uses PostgreSQL transactions for data integrity
4. **File Management:** Automatic cleanup of old avatar files
5. **Role Validation:** Endpoints are restricted to users with 'patient' role

---

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Database schema: `backend/prisma/schema.prisma`
- Test interface: `test-patient-endpoints.html`
