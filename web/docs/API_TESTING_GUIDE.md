# 🧪 API Testing Guide - SereneAI Backend

> **Complete guide for testing SereneAI API endpoints locally and on staging**

---

## 🎯 **Quick Start**

### **1. Start Backend Server**

```bash
cd backend
npm start
```

Server should start on: **http://localhost:4000**

---

## 📚 **Interactive API Documentation**

### **Swagger UI** (Recommended for testing)

**URL:** http://localhost:4000/api-docs

**Features:**
- ✅ Interactive API testing directly from browser
- ✅ Try endpoints without Postman
- ✅ See all request/response schemas
- ✅ Built-in authorization (JWT token input)
- ✅ Error code examples

**How to use:**
1. Open http://localhost:4000/api-docs
2. Browse available endpoints
3. Click "Try it out" on any endpoint
4. Fill in parameters
5. Click "Execute"
6. See response below

### **OpenAPI JSON Spec**

**URL:** http://localhost:4000/api-docs.json

Use this to:
- Import into Postman
- Generate client SDKs
- Share with mobile team

---

## 🔐 **Authentication Flow**

### **Step 1: Register Patient**

```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123",
    "phoneNumber": "+628123456789",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

**Expected Response:**
```json
{
  "message": "Patient registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "john.doe@example.com",
    "role": "patient",
    "phoneNumber": "+628123456789",
    "isPhoneVerified": false
  }
}
```

**Save the `accessToken` for next steps!**

---

### **Step 2: Send Phone OTP**

```bash
curl -X POST http://localhost:4000/v1/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+628123456789"
  }'
```

**Expected Response (Dev Mode):**
```json
{
  "message": "OTP sent to +628123456789",
  "expiresIn": 300,
  "otp": "123456"  // ⚠️ Only in dev mode!
}
```

**Check backend console for OTP:**
```
🔐 [OTP] Code for +628123456789: 123456 (expires in 5 minutes)
```

---

### **Step 3: Verify OTP**

```bash
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+628123456789",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "message": "Phone number verified successfully",
  "verified": true
}
```

---

### **Step 4: Login**

```bash
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "john.doe@example.com",
    "role": "patient",
    "isPhoneVerified": true
  }
}
```

---

### **Step 5: Use Access Token**

For all protected endpoints, add the token to headers:

```bash
curl -X GET http://localhost:4000/v1/appointments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

## 🧪 **Testing Scenarios**

### **Scenario 1: Invalid Email (Validation Error)**

```bash
curl -X POST http://localhost:4000/v1/auth/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "invalid-email",
    "password": "short",
    "phoneNumber": "123",
    "dateOfBirth": "1990-01-15",
    "gender": "male"
  }'
```

**Expected Response (400):**
```json
{
  "code": 9001,
  "errorCode": "VALIDATION_ERROR",
  "message": "Data tidak valid",
  "solution": "Periksa kembali data yang Anda masukkan",
  "details": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    },
    {
      "field": "password",
      "message": "Password minimal 8 karakter"
    },
    {
      "field": "phoneNumber",
      "message": "Nomor telepon harus diawali +62"
    }
  ]
}
```

---

### **Scenario 2: OTP Expiry**

```bash
# Step 1: Send OTP
curl -X POST http://localhost:4000/v1/auth/send-phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+628123456789"}'

# Step 2: Wait 6 minutes (OTP expires after 5 minutes)
sleep 360

# Step 3: Try to verify (should fail)
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+628123456789",
    "otp": "123456"
  }'
```

**Expected Response (400):**
```json
{
  "code": 1003,
  "errorCode": "AUTH_OTP_EXPIRED",
  "message": "Kode OTP sudah kadaluarsa",
  "solution": "Silakan minta kode OTP baru"
}
```

---

### **Scenario 3: Wrong OTP (3 Attempts)**

```bash
# Attempt 1
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+628123456789", "otp": "111111"}'

# Attempt 2
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+628123456789", "otp": "222222"}'

# Attempt 3
curl -X POST http://localhost:4000/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier": "+628123456789", "otp": "333333"}'
```

**Expected Response after 3rd attempt (400):**
```json
{
  "code": 1009,
  "errorCode": "AUTH_OTP_MAX_ATTEMPTS",
  "message": "Terlalu banyak percobaan OTP yang salah",
  "solution": "Silakan minta kode OTP baru"
}
```

---

### **Scenario 4: Rate Limiting**

