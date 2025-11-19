# 📱 Mobile Team Handoff - SereneAI API

> **Everything mobile developers need to integrate with SereneAI backend**

---

## 🎯 **TL;DR - Start Here**

### **API Access:**
- **Staging URL:** `https://YOUR_RAILWAY_URL/v1` *(update after deployment)*
- **API Documentation:** `https://YOUR_RAILWAY_URL/api-docs`
- **Test Account:**
  - Email: `staging@example.com`
  - Password: `TestPass123`
  - Phone: `+628111222333`

### **Essential Resources:**
1. 📖 **Swagger UI** - Interactive API testing
2. 📱 **Translation Files** - `/mobile-translations/`
3. 🔴 **Error Codes** - `/docs/ERROR_CODE_REFERENCE.md`
4. 🧪 **Testing Guide** - `/docs/API_TESTING_GUIDE.md`

---

## 📚 **Complete Documentation Index**

### **1. API Documentation**

| Document | Purpose | Location |
|----------|---------|----------|
| **Swagger UI** | Interactive API testing | `https://YOUR_RAILWAY_URL/api-docs` |
| **API Contract** | Mobile API specification | `/docs/mobile-api-contract.md` |
| **Testing Guide** | API testing scenarios | `/docs/API_TESTING_GUIDE.md` |
| **Postman Collection** | Import into Postman | `/docs/collections/mobile-api.postman_collection.json` |

### **2. Mobile Resources**

| Resource | Purpose | Location |
|----------|---------|----------|
| **English Translations** | 269+ translation keys | `/mobile-translations/en.json` |
| **Indonesian Translations** | 269+ translation keys | `/mobile-translations/id.json` |
| **Translation Guide** | Implementation examples | `/mobile-translations/README.md` |
| **Error Code Reference** | 40+ error codes | `/docs/ERROR_CODE_REFERENCE.md` |

### **3. Architecture**

| Document | Purpose | Location |
|----------|---------|----------|
| **Full Architecture** | System architecture | `/docs/fullarchitecture.md` |
| **Mobile Readiness** | Mobile development roadmap | `/docs/mobile-readiness-roadmap.md` |
| **Database Design** | Database schema | `/DATABASE_REDESIGN.md` |

---

## 🚀 **Quick Start**

### **Step 1: Update API Base URL**

**Flutter:**
```dart
// lib/config/api_config.dart
class ApiConfig {
  static const String baseUrl = 'https://YOUR_RAILWAY_URL/v1';
  static const String wsUrl = 'wss://YOUR_RAILWAY_URL';
}
```

**React Native:**
```javascript
// config/api.js
export const API_BASE_URL = 'https://YOUR_RAILWAY_URL/v1';
export const WS_URL = 'wss://YOUR_RAILWAY_URL';
```

### **Step 2: Install Translation Package**

**Flutter (easy_localization):**
```bash
flutter pub add easy_localization
```

**React Native (react-i18next):**
```bash
npm install react-i18next i18next
```

### **Step 3: Copy Translation Files**

1. Copy `/mobile-translations/en.json` to your mobile project
2. Copy `/mobile-translations/id.json` to your mobile project
3. Follow implementation guide in `/mobile-translations/README.md`

### **Step 4: Test API Connection**

```bash
curl https://YOUR_RAILWAY_URL/health
# Expected: {"ok": true}
```

---

## 🔐 **Authentication Flow**

### **1. Patient Registration**

**Endpoint:** `POST /v1/auth/patient/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+628123456789",
  "dateOfBirth": "1990-01-15",
  "gender": "male"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "phone_number": "+628123456789",
      "role": "patient"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": 1001,
    "message": "Email sudah terdaftar",
    "messageEn": "Email already registered",
    "solution": "Gunakan email lain atau login dengan email yang sudah ada",
    "solutionEn": "Use a different email or login with existing account"
  }
}
```

### **2. Send OTP (Phone Verification)**

**Endpoint:** `POST /v1/auth/send-phone-otp`

**Request:**
```json
{
  "phone_number": "+628123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "messageId": "OTP-uuid"
}
```

**⚠️ Important:** In staging (dev mode), SMS is NOT sent. Check API documentation or logs for OTP code.

### **3. Verify OTP**

**Endpoint:** `POST /v1/auth/verify-otp`

**Request:**
```json
{
  "identifier": "+628123456789",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully"
}
```

**Error Cases:**
- Invalid OTP: Error code `1003`
- OTP expired: Error code `1004`
- Max attempts exceeded: Error code `1005`

### **4. Login**

**Endpoint:** `POST /v1/auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "patient"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### **5. Refresh Token**

**Endpoint:** `POST /v1/auth/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 🔑 **JWT Authentication**

### **Access Token:**
- **Lifetime:** 15 minutes
- **Usage:** All authenticated endpoints
- **Header:** `Authorization: Bearer <token>`

### **Refresh Token:**
- **Lifetime:** 7 days
- **Usage:** Refresh access token
- **Storage:** Secure storage (Keychain/Keystore)

### **Implementation Example:**

