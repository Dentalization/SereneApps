# 📱 Patient Registration - Complete Guide for Mobile App

> **Lengkap untuk Mobile Team**: Endpoint, data yang dibutuhkan, validation rules, dan response handling untuk patient registration di SereneAI Mobile App.

---

## 📋 Table of Contents

- [Overview](#overview)
- [API Endpoint](#api-endpoint)
- [Required Data Fields](#required-data-fields)
- [Request Format](#request-format)
- [Response Format](#response-format)
- [Validation Rules](#validation-rules)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)
- [Backend Configuration](#backend-configuration)
- [Testing Guide](#testing-guide)
- [Implementation Example](#implementation-example)

---

## 🎯 Overview

**Patient Registration** adalah proses pendaftaran akun patient baru di SereneAI. Setelah berhasil register, patient langsung bisa login dan booking appointment dengan dentist.

### Flow Diagram
```
┌─────────────────────┐
│  Mobile App Opens   │
│  Registration Form  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Fill Basic Info    │
│  - Name             │
│  - Email            │
│  - Password         │
│  - Phone Number     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Optional Medical    │
│ & Insurance Info    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  POST /v1/auth/     │
│  patient/register   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Backend validates  │
│  & creates user     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Returns tokens +   │
│  user profile       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  App saves tokens   │
│  & navigates to     │
│  Home/Dashboard     │
└─────────────────────┘
```

---

## 🔌 API Endpoint

### Base URL Configuration

**⚠️ IMPORTANT**: Backend berjalan di **port 4000** dan bisa di-access dari **window/folder berbeda**!

```javascript
// Environment Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const API_VERSION = 'v1';
```

### Endpoint Details

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/v1/auth/patient/register` |
| **Full URL (Local)** | `http://localhost:4000/v1/auth/patient/register` |
| **Full URL (Production)** | `https://api.dentalization.id/v1/auth/patient/register` |
| **Content-Type** | `application/json` |
| **Authentication** | ❌ Not Required (Public endpoint) |
| **Rate Limiting** | ✅ Yes (handled by backend) |

> **⚠️ IMPORTANT NOTE**: Path is `/v1/auth/...` **NOT** `/api/v1/auth/...`  
> Backend uses `API_VERSION=v1` without the `/api` prefix.

### Network Configuration untuk Testing

```javascript
// React Native - Allow localhost connection
// iOS: Gunakan http://localhost:4000
// Android Emulator: Gunakan http://10.0.2.2:4000
// Android Physical Device: Gunakan http://<YOUR_LOCAL_IP>:4000

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Android emulator
      return 'http://10.0.2.2:4000';
    }
    // iOS simulator or real device
    return 'http://localhost:4000';
  }
  return 'https://api.dentalization.id';
};
```

---

## 📝 Required Data Fields

### Minimum Required Fields (MUST HAVE)

```typescript
interface PatientRegistrationMinimal {
  // User Basic Info
  name: string;              // ✅ REQUIRED - Patient full name
  email: string;             // ✅ REQUIRED - Valid email format
  password: string;          // ✅ REQUIRED - Min 8 characters
  phoneNumber: string;       // ✅ REQUIRED - Patient phone number
}
```

### Optional Fields (RECOMMENDED)

```typescript
interface PatientRegistrationOptional {
  // Personal Information
  dateOfBirth?: string;      // Format: YYYY-MM-DD
  gender?: 'male' | 'female' | 'other';
  
  // Insurance Information
  insuranceProvider?: string;     // e.g., "BPJS", "Prudential"
  insuranceNumber?: string;       // Insurance card number
  insuranceMemberId?: string;     // Member ID on insurance card
  
  // Emergency Contact
  emergencyContactName?: string;        // Emergency contact person
  emergencyContactPhone?: string;       // Emergency contact number
  emergencyContactRelationship?: string; // e.g., "Mother", "Spouse"
  
  // Address
  addressLine1?: string;     // Street address
  addressLine2?: string;     // Apartment, suite, etc.
  city?: string;             // City
  province?: string;         // Province/State
  postalCode?: string;       // ZIP/Postal code
  
  // Medical Information
  medicalNotes?: string;          // General medical notes
  allergies?: string[];           // List of allergies
  chronicConditions?: string[];   // List of chronic conditions
  medications?: string[];         // Current medications
  
  // App Settings
  preferredLanguage?: 'id' | 'en';  // Default: 'id'
}
```

### Complete Type Definition

```javascript
interface PatientRegistrationRequest {
  // Required Fields
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  
  // Optional - Personal
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  
  // Optional - Insurance
  insuranceProvider?: string;
  insuranceNumber?: string;
  insuranceMemberId?: string;
  
  // Optional - Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  
  // Optional - Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  
  // Optional - Medical
  medicalNotes?: string;
  allergies?: string[];
  chronicConditions?: string[];
  medications?: string[];
  
  // Optional - Settings
  preferredLanguage?: 'id' | 'en';
}
```

---

## 📤 Request Format

### Example 1: Minimal Registration (Quick Sign Up)

```javascript
// Minimum required fields only
const minimalRequest = {
  name: "Budi Santoso",
  email: "budi.santoso@gmail.com",
  password: "SecurePass123!",
  phoneNumber: "+6281234567890"
};

// Send request
fetch('http://localhost:4000/v1/auth/patient/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(minimalRequest)
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

### Example 2: Complete Registration (With Medical Info)

```javascript
const completeRequest = {
  // Required
  name: "Siti Nurhaliza",
  email: "siti.nurhaliza@yahoo.com",
  password: "MySecurePassword2024!",
  phoneNumber: "+6281298765432",
  
  // Personal
  dateOfBirth: "1990-05-15",
  gender: "female",
  
  // Insurance
  insuranceProvider: "BPJS Kesehatan",
  insuranceNumber: "0001234567890",
  insuranceMemberId: "9876543210",
  
  // Emergency Contact
  emergencyContactName: "Ahmad Nurhaliza",
  emergencyContactPhone: "+6281298765433",
  emergencyContactRelationship: "Spouse",
  
  // Address
  addressLine1: "Jl. Merdeka No. 123",
  addressLine2: "Apt 5B",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postalCode: "10110",
  
  // Medical Information
  medicalNotes: "Patient has history of dental anxiety",
  allergies: ["Penicillin", "Latex"],
  chronicConditions: ["Diabetes Type 2", "Hypertension"],
  medications: ["Metformin 500mg", "Amlodipine 5mg"],
  
  // Settings
  preferredLanguage: "id"
};

// Send with async/await
const registerPatient = async (data) => {
  try {
    const response = await fetch('http://localhost:4000/v1/auth/patient/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// Use it
registerPatient(completeRequest)
  .then(result => {
    console.log('Registration successful!');
    console.log('Access Token:', result.accessToken);
    console.log('User:', result.user);
  })
  .catch(error => {
    console.error('Failed to register:', error);
  });
```

### React Native Example with Axios

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';

export const registerPatient = async (registrationData) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/patient/register`,
      registrationData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 seconds timeout
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      // Server responded with error
      return {
        success: false,
        error: error.response.data.message || 'Registration failed',
        errors: error.response.data.errors || []
      };
    } else if (error.request) {
      // Request was made but no response
      return {
        success: false,
        error: 'No response from server. Please check your connection.'
      };
    } else {
      // Something else happened
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

---

## 📥 Response Format

### Success Response (201 Created)

```typescript
interface RegistrationSuccessResponse {
  accessToken: string;        // JWT token for API authentication
  refreshToken: string;       // JWT token for refreshing access token
  user: {
    id: number;               // User ID
    email: string;            // User email
    name: string;             // User name
    phoneNumber: string;      // Phone number
    about: string | null;     // User bio/description
    roles: string[];          // Always ["patient"] for this endpoint
    avatar_url: string | null; // Profile picture URL
    lastLoginAt: string | null; // ISO timestamp
  };
  patientProfile: {
    dateOfBirth: string | null;          // YYYY-MM-DD
    gender: string | null;               // "male", "female", "other"
    insuranceProvider: string | null;
    insuranceNumber: string | null;
    insuranceMemberId: string | null;
    emergencyContact: {                  // null if not provided
      name?: string;
      phone?: string;
      relationship?: string;
    } | null;
    address: {                           // null if not provided
      line1?: string;
      line2?: string;
      city?: string;
      province?: string;
      postalCode?: string;
    } | null;
    medicalDetails: {                    // null if not provided
      notes?: string;
      allergies?: string[];
      chronicConditions?: string[];
      medications?: string[];
    } | null;
    preferredLanguage: string;           // "id" or "en"
  };
}
```

### Success Response Example

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "email": "siti.nurhaliza@yahoo.com",
    "name": "Siti Nurhaliza",
    "phoneNumber": "+6281298765432",
    "about": null,
    "roles": ["patient"],
    "avatar_url": null,
    "lastLoginAt": null
  },
  "patientProfile": {
    "dateOfBirth": "1990-05-15",
    "gender": "female",
    "insuranceProvider": "BPJS Kesehatan",
    "insuranceNumber": "0001234567890",
    "insuranceMemberId": "9876543210",
    "emergencyContact": {
      "name": "Ahmad Nurhaliza",
      "phone": "+6281298765433",
      "relationship": "Spouse"
    },
    "address": {
      "line1": "Jl. Merdeka No. 123",
      "line2": "Apt 5B",
      "city": "Jakarta Pusat",
      "province": "DKI Jakarta",
      "postalCode": "10110"
    },
    "medicalDetails": {
      "notes": "Patient has history of dental anxiety",
      "allergies": ["Penicillin", "Latex"],
      "chronicConditions": ["Diabetes Type 2", "Hypertension"],
      "medications": ["Metformin 500mg", "Amlodipine 5mg"]
    },
    "preferredLanguage": "id"
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "message": "Validation error",
  "errors": [
    "Name is required",
    "Email is invalid",
    "Password must be at least 8 characters"
  ]
}
```

### Error Response (409 Conflict)

```json
{
  "message": "Email already registered"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "message": "Server error during patient registration"
}
```

---

## ✅ Validation Rules

### Field-by-Field Validation

| Field | Rules | Error Message |
|-------|-------|---------------|
| `name` | Required, non-empty string | "Name is required" |
| `email` | Required, valid email format | "Email is required" / "Email is invalid" |
| `password` | Required, min 8 characters | "Password must be at least 8 characters" |
| `phoneNumber` | Required, non-empty string | "Phone number is required" |
| `dateOfBirth` | Optional, valid date (YYYY-MM-DD) | "Date of birth must be a valid date (YYYY-MM-DD)" |
| `gender` | Optional, must be lowercase | Auto-normalized to lowercase |
| `allergies` | Optional, array of strings | Auto-normalized, empty strings removed |
| `chronicConditions` | Optional, array of strings | Auto-normalized, empty strings removed |
| `medications` | Optional, array of strings | Auto-normalized, empty strings removed |
| `preferredLanguage` | Optional, max 8 chars | Default: "id", auto-lowercased |

### Email Validation Regex

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valid emails:
// ✅ user@example.com
// ✅ user.name@example.co.id
// ✅ user+tag@example.com

// Invalid emails:
// ❌ user@example
// ❌ @example.com
// ❌ user example@test.com
```

### Password Requirements

```javascript
// Minimum requirements (enforced):
- At least 8 characters long

// Recommended (not enforced by backend):
- Mix of uppercase and lowercase
- At least one number
- At least one special character
```

### Phone Number Format

```javascript
// Backend accepts any non-empty string
// Recommended formats:
// ✅ +6281234567890    (International format)
// ✅ 081234567890      (Local format)
// ✅ +62-812-3456-7890 (With separators)

// Mobile app should:
// 1. Validate format on client side
// 2. Allow country code selection
// 3. Auto-format display
```

### Date of Birth Validation

```javascript
// Format: YYYY-MM-DD
// Examples:
// ✅ 1990-05-15
// ✅ 2000-01-01

// Invalid:
// ❌ 15-05-1990
// ❌ 05/15/1990
// ❌ 15 May 1990

// Client-side validation:
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};
```

---

## ⚠️ Error Handling

### Error Response Structure

```typescript
interface ErrorResponse {
  message: string;        // Main error message
  errors?: string[];      // Array of validation errors (optional)
  code?: string;          // Error code (optional)
}
```

### HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| `201` | ✅ Created | Registration successful, proceed to login |
| `400` | ❌ Bad Request | Validation failed, show errors to user |
| `409` | ❌ Conflict | Email already exists, suggest login |
| `500` | ❌ Server Error | Show generic error, retry later |

### Example Error Handler (React Native)

```javascript
const handleRegistrationError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Validation error
        if (data.errors && Array.isArray(data.errors)) {
          // Show all validation errors
          Alert.alert(
            'Registration Failed',
            data.errors.join('\n'),
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', data.message || 'Invalid input');
        }
        break;
        
      case 409:
        // Email already registered
        Alert.alert(
          'Email Already Registered',
          'This email is already associated with an account. Would you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
        break;
        
      case 500:
        // Server error
        Alert.alert(
          'Server Error',
          'Something went wrong. Please try again later.',
          [{ text: 'OK' }]
        );
        break;
        
      default:
        Alert.alert('Error', 'An unexpected error occurred');
    }
  } else if (error.request) {
    // Network error
    Alert.alert(
      'Network Error',
      'Unable to connect to server. Please check your internet connection.',
      [{ text: 'OK' }]
    );
  } else {
    // Other error
    Alert.alert('Error', error.message || 'Something went wrong');
  }
};
```

### Retry Logic

```javascript
const registerWithRetry = async (data, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await registerPatient(data);
      return response; // Success!
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Retry on server errors (5xx) or network errors
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }
  
  throw lastError; // All retries failed
};
```

---

## 🗄️ Database Schema

### Tables Created

#### 1. `users` Table

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  roles VARCHAR[] DEFAULT ARRAY['patient'],
  phone_number VARCHAR,
  about TEXT,
  avatar_url VARCHAR,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `patient_profiles` Table

```sql
CREATE TABLE patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender VARCHAR,
  insurance_provider VARCHAR,
  insurance_number VARCHAR,
  insurance_member_id VARCHAR,
  emergency_contact JSONB,  -- {name, phone, relationship}
  address JSONB,            -- {line1, line2, city, province, postalCode}
  medical_details JSONB,    -- {notes, allergies[], chronicConditions[], medications[]}
  preferred_language VARCHAR(8) DEFAULT 'id',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_insurance_number ON patient_profiles(insurance_number);
```

#### 3. `refresh_tokens` Table

```sql
CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

### JSONB Field Structures

```typescript
// emergency_contact JSONB structure
{
  "name": "Ahmad Nurhaliza",
  "phone": "+6281298765433",
  "relationship": "Spouse"
}

// address JSONB structure
{
  "line1": "Jl. Merdeka No. 123",
  "line2": "Apt 5B",
  "city": "Jakarta Pusat",
  "province": "DKI Jakarta",
  "postalCode": "10110"
}

// medical_details JSONB structure
{
  "notes": "Patient has history of dental anxiety",
  "allergies": ["Penicillin", "Latex"],
  "chronicConditions": ["Diabetes Type 2", "Hypertension"],
  "medications": ["Metformin 500mg", "Amlodipine 5mg"]
}
```

---

## ⚙️ Backend Configuration

### Environment Variables (.env)

```bash
# Server Configuration
PORT=4000
API_VERSION=v1

# Database
DATABASE_URL=postgres://serene:serene@localhost:5432/serene

# JWT Authentication
JWT_SECRET=replace-with-a-long-random-secret

# CORS (Allow mobile app origins)
CORS_ORIGINS=http://localhost:4028,http://localhost:8081,http://10.0.2.2:8081

# Optional: OTP for verification
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### Start Backend Server

```bash
# Navigate to backend folder
cd backend

# Install dependencies (first time only)
npm install

# Run migrations (first time only)
npm run migrate

# Start server
npm start

# Server will run on: http://localhost:4000
# API endpoint: http://localhost:4000/api/v1/auth/patient/register
```

### Check Backend is Running

```bash
# Test health endpoint
curl http://localhost:4000/health

# Expected response:
# {"ok":true}
```

---

## 🧪 Testing Guide

### 1. Test with cURL

```bash
# Minimal registration
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com",
    "password": "password123",
    "phoneNumber": "+6281234567890"
  }'
```

### 2. Test with Postman

```
Method: POST
URL: http://localhost:4000/v1/auth/patient/register

Headers:
- Content-Type: application/json

Body (raw JSON):
{
  "name": "John Doe",
  "email": "john.doe@gmail.com",
  "password": "SecurePass123",
  "phoneNumber": "+6281234567890",
  "dateOfBirth": "1995-03-20",
  "gender": "male"
}
```

### 3. Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid minimal registration | All required fields | 201 Created + tokens |
| Missing name | No name field | 400 + "Name is required" |
| Invalid email | `test@invalid` | 400 + "Email is invalid" |
| Short password | `pass` (4 chars) | 400 + "Password must be at least 8 characters" |
| Duplicate email | Already registered email | 409 + "Email already registered" |
| Complete registration | All fields provided | 201 Created + full profile |
| Invalid date format | `20/05/1990` | 400 + Invalid date error |
| Array fields | allergies, medications | 201 + arrays stored correctly |

### 4. Validation Testing

```javascript
// Test validation with various inputs
const testCases = [
  {
    name: "Empty name",
    data: { name: "", email: "test@test.com", password: "12345678", phoneNumber: "081234567890" },
    expectedError: "Name is required"
  },
  {
    name: "Invalid email",
    data: { name: "Test", email: "invalidemail", password: "12345678", phoneNumber: "081234567890" },
    expectedError: "Email is invalid"
  },
  {
    name: "Short password",
    data: { name: "Test", email: "test@test.com", password: "123", phoneNumber: "081234567890" },
    expectedError: "Password must be at least 8 characters"
  }
];

testCases.forEach(async (testCase) => {
  try {
    const result = await registerPatient(testCase.data);
    console.log(`❌ ${testCase.name}: Should have failed but succeeded`);
  } catch (error) {
    if (error.message.includes(testCase.expectedError)) {
      console.log(`✅ ${testCase.name}: Correctly validated`);
    } else {
      console.log(`❌ ${testCase.name}: Wrong error - ${error.message}`);
    }
  }
});
```

---

## 💻 Implementation Example

### Complete Registration Screen (React Native)

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { registerPatient } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegistrationScreen({ navigation }) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    insuranceProvider: '',
    insuranceNumber: '',
    preferredLanguage: 'id'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await registerPatient(formData);
      
      if (result.success) {
        // Save tokens to AsyncStorage
        await AsyncStorage.setItem('accessToken', result.data.accessToken);
        await AsyncStorage.setItem('refreshToken', result.data.refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(result.data.user));
        
        // Navigate to home
        Alert.alert(
          'Success',
          'Registration successful! Welcome to SereneAI.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Home')
            }
          ]
        );
      } else {
        // Show error
        Alert.alert('Registration Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Create Account
        </Text>
        
        {/* Name Input */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ marginBottom: 5, fontWeight: '600' }}>Full Name *</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: errors.name ? '#ff0000' : '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16
            }}
            placeholder="Enter your full name"
            value={formData.name}
            onChangeText={(value) => updateField('name', value)}
            editable={!loading}
          />
          {errors.name && (
            <Text style={{ color: '#ff0000', fontSize: 12, marginTop: 4 }}>
              {errors.name}
            </Text>
          )}
        </View>
        
        {/* Email Input */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ marginBottom: 5, fontWeight: '600' }}>Email *</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: errors.email ? '#ff0000' : '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16
            }}
            placeholder="your.email@example.com"
            value={formData.email}
            onChangeText={(value) => updateField('email', value.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          {errors.email && (
            <Text style={{ color: '#ff0000', fontSize: 12, marginTop: 4 }}>
              {errors.email}
            </Text>
          )}
        </View>
        
        {/* Password Input */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ marginBottom: 5, fontWeight: '600' }}>Password *</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: errors.password ? '#ff0000' : '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16
            }}
            placeholder="Min 8 characters"
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            secureTextEntry
            editable={!loading}
          />
          {errors.password && (
            <Text style={{ color: '#ff0000', fontSize: 12, marginTop: 4 }}>
              {errors.password}
            </Text>
          )}
        </View>
        
        {/* Phone Number Input */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ marginBottom: 5, fontWeight: '600' }}>Phone Number *</Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: errors.phoneNumber ? '#ff0000' : '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16
            }}
            placeholder="+62 812 3456 7890"
            value={formData.phoneNumber}
            onChangeText={(value) => updateField('phoneNumber', value)}
            keyboardType="phone-pad"
            editable={!loading}
          />
          {errors.phoneNumber && (
            <Text style={{ color: '#ff0000', fontSize: 12, marginTop: 4 }}>
              {errors.phoneNumber}
            </Text>
          )}
        </View>
        
        {/* Optional: Date of Birth */}
        <View style={{ marginBottom: 15 }}>
          <Text style={{ marginBottom: 5, fontWeight: '600' }}>
            Date of Birth (Optional)
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 16
            }}
            placeholder="YYYY-MM-DD"
            value={formData.dateOfBirth}
            onChangeText={(value) => updateField('dateOfBirth', value)}
            editable={!loading}
          />
        </View>
        
        {/* Register Button */}
        <TouchableOpacity
          style={{
            backgroundColor: loading ? '#ccc' : '#007AFF',
            padding: 16,
            borderRadius: 8,
            marginTop: 20,
            alignItems: 'center'
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Create Account
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Login Link */}
        <TouchableOpacity
          style={{ marginTop: 20, alignItems: 'center' }}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={{ color: '#007AFF' }}>
            Already have an account? Login
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

---

## 🔐 Security Best Practices

### 1. Store Tokens Securely

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
// Or use react-native-keychain for more security

// Save tokens
const saveTokens = async (accessToken, refreshToken) => {
  try {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
};

// Retrieve token
const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};
```

### 2. Password Strength Validation

```javascript
const validatePasswordStrength = (password) => {
  const checks = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const strength = Object.values(checks).filter(Boolean).length;
  
  return {
    isValid: checks.minLength, // Minimum requirement
    strength, // 1-5
    checks
  };
};
```

### 3. Clear Sensitive Data on Logout

```javascript
const logout = async () => {
  try {
    await AsyncStorage.multiRemove([
      'accessToken',
      'refreshToken',
      'user'
    ]);
    navigation.replace('Login');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
```

---

## 📱 Next Steps After Registration

1. **Save tokens** to secure storage
2. **Navigate to home screen** or onboarding
3. **Fetch user profile** with `/api/v1/auth/me`
4. **Enable push notifications** (optional)
5. **Complete profile** if needed
6. **Browse dentists** and **book appointments**!

---

## 🆘 Troubleshooting

### ⚠️ COMMON MISTAKE: Wrong API Path

**Problem:**
```bash
# ❌ WRONG - Will return 404
POST /api/v1/auth/patient/register

# ✅ CORRECT
POST /v1/auth/patient/register
```

**Why?**
Backend uses `API_VERSION=v1` environment variable which creates routes at `/v1/...` NOT `/api/v1/...`

**Solution:**
```javascript
// ❌ WRONG
const url = 'http://localhost:4000/api/v1/auth/patient/register';

// ✅ CORRECT
const url = 'http://localhost:4000/v1/auth/patient/register';
```

### Issue: "Cannot POST /v1/auth/patient/register"

**Possible Causes:**
1. Backend server not running
2. Wrong HTTP method (using GET instead of POST)
3. Missing Content-Type header

**Solution:**
```bash
# 1. Check backend is running
curl http://localhost:4000/health
# Should return: {"ok":true}

# 2. Verify correct method and headers
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"12345678","phoneNumber":"081234567890"}'
```

### Issue: "Network request failed"

**Solution:**
```javascript
// Android Emulator: Use 10.0.2.2 instead of localhost
const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:4000' 
  : 'http://localhost:4000';

// Android Physical Device: Use your computer's local IP
// Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
const API_BASE_URL = 'http://192.168.1.100:4000';
```

### Issue: "Email already registered"

**Solution:**
```javascript
// Check if email exists before registration
if (error.response?.status === 409) {
  Alert.alert(
    'Email Already Exists',
    'This email is already registered. Would you like to login?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Login', onPress: () => navigation.navigate('Login') }
    ]
  );
}
```

### Issue: CORS error

**Solution:**
```bash
# Add your mobile app origin to backend .env
CORS_ORIGINS=http://localhost:4028,http://localhost:8081,http://10.0.2.2:8081
```

---

## � VERIFIED TESTING RESULTS

### ✅ Endpoint Status (Tested November 19, 2025)

| Test | Endpoint | Status | Response Time |
|------|----------|--------|---------------|
| Health Check | `GET /health` | ✅ Working | ~5ms |
| Patient Register | `POST /v1/auth/patient/register` | ✅ Working | ~200ms |

### ✅ Successful Test Command

```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test.patient@example.com",
    "password": "password123",
    "phoneNumber": "+6281234567890"
  }'
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "154",
    "email": "test.patient@example.com",
    "name": "Test Patient",
    "phoneNumber": "+6281234567890",
    "about": null,
    "roles": ["patient"],
    "avatar_url": null,
    "lastLoginAt": null
  },
  "patientProfile": {
    "dateOfBirth": null,
    "gender": null,
    "insuranceProvider": null,
    "insuranceNumber": null,
    "insuranceMemberId": null,
    "emergencyContact": null,
    "address": null,
    "medicalDetails": null,
    "preferredLanguage": "id"
  }
}
```

---

## �📚 Related Documentation

- [APPOINTMENT_FLOW_COMPLETE.md](./APPOINTMENT_FLOW_COMPLETE.md) - Complete appointment booking flow
- [LOGIN Guide](./docs/PHASE_1_AUTHENTICATION_IMPLEMENTATION.md) - Login implementation
- [API Documentation](http://localhost:4000/api-docs) - Full Swagger API docs

---

## ✅ Registration Checklist

- [ ] Backend server is running (`http://localhost:4000`)
- [ ] Database is connected and migrated
- [ ] Network configuration is correct (localhost/10.0.2.2)
- [ ] Registration form validates all required fields
- [ ] Error handling is implemented
- [ ] Success response saves tokens to storage
- [ ] Navigation to home screen works
- [ ] Password is securely handled (never logged)
- [ ] Loading states are shown during API call
- [ ] Email uniqueness error is handled gracefully

---

**🎉 You're all set! Patient registration endpoint is ready to use from mobile app.**

For questions or issues, check the backend logs or contact the backend team.

---

**Last Updated:** November 19, 2025  
**Version:** 1.0.0  
**Backend API Version:** v1
