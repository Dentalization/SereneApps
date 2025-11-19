# 🔧 Login & Profile Loading Fix

> **Date:** January 19, 2025  
> **Issue:** After logout and login, ProfileScreen does not show patient profile data  
> **Status:** ✅ Fixed (Mobile ready, Backend needs implementation)

---

## 🎯 Problem Summary

### Issue Description
After a user logs out and logs back in, the `ProfileScreen` was not displaying the patient's profile data (date of birth, allergies, chronic conditions, medications, etc.).

### Root Cause
The login flow was **not fetching the patient profile** after authentication:

```javascript
// ❌ OLD CODE (LoginScreen.jsx)
dispatch(
  loginSuccess({
    user: result.data.user,
    patientProfile: result.data.user.patientProfile,  // ❌ undefined!
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
  })
);
```

The backend login endpoint (`POST /v1/auth/login`) returns:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "avatar_url": "/uploads/avatars/..."
    // ❌ No patientProfile field!
  }
}
```

Patient profile data lives in a **separate table** (`patient_profiles`) and must be fetched via a separate endpoint: `GET /v1/patient/profile`.

---

## ✅ Solution Implemented

### 1. Added GET Profile Endpoint to Backend Docs

**File:** `docs/Register&Login/PATIENT_API.md`

Added complete implementation guide for:
```
GET /v1/patient/profile
```

This endpoint:
- Returns patient profile data from `patient_profiles` table
- Returns 404 if profile doesn't exist yet (user hasn't edited profile)
- Uses JWT authentication (Bearer token)
- Called automatically after login

**Backend Implementation (for backend team):**

```javascript
exports.getPatientProfile = async (req, res) => {
  const userId = req.user.id; // From JWT middleware

  try {
    const result = await pool.query(
      'SELECT * FROM patient_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Patient profile not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};
```

**Route (backend):**
```javascript
// GET /v1/patient/profile
router.get(
  '/profile',
  authenticateJWT,
  requirePatientRole,
  patientController.getPatientProfile
);
```

---

### 2. Added getPatientProfile Service (Mobile)

**File:** `mobile/src/services/patientService.js`

```javascript
/**
 * Get patient profile
 * @returns {Promise<Object>} - Returns patient profile data
 */
export const getPatientProfile = async () => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found');
    }

    if (__DEV__) {
      console.log('🔍 Fetching patient profile...');
    }

    const response = await axios.get(
      `${API_BASE_URL}/v1/patient/profile`,
      {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (__DEV__) {
      console.log('✅ Patient profile fetched successfully!');
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('⚠️ Get patient profile error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401 || status === 403) {
        return {
          success: false,
          error: 'Unauthorized',
          message: 'Token invalid atau kadaluarsa. Silakan login ulang.',
          needsReauth: true,
        };
      } else if (status === 404) {
        return {
          success: false,
          error: 'Profile not found',
          message: 'Profil pasien belum dibuat.',
          profileNotFound: true,
        };
      } else if (status >= 500) {
        return {
          success: false,
          error: 'Server error',
          message: 'Server is having issues. Please try again later.',
        };
      }
    } else if (error.request) {
      return {
        success: false,
        error: 'Network error',
        message: 'Cannot connect to server. Please check your internet connection.',
      };
    }
    
    return {
      success: false,
      error: 'Unknown error',
      message: error.message || 'Something went wrong. Please try again.',
    };
  }
};
```

**Features:**
- ✅ Fetches patient profile from backend
- ✅ Handles 404 gracefully (profile not created yet)
- ✅ Structured error handling (401/403/404/500/network)
- ✅ Dev-only logging
- ✅ Returns `needsReauth` flag for auth errors
- ✅ Returns `profileNotFound` flag for 404

---

### 3. Updated Login Flow to Fetch Profile

**File:** `mobile/src/features/settings/screens/LoginScreen.jsx`

```javascript
if (result.success) {
  // Login successful!
  console.log('✅ Login successful!', result.data.user);

  // ✅ Fetch patient profile after login
  let patientProfile = null;
  
  if (__DEV__) {
    console.log('📥 Fetching patient profile after login...');
  }

  const profileResult = await getPatientProfile();
  
  if (profileResult.success) {
    patientProfile = profileResult.data;
    if (__DEV__) {
      console.log('✅ Patient profile loaded:', patientProfile);
    }
  } else {
    if (__DEV__) {
      console.log('⚠️ Patient profile not loaded:', profileResult.message);
    }
    // Don't block login if profile fetch fails - profile might not exist yet
  }

  // Update Redux store with user data and patient profile
  dispatch(
    loginSuccess({
      user: result.data.user,
      patientProfile: patientProfile,  // ✅ Now correctly populated!
      accessToken: result.data.accessToken,
      refreshToken: result.data.refreshToken,
    })
  );

  // ... navigate to dashboard
}
```

**Flow:**
1. User enters email/password → calls `loginPatient()`
2. Backend returns `{ user, accessToken, refreshToken }`
3. Mobile immediately calls `getPatientProfile()`
4. Backend returns patient profile data (or 404)
5. Mobile dispatches `loginSuccess` with both `user` and `patientProfile`
6. Redux state is populated correctly
7. `ProfileScreen` displays data from `state.auth.patientProfile`

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  LoginScreen    │
│  (user enters   │
│  credentials)   │
└────────┬────────┘
         │
         ▼
   POST /v1/auth/login
         │
         ▼
┌────────────────────────────┐
│ Backend Auth Service       │
│ Returns:                   │
│ - user (id, name, email)   │
│ - accessToken              │
│ - refreshToken             │
└────────┬───────────────────┘
         │
         ▼
   ✅ Login Success
   Save tokens to AsyncStorage
         │
         ▼
   GET /v1/patient/profile
   (using accessToken)
         │
         ▼
┌────────────────────────────┐
│ Backend Patient Service    │
│ Returns:                   │
│ - patientProfile data      │
│   OR 404 if not created    │
└────────┬───────────────────┘
         │
         ▼
   Dispatch loginSuccess({
     user,
     patientProfile,  ✅
     accessToken,
     refreshToken
   })
         │
         ▼
┌────────────────────────────┐
│ Redux Store Updated        │
│ state.auth.user            │
│ state.auth.patientProfile  │
│ state.auth.accessToken     │
└────────┬───────────────────┘
         │
         ▼
   Navigate to Dashboard
         │
         ▼
┌────────────────────────────┐
│ ProfileScreen              │
│ Reads from Redux:          │
│ - user.avatar_url          │
│ - patientProfile.*         │
└────────────────────────────┘
```

---

## 🔐 Authentication & Token Flow

### Token Storage (AsyncStorage)
```javascript
await AsyncStorage.multiSet([
  ['accessToken', result.data.accessToken],
  ['refreshToken', result.data.refreshToken],
  ['user', JSON.stringify(result.data.user)],
]);
```

### Token Retrieval (patientService)
```javascript
const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem('accessToken');
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};
```

### Token Usage
All patient endpoints use Bearer token authentication:
```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
}
```

---

## 📝 Backend Checklist

### Required Endpoints

- [✅] **POST /v1/auth/login** (already implemented)
  - Returns: `{ user, accessToken, refreshToken }`
  
- [ ] **GET /v1/patient/profile** ⚠️ **NEEDS IMPLEMENTATION**
  - Returns patient profile from `patient_profiles` table
  - Returns 404 if profile not created yet
  - See implementation in `docs/Register&Login/PATIENT_API.md`
  
- [ ] **PUT /v1/patient/profile** ⚠️ **NEEDS IMPLEMENTATION**
  - Updates/creates patient profile
  - See implementation in `docs/Register&Login/PATIENT_API.md`
  
- [ ] **POST /v1/patient/avatar** ⚠️ **NEEDS IMPLEMENTATION**
  - Uploads avatar to `users.avatar_url`
  - Requires multer middleware
  - See implementation in `docs/Register&Login/PATIENT_API.md`

### Database Schema

**Table: `users`**
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  password_hash TEXT NOT NULL,
  roles TEXT[] DEFAULT ARRAY['patient'],
  avatar_url TEXT,  -- ✅ Avatar stored here
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Table: `patient_profiles`**
```sql
CREATE TABLE patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  insurance_provider TEXT,
  insurance_number TEXT,
  insurance_member_id TEXT,
  address JSONB,  -- { line1, line2, city, province, postalCode }
  emergency_contact JSONB,  -- { name, phone, relationship }
  medical_details JSONB,  -- { allergies[], medications[], chronicConditions[], notes }
  preferred_language TEXT DEFAULT 'id',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🧪 Testing Instructions

### Mobile Testing (after backend implements GET endpoint)

1. **Logout current user:**
   ```
   Settings → Logout
   ```

2. **Login again:**
   ```
   Enter email/password → Tap "Masuk Sekarang"
   ```

3. **Check console logs:**
   ```
   ✅ Login successful!
   📥 Fetching patient profile after login...
   ✅ Patient profile loaded: { dateOfBirth, gender, ... }
   ```

4. **Navigate to Profile:**
   ```
   Settings → Profile
   ```

5. **Verify data is displayed:**
   - ✅ Avatar image (if uploaded)
   - ✅ Date of birth
   - ✅ Gender
   - ✅ Insurance info
   - ✅ Address
   - ✅ Emergency contact
   - ✅ Allergies, medications, chronic conditions

### Backend Testing (cURL)

#### 1. Login to get token
```bash
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `accessToken` from response.

#### 2. Get patient profile
```bash
TOKEN="your_access_token_here"

curl -X GET http://localhost:4000/v1/patient/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected response (if profile exists):**
```json
{
  "status": "success",
  "data": {
    "user_id": 123,
    "date_of_birth": "1990-05-15",
    "gender": "male",
    "insurance_provider": "BPJS Kesehatan",
    "insurance_number": "0001234567890",
    "insurance_member_id": "PLAT-9912",
    "preferred_language": "id",
    "address": { ... },
    "emergency_contact": { ... },
    "medical_details": { ... },
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-19T14:20:00.000Z"
  }
}
```

**Expected response (if profile doesn't exist):**
```json
{
  "statusCode": 404,
  "message": "Patient profile not found"
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: 403 "Invalid or expired token"

**Cause:** Token is expired or invalid

**Solution:**
1. Check if token is being saved correctly in AsyncStorage
2. Verify JWT secret matches between login and profile endpoints
3. Check token expiration time (should be at least 24h)

**Debug:**
```javascript
// In patientService.js
const accessToken = await getAccessToken();
console.log('🔑 Token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NULL');
```

---

### Issue 2: 404 "Patient profile not found"

**Cause:** User hasn't created profile yet (first-time user)

**Solution:**
- This is **normal** for new users
- Profile will be created when user edits profile for the first time
- Mobile app handles this gracefully (shows empty profile)

**User action:** Go to Settings → Edit Profile → Save

---

### Issue 3: Login succeeds but profile is null

**Cause:** Backend hasn't implemented GET /v1/patient/profile yet

**Solution:**
1. Backend team must implement `GET /v1/patient/profile` endpoint
2. See implementation guide in `docs/Register&Login/PATIENT_API.md`
3. Test endpoint with cURL before testing mobile

---

### Issue 4: "Cannot POST /v1/auth/patient/login"

**Cause:** Route mismatch between mobile and backend

**Current mobile code uses:**
- Register: `POST /v1/auth/patient/register`
- Login: `POST /v1/auth/login` ⚠️ (no `/patient` prefix)

**Solution:**
Backend must expose login at **both**:
- `POST /v1/auth/login` (generic)
- `POST /v1/auth/patient/login` (patient-specific)

Or update mobile to use consistent route.

---

## 📚 Related Documentation

- **Backend API Spec:** `docs/Register&Login/PATIENT_API.md`
- **Database Schema:** `docs/DATABASE_PATIENT_PROFILE.md`
- **User Messages Style:** `docs/USER_MESSAGES_STYLE_GUIDE.md`
- **Backend Implementation:** `docs/BACKEND_PATIENT_PROFILE_API.md`

---

## ✅ Success Criteria

### Mobile (Completed)
- [✅] `getPatientProfile()` service function created
- [✅] `LoginScreen.jsx` fetches profile after login
- [✅] Redux state includes `patientProfile`
- [✅] Graceful handling of 404 (profile not found)
- [✅] Error handling for auth errors (401/403)
- [✅] Dev-only structured logging

### Backend (Required)
- [ ] `GET /v1/patient/profile` endpoint implemented
- [ ] Returns profile data from `patient_profiles` table
- [ ] Returns 404 if profile doesn't exist
- [ ] JWT authentication working
- [ ] Token validation correct
- [ ] Routes mounted at `/v1/patient/`

### Integration Testing
- [ ] Login → profile fetched automatically
- [ ] ProfileScreen displays correct data
- [ ] Edit profile → data persists
- [ ] Logout → login → data reloads
- [ ] New user → 404 handled gracefully

---

## 🎉 Summary

**What we fixed:**
1. Added `GET /v1/patient/profile` endpoint to backend docs
2. Created `getPatientProfile()` service in mobile
3. Updated login flow to fetch profile after authentication
4. Redux now correctly stores `patientProfile`
5. ProfileScreen will display data from Redux state

**What's needed:**
- Backend team must implement the GET endpoint
- Test with cURL before testing mobile app
- Verify token authentication is working

**Expected result:**
After logout and login, user's profile data (date of birth, allergies, medications, etc.) will be correctly loaded and displayed in ProfileScreen.

---

**Next Steps for Backend Team:**
1. Read `docs/Register&Login/PATIENT_API.md` section for GET endpoint
2. Implement `getPatientProfile` controller function
3. Add route: `router.get('/profile', authenticateJWT, requirePatientRole, patientController.getPatientProfile)`
4. Test with cURL
5. Notify mobile team when ready for integration testing

