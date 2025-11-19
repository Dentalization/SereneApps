# 🔧 Backend: Auto-Create Patient Profile

> **Priority:** HIGH  
> **Issue:** GET /v1/patient/profile returns 404 for new users  
> **Solution:** Auto-create empty profile on first GET request

---

## 🚨 Current Problem

When a new user registers and logs in:

1. ✅ User created in `users` table
2. ❌ No record created in `patient_profiles` table
3. ❌ GET /v1/patient/profile returns 404
4. ❌ Mobile app shows "Profil pasien belum dibuat"

**Example:**
```
User ID: 158
Email: adrianhalim05@gmail.com
Login: ✅ Success
Get Profile: ❌ 404 Not Found
```

---

## ✅ Required Solution

### Option 1: Auto-Create on Registration (Recommended)

When user registers, automatically create empty `patient_profiles` record:

**File: `backend/src/controllers/authController.js`**

```javascript
exports.registerPatient = async (req, res) => {
  const { email, password, name, phone } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, phone_number, password_hash, roles)
       VALUES ($1, $2, $3, $4, ARRAY['patient'])
       RETURNING *`,
      [name, email, phone, hashedPassword]
    );
    
    const userId = userResult.rows[0].id;
    
    // 2. Auto-create empty patient profile
    await client.query(
      `INSERT INTO patient_profiles (user_id, preferred_language)
       VALUES ($1, 'id')`,
      [userId]
    );
    
    await client.query('COMMIT');
    
    // Generate tokens...
    res.status(201).json({
      accessToken,
      refreshToken,
      user: userResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

---

### Option 2: Auto-Create on First GET (Alternative)

Modify GET endpoint to create profile if it doesn't exist:

**File: `backend/src/controllers/patientController.js`**

```javascript
exports.getPatientProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    let result = await pool.query(
      'SELECT * FROM patient_profiles WHERE user_id = $1',
      [userId]
    );

    // If profile doesn't exist, create it
    if (result.rows.length === 0) {
      console.log(`Creating new patient profile for user ${userId}`);
      
      result = await pool.query(
        `INSERT INTO patient_profiles (user_id, preferred_language)
         VALUES ($1, 'id')
         RETURNING *`,
        [userId]
      );
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching/creating patient profile:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
};
```

---

## 📊 Database State

### Current (Wrong)
```
users table:
┌─────┬────────────────────────────┬──────────────────┐
│ id  │ email                      │ avatar_url       │
├─────┼────────────────────────────┼──────────────────┤
│ 158 │ adrianhalim05@gmail.com    │ null             │
└─────┴────────────────────────────┴──────────────────┘

patient_profiles table:
┌─────────┬───────────────┬──────────────┐
│ user_id │ date_of_birth │ gender       │
├─────────┼───────────────┼──────────────┤
│ (empty) │               │              │  ❌ No record!
└─────────┴───────────────┴──────────────┘
```

### Expected (Correct)
```
users table:
┌─────┬────────────────────────────┬──────────────────┐
│ id  │ email                      │ avatar_url       │
├─────┼────────────────────────────┼──────────────────┤
│ 158 │ adrianhalim05@gmail.com    │ null             │
└─────┴────────────────────────────┴──────────────────┘

patient_profiles table:
┌─────────┬───────────────┬────────┬───────────────────┐
│ user_id │ date_of_birth │ gender │ preferred_language│
├─────────┼───────────────┼────────┼───────────────────┤
│ 158     │ null          │ null   │ 'id'              │  ✅
└─────────┴───────────────┴────────┴───────────────────┘
```

---

## 🧪 Testing

### Before Fix
```bash
# Login
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adrianhalim05@gmail.com","password":"password123"}'

# Get profile (returns 404)
TOKEN="..."
curl -X GET http://localhost:4000/v1/patient/profile \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "statusCode": 404,
  "message": "Patient profile not found"
}
```

### After Fix
```bash
# Login
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"adrianhalim05@gmail.com","password":"password123"}'

# Get profile (returns 200 with empty profile)
TOKEN="..."
curl -X GET http://localhost:4000/v1/patient/profile \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "status": "success",
  "data": {
    "user_id": 158,
    "date_of_birth": null,
    "gender": null,
    "insurance_provider": null,
    "insurance_number": null,
    "insurance_member_id": null,
    "preferred_language": "id",
    "address": null,
    "emergency_contact": null,
    "medical_details": null,
    "created_at": "2025-11-19T12:10:00.000Z",
    "updated_at": "2025-11-19T12:10:00.000Z"
  }
}
```

---

## 🎯 Acceptance Criteria

- [ ] New user registers → `patient_profiles` record auto-created
- [ ] GET /v1/patient/profile returns 200 for new users
- [ ] Mobile app loads profile data (even if all fields are null)
- [ ] ProfileScreen shows "Belum diisi" instead of error
- [ ] Edit profile flow works (converts null → actual data)

---

## 📱 Mobile Impact

### Current Behavior (404)
```
LOG  📥 Fetching patient profile after login...
LOG  ⚠️ Get patient profile error: {"status": 404}
LOG  ⚠️ Patient profile not loaded: Profil pasien belum dibuat.

// Redux state:
{
  user: { id: 158, email: "...", ... },
  patientProfile: null  ❌
}

// ProfileScreen shows:
- Tanggal lahir: - (empty dash)
- Jenis kelamin: Belum diisi
- Alergi: Belum ada data
```

### Expected Behavior (200 with empty profile)
```
LOG  📥 Fetching patient profile after login...
LOG  ✅ Patient profile fetched successfully!

// Redux state:
{
  user: { id: 158, email: "...", ... },
  patientProfile: {
    userId: 158,
    dateOfBirth: null,
    gender: null,
    insurance_provider: null,
    ...
  } ✅
}

// ProfileScreen shows:
- Tanggal lahir: - (empty dash)
- Jenis kelamin: Belum diisi
- Alergi: Belum ada data
// Same UI, but patientProfile exists in Redux
```

---

## 🚀 Implementation Steps

1. **Choose Option 1 or Option 2** (Option 1 recommended)
2. **Update backend code** with provided implementation
3. **Test with existing users:**
   ```sql
   -- For existing users without profiles, create them:
   INSERT INTO patient_profiles (user_id, preferred_language)
   SELECT id, 'id' FROM users
   WHERE id NOT IN (SELECT user_id FROM patient_profiles)
   AND 'patient' = ANY(roles);
   ```
4. **Test registration flow:**
   - Register new user
   - Login
   - Check database: `SELECT * FROM patient_profiles WHERE user_id = <new_user_id>`
   - Verify record exists
5. **Test mobile app:**
   - Logout
   - Login
   - Verify profile loads (no 404)
   - Check ProfileScreen displays correctly

---

## 📞 Support

If you have questions:
- See full API docs: `docs/Register&Login/PATIENT_API.md`
- Database schema: `docs/DATABASE_PATIENT_PROFILE.md`
- Mobile implementation: `mobile/src/services/patientService.js`

