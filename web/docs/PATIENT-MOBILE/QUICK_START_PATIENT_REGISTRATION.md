# 🚀 Quick Start Guide - Patient Registration API

> **For Mobile Developers**: Everything you need to integrate patient registration in 5 minutes!

---

## ⚡ TL;DR - Just Want to Start?

```javascript
// 1. Set your API base URL
const API_BASE_URL = 'http://localhost:4000';  // or http://10.0.2.2:4000 for Android emulator

// 2. Make the request
const response = await fetch(`${API_BASE_URL}/v1/auth/patient/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    password: "password123",  // min 8 chars
    phoneNumber: "+6281234567890"
  })
});

// 3. Get tokens
const { accessToken, refreshToken, user } = await response.json();

// 4. Save tokens and navigate
await AsyncStorage.setItem('accessToken', accessToken);
await AsyncStorage.setItem('refreshToken', refreshToken);
navigation.navigate('Home');
```

---

## 🎯 The CORRECT Endpoint

### ✅ DO THIS:
```
POST http://localhost:4000/v1/auth/patient/register
```

### ❌ NOT THIS:
```
POST http://localhost:4000/api/v1/auth/patient/register  ❌ Wrong!
```

**Why?** Backend uses `/v1/auth/...` **NOT** `/api/v1/auth/...`

---

## 📋 Required Fields (Only 4!)

```typescript
{
  name: string;        // Patient full name
  email: string;       // Valid email
  password: string;    // Min 8 characters
  phoneNumber: string; // Phone number
}
```

---

## 📱 Network Configuration

### iOS Simulator
```javascript
const API_BASE_URL = 'http://localhost:4000';
```

### Android Emulator
```javascript
const API_BASE_URL = 'http://10.0.2.2:4000';
```

### Physical Device
```javascript
// Use your computer's local IP
const API_BASE_URL = 'http://192.168.1.100:4000';
// Find IP: ipconfig (Windows) or ifconfig (Mac/Linux)
```

---

## ✅ Success Response (201)

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "154",
    "email": "john@example.com",
    "name": "John Doe",
    "phoneNumber": "+6281234567890",
    "roles": ["patient"]
  },
  "patientProfile": {
    "preferredLanguage": "id",
    ...
  }
}
```

---

## ❌ Common Errors

### 400 - Validation Error
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

**Fix:** Check all required fields are filled correctly.

---

### 409 - Email Already Registered
```json
{
  "message": "Email already registered"
}
```

**Fix:** Email already exists. Suggest user to login instead.

---

### 500 - Server Error
```json
{
  "message": "Server error during patient registration"
}
```

**Fix:** Backend issue. Retry or contact support.

---

## 🧪 Test It Now!

### Option 1: cURL (Terminal)

```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test123@example.com",
    "password": "password123",
    "phoneNumber": "+6281234567890"
  }'
```

### Option 2: Postman

1. Create new POST request
2. URL: `http://localhost:4000/v1/auth/patient/register`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "name": "Test Patient",
  "email": "test123@example.com",
  "password": "password123",
  "phoneNumber": "+6281234567890"
}
```
5. Click Send

---

## 🔐 What to Do with Tokens?

### 1. Save Tokens Securely
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('accessToken', accessToken);
await AsyncStorage.setItem('refreshToken', refreshToken);
await AsyncStorage.setItem('user', JSON.stringify(user));
```

### 2. Use Access Token for API Calls
```javascript
const response = await fetch(`${API_BASE_URL}/v1/appointments`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Refresh When Expired
```javascript
const refreshResponse = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken: newAccessToken } = await refreshResponse.json();
```

---

## 📚 Full Documentation

For complete details, validation rules, and advanced features:
- [PATIENT_REGISTRATION_GUIDE.md](./PATIENT_REGISTRATION_GUIDE.md) - Complete guide
- [BACKEND_TESTING_REPORT.md](./BACKEND_TESTING_REPORT.md) - Testing results

---

## ✅ Checklist

Before you start coding:

- [ ] Backend is running at `http://localhost:4000`
- [ ] Test health check: `curl http://localhost:4000/health` returns `{"ok":true}`
- [ ] Test registration with cURL (see above)
- [ ] Understand correct endpoint: `/v1/auth/...` NOT `/api/v1/auth/...`
- [ ] Know your network config (localhost vs 10.0.2.2 vs local IP)

---

## 🆘 Need Help?

### Backend Not Running?
```bash
cd backend
npm install
npm start
# Server should start at http://localhost:4000
```

### Still Getting 404?
Double-check you're using `/v1/auth/patient/register` NOT `/api/v1/auth/patient/register`

### Network Error on Android?
Use `http://10.0.2.2:4000` instead of `http://localhost:4000`

---

**Last Updated:** November 19, 2025  
**Status:** ✅ Tested & Working  
**Ready for Integration:** YES

Happy Coding! 🚀