**Flutter:**
```dart
class ApiClient {
  String? _accessToken;
  
  Future<http.Response> get(String endpoint) async {
    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: {
        'Authorization': 'Bearer $_accessToken',
        'Content-Type': 'application/json',
        'Accept-Language': 'id', // or 'en'
      },
    );
    
    if (response.statusCode == 401) {
      await _refreshToken();
      return get(endpoint); // Retry
    }
    
    return response;
  }
}
```

**React Native:**
```javascript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'id', // or 'en'
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 🌐 **Internationalization (i18n)**

### **Language Selection:**

Set `Accept-Language` header in all API requests:
- Indonesian: `Accept-Language: id`
- English: `Accept-Language: en`

### **Error Messages:**

All errors return both languages:

```json
{
  "error": {
    "code": 1001,
    "message": "Email sudah terdaftar",      // Indonesian
    "messageEn": "Email already registered", // English
    "solution": "Gunakan email lain...",     // Indonesian
    "solutionEn": "Use a different email..." // English
  }
}
```

Display based on app language:
```dart
// Flutter
final errorMessage = locale == 'id' 
  ? error['message'] 
  : error['messageEn'];
```

```javascript
// React Native
const errorMessage = i18n.language === 'id'
  ? error.message
  : error.messageEn;
```

---

## 🔴 **Error Handling**

### **Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": 9001,
    "message": "Validasi gagal",
    "messageEn": "Validation failed",
    "solution": "Periksa data yang Anda masukkan",
    "solutionEn": "Check your input data",
    "fields": {
      "email": "Format email tidak valid",
      "password": "Password minimal 8 karakter"
    }
  }
}
```

### **Error Code Categories:**

| Range | Category |
|-------|----------|
| 1000-1099 | Authentication & Authorization |
| 2000-2099 | Appointments & Scheduling |
| 3000-3099 | Payments & Billing |
| 4000-4099 | Communications (Chat & Video) |
| 5000-5099 | Notifications |
| 6000-6099 | Profile & User Management |
| 7000-7099 | Clinic & Staff Management |
| 8000-8099 | File Uploads & Storage |
| 9000-9099 | System & Validation Errors |

### **Common Error Codes:**

| Code | Message | When |
|------|---------|------|
| 1001 | Email already registered | Registration with existing email |
| 1002 | Invalid credentials | Wrong email/password |
| 1003 | Invalid OTP | Wrong OTP code |
| 1004 | OTP expired | OTP older than 5 minutes |
| 1005 | Max OTP attempts exceeded | 3+ failed attempts |
| 9001 | Validation failed | Invalid input data |
| 9003 | Unauthorized | Missing/invalid token |
| 9004 | Rate limit exceeded | Too many requests |

**Full Reference:** `/docs/ERROR_CODE_REFERENCE.md`

### **Error Handling Example:**

**Flutter:**
```dart
try {
  final response = await apiClient.post('/auth/login', data);
  // Handle success
} catch (e) {
  if (e is ApiException) {
    switch (e.code) {
      case 1002:
        showError(tr('errors.auth.invalidCredentials'));
        break;
      case 9001:
        showValidationErrors(e.fields);
        break;
      case 9004:
        showError(tr('errors.rateLimit'));
        break;
      default:
        showError(tr('errors.unknown'));
    }
  }
}
```

**React Native:**
```javascript
try {
  const response = await apiClient.post('/auth/login', data);
  // Handle success
} catch (error) {
  const { code, message, messageEn, fields } = error.response.data.error;
  
  switch (code) {
    case 1002:
      showError(t('errors.auth.invalidCredentials'));
      break;
    case 9001:
      showValidationErrors(fields);
      break;
    case 9004:
      showError(t('errors.rateLimit'));
      break;
    default:
      showError(t('errors.unknown'));
  }
}
```

---

## 📊 **Rate Limiting**

### **Current Limits:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/send-phone-otp` | 3 requests | 15 minutes |
| `/auth/verify-otp` | 3 attempts | Per OTP session |
| All other endpoints | 100 requests | 15 minutes |

### **Rate Limit Response:**

```json
{
  "success": false,
  "error": {
    "code": 9004,
    "message": "Terlalu banyak permintaan",
    "messageEn": "Too many requests",
    "retryAfter": 900
  }
}
```

### **Handling Rate Limits:**

```dart
// Flutter
if (error.code == 9004) {
  final retryAfter = error.retryAfter; // seconds
  showError(tr('errors.rateLimit', args: [retryAfter.toString()]));
  
  // Disable button for retryAfter seconds
  Timer(Duration(seconds: retryAfter), () {
    enableButton();
  });
}
```

---

## 🧪 **Testing**

### **Test Scenarios:**

1. **Complete Authentication Flow:**
   - Register → Send OTP → Verify OTP → Login

2. **Error Handling:**
   - Invalid email format
   - Weak password
   - Expired OTP
   - Wrong OTP code

3. **Rate Limiting:**
   - Send OTP 4 times rapidly
   - Verify with wrong OTP 4 times

4. **Token Refresh:**
   - Let access token expire (15 min)
   - Make API call
   - Verify auto-refresh works

