# ✅ Implementation Summary - Patient Profile & Avatar Endpoints

> **Date:** November 19, 2025  
> **Status:** Backend implementation complete ✅  
> **Action Required:** Mobile team needs to login ulang untuk fresh token

---

## 🎯 What Was Implemented

### New Endpoints Created

1. **PUT /v1/patient/profile** - Update patient profile data
2. **POST /v1/patient/avatar** - Upload patient avatar image  

### Files Created/Modified

```
backend/src/
├── routes/patient.js                    ✅ NEW
├── controllers/patientController.js     ✅ NEW  
├── server.js                           ✅ MODIFIED (mounted routes)
└── uploads/avatars/                    ✅ AUTO-CREATED
```

---

## 🐛 Current Issue & Solution

### Issue
User mengalami error:
```
❌ Avatar upload failed: {"error": "Invalid or expired token"}
Token verification failed: TokenExpiredError: jwt expired
  expiredAt: 2025-11-19T07:32:21.000Z
```

### Root Cause
Token JWT sudah kadaluarsa (expired 15 minutes after login)

### ✅ Solution
**User HARUS logout dan login kembali untuk mendapatkan fresh token!**

Token expiration: 15 minutes (configured in `ACCESS_TTL`)

---

## 🔧 Bugs Fixed

### 1. Database Column Error
```diff
- 'SELECT role FROM users WHERE id = $1'
+ 'SELECT roles FROM users WHERE id = $1'
```

### 2. Avatar Storage Location
```diff
- UPDATE patient_profiles SET avatar_url = ...
+ UPDATE users SET avatar_url = ...  ✅ Correct table
```

### 3. User ID Access
```diff
- const userId = req.user.userId;
+ const userId = req.user.id;  ✅ Matches auth middleware
```

### 4. Multer Configuration
```diff
- filename: `patient-${req.user.id}-${timestamp}.jpg`  ❌ req.user undefined
+ filename: `patient-${timestamp}.jpg`  ✅ Works
```

---

## 📡 Quick Test Guide

### Step 1: Get Fresh Token
```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123!",
    "phoneNumber": "+6281234567890"
  }'
```

Save the `accessToken` from response.

### Step 2: Test Profile Update
```bash
TOKEN="YOUR_ACCESS_TOKEN_HERE"

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
      "postalCode": "12190"
    }
  }'
```

### Step 3: Test Avatar Upload  
```bash
curl -X POST http://localhost:4000/v1/patient/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@avatar.jpg"
```

---

## 📱 Mobile Integration - Action Items

### Priority 1: Handle Token Expiration
```javascript
// EditProfileScreen.jsx atau patientService.js

const handleProfileUpdate = async (profileData) => {
  const result = await updatePatientProfile(profileData);
  
  if (!result.success) {
    // Check if token expired
    if (result.error === 'Unauthorized' || 
        result.message?.includes('expired') ||
        result.message?.includes('invalid token')) {
      
      // Clear tokens
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      
      // Show alert
      Alert.alert(
        'Sesi Berakhir',
        'Token Anda sudah kadaluarsa. Silakan login kembali.',
        [{ 
          text: 'Login', 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }]
          })
        }]
      );
      
      return;
    }
    
    // Other errors
    Alert.alert('Error', result.message);
    return;
  }
  
  // Success
  dispatch(updateProfile(result.data));
  Alert.alert('Berhasil', 'Profil berhasil diperbarui!');
};
```

### Priority 2: Test Flow

1. **Logout current user:**
   ```javascript
   await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
   navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
   ```

2. **Login kembali** (fresh token will be generated)

3. **Test profile update** dari EditProfileScreen

4. **Test avatar upload**

---

## 🎓 Technical Details

### Auth Middleware Flow
```javascript
// backend/src/utils/tokens.js

export function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { 
      id: decoded.sub,          // ✅ THIS is what controller uses
      roles: decoded.roles 
    };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
```

### Database Schema
```sql
-- Avatar is stored in users table, NOT patient_profiles
users:
  - avatar_url: TEXT  ✅ Updated by POST /v1/patient/avatar

patient_profiles:
  - date_of_birth: DATE
  - gender: TEXT  
  - insurance_provider: TEXT
  - insurance_number: TEXT
  - insurance_member_id: TEXT
  - address: JSONB
  - emergency_contact: JSONB
  - medical_details: JSONB
  ✅ Updated by PUT /v1/patient/profile
```

---

## 🧪 Test Scripts Available

```bash
# Profile update test
./test-profile-endpoints.sh

# Avatar upload test  
./test-avatar-upload.sh
```

---

## 📚 Related Documentation

- [PATIENT_API.md](./PATIENT_API.md) - Complete API specification
- [PATIENT_REGISTRATION_GUIDE.md](./PATIENT_REGISTRATION_GUIDE.md) - Registration endpoint

---

## ✅ Checklist for Mobile Team

- [ ] Logout dari mobile app
- [ ] Login kembali (mendapat fresh token)
- [ ] Test update profile dari EditProfileScreen
- [ ] Verify data tersimpan di database
- [ ] Test upload avatar
- [ ] Verify avatar muncul di UI
- [ ] Implement token expiration handling
- [ ] Test edge case: token expired saat save

---

**Backend Status:** ✅ Ready and waiting for mobile testing with fresh token!