```bash
# Send 10 OTP requests rapidly
for i in {1..10}; do
  curl -X POST http://localhost:4000/v1/auth/send-phone-otp \
    -H "Content-Type: application/json" \
    -d '{"phone_number": "+628123456789"}'
  echo "Request $i"
done
```

**Expected Response after 3rd request (429):**
```json
{
  "code": 9004,
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "Terlalu banyak request",
  "solution": "Silakan tunggu beberapa saat"
}
```

---

### **Scenario 5: Expired Token**

```bash
# Use an expired or invalid token
curl -X GET http://localhost:4000/v1/appointments \
  -H "Authorization: Bearer invalid_token_here"
```

**Expected Response (401):**
```json
{
  "code": 1006,
  "errorCode": "AUTH_TOKEN_INVALID",
  "message": "Token tidak valid",
  "solution": "Silakan login kembali"
}
```

---

## 🔍 **Health Checks**

### **Basic Health Check**

```bash
curl http://localhost:4000/health
```

**Expected Response:**
```json
{
  "ok": true
}
```

---

## 📊 **Postman Collection**

### **Import OpenAPI Spec to Postman**

1. Open Postman
2. Click "Import"
3. Enter URL: `http://localhost:4000/api-docs.json`
4. Click "Import"
5. All endpoints will be imported automatically!

### **Or use existing collection:**

File: `/docs/collections/mobile-api.postman_collection.json`

**Import steps:**
1. Open Postman
2. Click "Import"
3. Select file: `mobile-api.postman_collection.json`
4. Collection ready to use!

---

## 🌍 **Language Testing**

Test Indonesian vs English responses:

```bash
# Indonesian (default)
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: id" \
  -d '{"email": "wrong@example.com", "password": "wrong"}'

# Response:
{
  "code": 1001,
  "message": "Email atau password salah",
  "solution": "Periksa kembali email dan password Anda"
}

# English
curl -X POST http://localhost:4000/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{"email": "wrong@example.com", "password": "wrong"}'

# Response:
{
  "code": 1001,
  "message": "Invalid email or password",
  "solution": "Please check your email and password"
}
```

---

## 🎯 **Complete Patient Journey Test**

Run the automated test:

```bash
cd backend
npm run test:journey
```

This tests:
1. ✅ Patient registration
2. ✅ Phone OTP verification
3. ✅ Login
4. ✅ Token refresh
5. ✅ Protected endpoint access

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: Port 4000 already in use**

```bash
# Find and kill process
lsof -ti:4000 | xargs kill -9

# Or use different port
PORT=4001 npm start
```

### **Issue 2: Database connection error**

```bash
# Check PostgreSQL is running
pg_isready

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

### **Issue 3: OTP not received**

**In development mode:**
- Check backend console logs for OTP code
- OTP is logged: `🔐 [OTP] Code for +628123456789: 123456`

**In production:**
- Check Twilio credentials in .env
- Check SendGrid credentials in .env

### **Issue 4: Swagger UI not loading**

```bash
# Verify server is running
curl http://localhost:4000/health

# Check browser console for errors
# Try different browser (Chrome recommended)
```

---

## 📱 **Mobile Team Testing Checklist**

- [ ] Can register new patient
- [ ] Receive OTP in dev mode
- [ ] Can verify OTP
- [ ] Can login with credentials
- [ ] Receive access token
- [ ] Can use token to access protected endpoints
- [ ] Token refresh works
- [ ] Error codes match documentation
- [ ] Indonesian translation works
- [ ] English translation works
- [ ] Rate limiting prevents abuse
- [ ] Validation errors show field details

---

## 🚀 **Next Steps**

1. **Test all authentication flows** using Swagger UI
2. **Share Postman collection** with mobile team
3. **Document any bugs** found during testing
4. **Deploy to staging** for mobile team access
5. **Set up monitoring** (Sentry) for production

---

## 📞 **Support**

**Backend Issues:**
- Check server logs in terminal
- Review error codes: `/docs/ERROR_CODE_REFERENCE.md`
- Test with Swagger UI first

**Mobile Integration:**
- Share access token format
- Provide error code mapping
- Test with different languages

---

## 🎉 **Testing Completed?**

Once all tests pass:
- ✅ Mark authentication as ready
- ✅ Mobile team can start integration
- ✅ Deploy to staging environment
- ✅ Set up CI/CD pipeline

---

**Happy Testing!** 🧪

**Last Updated:** November 10, 2025  
**Server:** http://localhost:4000  
**Docs:** http://localhost:4000/api-docs