5. **Language Switching:**
   - Test with `Accept-Language: id`
   - Test with `Accept-Language: en`
   - Verify error messages

### **Test Checklist:**

- [ ] Registration flow works
- [ ] OTP send works (check docs/logs for code)
- [ ] OTP verification works
- [ ] Login returns valid tokens
- [ ] Authenticated endpoints require Bearer token
- [ ] Token refresh works
- [ ] Error codes display correctly
- [ ] Rate limiting prevents abuse
- [ ] Language switching works
- [ ] Network error handling works

---

## 📱 **Translation Implementation**

### **Available Keys:**

269+ translation keys covering:
- Authentication (login, register, OTP, forgot password)
- Appointments (booking, details, status, cancel)
- Clinics (search, details, reviews)
- Dentists (profiles, specialties, availability)
- Profile (personal, medical, insurance, emergency)
- Payments (pending, history, status)
- Chat (messages, attachments, status)
- Notifications (types, settings)
- Medical Records (history, prescriptions)
- Errors (network, server, validation)
- Date & Time localization

### **Flutter Implementation:**

```dart
// 1. Install package
// flutter pub add easy_localization

// 2. Setup in main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  
  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('id')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      child: MyApp(),
    ),
  );
}

// 3. Usage
Text('auth.login.welcome'.tr(args: [userName]))
Text('errors.validation.required'.tr(args: ['email']))
```

### **React Native Implementation:**

```javascript
// 1. Install packages
// npm install react-i18next i18next

// 2. Setup i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import id from './translations/id.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: 'id',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// 3. Usage
const { t } = useTranslation();
<Text>{t('auth.login.welcome', { name: userName })}</Text>
<Text>{t('errors.validation.required', { field: 'email' })}</Text>
```

**Full Guide:** `/mobile-translations/README.md`

---

## 🔄 **WebSocket (Chat & Notifications)**

Coming soon in next phase. Will support:
- Real-time chat messages
- Typing indicators
- Read receipts
- Push notifications
- Appointment updates

---

## 📦 **Postman Collection**

### **Import Collection:**

1. Open Postman
2. Click "Import"
3. Select `/docs/collections/mobile-api.postman_collection.json`
4. Update `baseUrl` variable to your staging URL

### **Environment Variables:**

```json
{
  "baseUrl": "https://YOUR_RAILWAY_URL/v1",
  "accessToken": "<paste after login>",
  "refreshToken": "<paste after login>"
}
```

---

## 🎯 **Development Workflow**

### **Day-to-Day Development:**

1. **Morning:** Check Swagger UI for API changes
2. **During Development:** Test endpoints in Postman
3. **Before Commit:** Test error scenarios
4. **Before Release:** Full integration test

### **Staying Updated:**

- API changes will be documented in Swagger UI
- Translation updates will be in `/mobile-translations/`
- Error code changes will be in `/docs/ERROR_CODE_REFERENCE.md`

---

## 🆘 **Support & Help**

### **Questions About:**

| Topic | Resource |
|-------|----------|
| API Endpoints | Swagger UI (`/api-docs`) |
| Authentication | `/docs/auth-api.md` |
| Error Codes | `/docs/ERROR_CODE_REFERENCE.md` |
| Testing | `/docs/API_TESTING_GUIDE.md` |
| Translations | `/mobile-translations/README.md` |

### **Issues:**

1. **Check Swagger UI** for latest API documentation
2. **Review error code** in `/docs/ERROR_CODE_REFERENCE.md`
3. **Test in Postman** to isolate mobile vs API issue
4. **Check staging logs** in Railway dashboard

---

## ✅ **Mobile Team Checklist**

### **Setup Phase:**
- [ ] Update API base URL in app
- [ ] Install translation packages
- [ ] Copy translation files
- [ ] Import Postman collection
- [ ] Test health endpoint

### **Development Phase:**
- [ ] Implement authentication flow
- [ ] Add error code handling
- [ ] Integrate translations
- [ ] Implement token refresh
- [ ] Add loading states
- [ ] Add offline handling

### **Testing Phase:**
- [ ] Test registration flow
- [ ] Test OTP flow
- [ ] Test login flow
- [ ] Test error scenarios
- [ ] Test rate limiting
- [ ] Test language switching
- [ ] Test token refresh

### **Ready for Production:**
- [ ] All API calls use proper error handling
- [ ] All UI text uses translations
- [ ] Token refresh works automatically
- [ ] Offline mode gracefully handled
- [ ] Loading states implemented
- [ ] Error messages user-friendly

---

## 🎉 **You're Ready!**

Everything you need is ready:
- ✅ Staging API deployed
- ✅ Interactive documentation (Swagger UI)
- ✅ Complete translations (ID + EN)
- ✅ Error code reference
- ✅ Testing guide
- ✅ Postman collection

**Start with:**
1. Test health endpoint
2. Explore Swagger UI
3. Import translation files
4. Test authentication flow

**Questions?** Check documentation first, then ask backend team.

---

**Last Updated:** November 10, 2025  
**API Version:** v1  
**Staging Status:** ✅ Ready for mobile integration
