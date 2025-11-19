# 🧪 Testing Patient Registration & Login

Complete guide untuk testing patient registration dan login dengan backend real.

## 📋 Prerequisites

### 1. Backend Server Must Be Running

```bash
# Di terminal/window backend
cd backend
npm start

# Server harus running di: http://localhost:4000
# Check dengan: curl http://localhost:4000/health
# Response: {"ok":true}
```

### 2. Database Must Be Ready

```bash
# Check database connection
psql -U serene -d serene -c "SELECT COUNT(*) FROM users;"

# Jika error, pastikan PostgreSQL running dan database exists
```

### 3. Mobile App Setup

```bash
# Di terminal mobile app
cd mobile
npm install

# Start Metro bundler
npm start

# Di terminal lain, jalankan app
# iOS:
npm run ios

# Android:
npm run android
```

---

## 🔍 Step 1: Test Backend Connection

### Option A: Using Test Utility (Recommended)

```javascript
// Di file manapun (misalnya App.js atau DashboardScreen.jsx)
import { testBackendConnection } from './src/utils/testBackendConnection';

// Panggil saat component mount
useEffect(() => {
  testBackendConnection();
}, []);
```

### Option B: Manual cURL Test

```bash
# Test 1: Health Check
curl http://localhost:4000/health

# Expected: {"ok":true}

# Test 2: API Version
curl http://localhost:4000/v1

# Expected: API version info or 404 (depends on backend implementation)

# Test 3: Registration Endpoint (should fail with validation error)
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 error with validation messages
```

---

## 📝 Step 2: Test Patient Registration

### Test Case 1: Valid Registration

1. **Open Mobile App** → Navigate to Settings → Click "Buat akun baru"

2. **Fill Registration Form:**
   ```
   Name: Adrian Halim
   Email: adrian.test@gmail.com
   Phone: +6281234567890
   Date of Birth: 1995-08-15 (optional)
   City: Jakarta (optional)
   Gender: Male (Laki-laki)
   Interests: Kontrol rutin, Perawatan estetik (optional, tidak dikirim ke backend)
   Password: SecurePass123!
   Confirm Password: SecurePass123!
   ```

3. **Click "Daftar Sekarang"** (OTP di-skip)

4. **Expected Result:**
   - ✅ Loading indicator appears
   - ✅ Console shows: `📤 Sending registration data`
   - ✅ Console shows: `✅ Registration successful!`
   - ✅ Success message: "Selamat datang, Adrian Halim! Akun berhasil dibuat."
   - ✅ Auto navigate to Dashboard
   - ✅ User is logged in
   - ✅ No autofill yellow overlay on password fields

5. **Verify in Database:**
   ```sql
   -- Check user created
   SELECT * FROM users WHERE email = 'adrian.test@gmail.com';
   
   -- Check patient profile created with gender, dateOfBirth, and city
   SELECT pp.* FROM patient_profiles pp
   JOIN users u ON u.id = pp.user_id
   WHERE u.email = 'adrian.test@gmail.com';
   -- Should see:
   -- gender = 'male'
   -- date_of_birth = '1995-08-15'
   -- city = 'Jakarta'
   ```

### Test Case 2: Duplicate Email

1. **Try to register with same email again**
2. **Expected Result:**
   - ❌ Error message: "Email sudah terdaftar. Silakan login."
   - ❌ Registration fails
   - ❌ No new user created in database

### Test Case 3: Invalid Email Format

1. **Fill form with invalid email:** `test@invalid`
2. **Click "Kirim kode OTP"**
3. **Expected Result:**
   - ❌ Client-side validation error appears
   - ❌ "Email tidak valid"
   - ❌ No API call made

### Test Case 4: Password Too Short

1. **Fill form with short password:** `pass`
2. **Expected Result:**
   - ❌ Validation error: "Password minimal 8 karakter"

### Test Case 5: Password Mismatch

1. **Password:** `SecurePass123!`
2. **Confirm Password:** `DifferentPass123!`
3. **Expected Result:**
   - ❌ Validation error: "Konfirmasi password tidak sama"

---

## 🔐 Step 3: Test Patient Login

### Test Case 1: Valid Login

1. **Navigate to Settings → Click "Masuk"**

2. **Fill Login Form:**
   ```
   Email: adrian.test@gmail.com
   Password: SecurePass123!
   ```

3. **Click "Masuk Sekarang"**

4. **Expected Result:**
   - ✅ Loading indicator appears
   - ✅ Console shows: `📤 Attempting login for: adrian.test@gmail.com`
   - ✅ Console shows: `✅ Login successful!`
   - ✅ Success message: "Selamat datang kembali, Adrian Halim!"
   - ✅ Auto navigate to Dashboard
   - ✅ User data loaded in Redux store

### Test Case 2: Wrong Password

1. **Email:** `adrian.test@gmail.com`
2. **Password:** `WrongPassword123!`
3. **Expected Result:**
   - ❌ Error message: "Email atau password salah"
   - ❌ Login fails
   - ❌ User stays on login screen

### Test Case 3: Non-existent Email

1. **Email:** `nonexistent@gmail.com`
2. **Password:** `AnyPassword123!`
3. **Expected Result:**
   - ❌ Error message: "Akun tidak ditemukan. Silakan daftar terlebih dahulu."

---

## 🔬 Step 4: Verify Data in Database

### Check User Record

```sql
-- Get user details
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone_number,
  u.email_verified,
  u.created_at
FROM users u
WHERE u.email = 'adrian.test@gmail.com';
```

### Check Patient Profile

```sql
-- Get patient profile
SELECT 
  pp.id,
  pp.user_id,
  pp.date_of_birth,
  pp.gender,
  pp.medical_details,
  pp.emergency_contact,
  pp.address,
  pp.insurance_provider,
  pp.insurance_number
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE u.email = 'adrian.test@gmail.com';
```

### Check Password Hash

```sql
-- Verify password is hashed (should NOT see plain text)
SELECT 
  email,
  LEFT(password_hash, 10) as password_preview
FROM users
WHERE email = 'adrian.test@gmail.com';

-- Should see something like: "$2b$10$abc..."
```

---

## 📊 Step 5: Monitor Console Logs

### Registration Success Logs

```
📝 Registering patient... { email: 'adrian.test@gmail.com' }
✅ Registration successful! { userId: 1 }
💾 Tokens saved to storage
```

### Login Success Logs

```
🔐 Logging in patient... { email: 'adrian.test@gmail.com' }
✅ Login successful! { userId: 1 }
💾 Tokens saved to storage
```

### Error Logs (Duplicate Email)

```
❌ Registration failed: { message: 'Email already registered' }
```

---

## 🐛 Troubleshooting

### Issue 1: "Network request failed"

**Symptom:** Cannot connect to backend

**Solutions:**

```javascript
// Android Emulator - Update authService.js
if (Platform.OS === 'android') {
  return 'http://10.0.2.2:4000'; // ✅ Correct
  // NOT: 'http://localhost:4000' ❌
}

// Android Physical Device
// Find your computer's local IP
// Windows: ipconfig
// Mac: ifconfig | grep "inet "
return 'http://192.168.1.100:4000'; // Use your actual IP
```

### Issue 2: "CORS error"

**Solution:** Check backend `.env`

```bash
# backend/.env
CORS_ORIGINS=http://localhost:4028,http://localhost:8081,http://10.0.2.2:8081
```

### Issue 3: "Database connection error"

**Solution:**

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -U serene -l | grep serene

# Run migrations if needed
cd backend
npm run migrate
```

### Issue 4: "Token not saved"

**Check AsyncStorage:**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Debug storage
AsyncStorage.getAllKeys()
  .then(keys => console.log('Storage keys:', keys))
  .then(() => AsyncStorage.getItem('accessToken'))
  .then(token => console.log('Access Token:', token));
```

---

## ✅ Success Checklist

- [ ] Backend server running on `http://localhost:4000`
- [ ] Database connected and migrated
- [ ] Health endpoint returns `{"ok":true}`
- [ ] Mobile app can ping backend
- [ ] Registration creates user in database
- [ ] Password is hashed in database
- [ ] Patient profile is created
- [ ] Tokens are saved to AsyncStorage
- [ ] Login works with registered credentials
- [ ] User data loads in Redux store
- [ ] Dashboard shows logged-in user data
- [ ] Duplicate email registration fails gracefully
- [ ] Invalid credentials login fails gracefully

---

## 🎯 Next Steps

After registration and login work:

1. ✅ Test logout functionality
2. ✅ Test token refresh
3. ✅ Test "Remember Me" functionality
4. ✅ Test booking appointment as logged-in patient
5. ✅ Test viewing patient profile
6. ✅ Test updating patient profile

---

## 📞 Need Help?

**Backend Issues:**
- Check `backend/logs/` folder
- Check database logs
- Run `npm run dev` for verbose logging

**Mobile Issues:**
- Check React Native debugger
- Check Metro bundler logs
- Clear cache: `npm start -- --reset-cache`

---

**Last Updated:** November 19, 2025
