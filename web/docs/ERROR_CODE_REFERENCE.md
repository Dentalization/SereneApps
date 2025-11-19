# 📘 Error Code Reference - SereneAI API

> **Comprehensive error code documentation for mobile and web developers**

## 🎯 **Quick Navigation**

- [Error Code Ranges](#error-code-ranges)
- [Authentication Errors (1000-1099)](#authentication-errors-1000-1099)
- [Appointment Errors (2000-2099)](#appointment-errors-2000-2099)
- [Payment Errors (3000-3099)](#payment-errors-3000-3099)
- [Communication Errors (4000-4099)](#communication-errors-4000-4099)
- [Notification Errors (5000-5099)](#notification-errors-5000-5099)
- [Profile Errors (6000-6099)](#profile-errors-6000-6099)
- [Clinic Errors (7000-7099)](#clinic-errors-7000-7099)
- [File Upload Errors (8000-8099)](#file-upload-errors-8000-8099)
- [System Errors (9000-9099)](#system-errors-9000-9099)
- [Error Response Format](#error-response-format)
- [Mobile Implementation Guide](#mobile-implementation-guide)

---

## 📊 **Error Code Ranges**

| Range | Category | Description |
|-------|----------|-------------|
| **1000-1099** | Authentication & Authorization | Login, register, OTP, tokens |
| **2000-2099** | Appointments | Booking, cancellation, scheduling |
| **3000-3099** | Payments | Transactions, refunds, failures |
| **4000-4099** | Communications | Chat, video calls, messaging |
| **5000-5099** | Notifications | Push notifications, device registration |
| **6000-6099** | Profile & User Management | Profile updates, user data |
| **7000-7099** | Clinic Management | Clinics, dentists, availability |
| **8000-8099** | File Uploads | Document uploads, file validation |
| **9000-9099** | System & General | Validation, server errors, rate limits |

---

## 🔐 **Authentication Errors (1000-1099)**

### **1001 - AUTH_INVALID_CREDENTIALS**
**❌ Wrong email or password**

```json
{
  "code": 1001,
  "errorCode": "AUTH_INVALID_CREDENTIALS",
  "message": "Email atau password salah",
  "solution": "Periksa kembali email dan password Anda"
}
```

**When this happens:**
- User enters wrong password
- Email doesn't exist in database
- Login attempt with incorrect credentials

**Mobile handling:**
```dart
// Flutter example
if (error.code == 1001) {
  showSnackBar("Email atau password salah. Coba lagi.");
  emailController.clear();
  passwordController.clear();
}
```

---

### **1002 - AUTH_EMAIL_EXISTS**
**❌ Email already registered**

```json
{
  "code": 1002,
  "errorCode": "AUTH_EMAIL_EXISTS",
  "message": "Email sudah terdaftar",
  "solution": "Gunakan email lain atau coba login"
}
```

**When this happens:**
- Registration with existing email
- User trying to register again

**Mobile handling:**
```dart
if (error.code == 1002) {
  showDialog(
    title: "Email Sudah Terdaftar",
    message: "Ingin login dengan email ini?",
    actions: [NavigateToLogin()]
  );
}
```

---

### **1003 - AUTH_OTP_EXPIRED**
**⏰ OTP has expired (>5 minutes)**

```json
{
  "code": 1003,
  "errorCode": "AUTH_OTP_EXPIRED",
  "message": "Kode OTP sudah kadaluarsa",
  "solution": "Silakan minta kode OTP baru"
}
```

**When this happens:**
- OTP entered after 5 minutes
- User took too long to verify

**Mobile handling:**
```dart
if (error.code == 1003) {
  showResendButton();
  startTimer(60); // Countdown for resend
}
```

---

### **1004 - AUTH_OTP_INVALID**
**❌ Wrong OTP code**

```json
{
  "code": 1004,
  "errorCode": "AUTH_OTP_INVALID",
  "message": "Kode OTP tidak valid",
  "solution": "Periksa kembali kode yang Anda masukkan"
}
```

**When this happens:**
- User enters wrong OTP
- Typo in OTP input

**Mobile handling:**
```dart
if (error.code == 1004) {
  otpController.clear();
  showError("Kode salah. Periksa SMS Anda.");
  attemptsLeft--;
  if (attemptsLeft == 0) {
    showResendButton();
  }
}
```

---

### **1005 - AUTH_TOKEN_EXPIRED**
**⏰ JWT token expired**

```json
{
  "code": 1005,
  "errorCode": "AUTH_TOKEN_EXPIRED",
  "message": "Sesi Anda telah berakhir",
  "solution": "Silakan login kembali"
}
```

**When this happens:**
- Access token expired (typically after 1 hour)
- User inactive for extended period

**Mobile handling:**
```dart
if (error.code == 1005) {
  // Try refresh token first
  final newToken = await refreshAccessToken();
  if (newToken != null) {
    retryRequest(newToken);
  } else {
    // Refresh failed, logout
    await logout();
    navigateToLogin();
  }
}
```

---

### **1006 - AUTH_TOKEN_INVALID**
**❌ Malformed or invalid token**

```json
{
  "code": 1006,
  "errorCode": "AUTH_TOKEN_INVALID",
  "message": "Token tidak valid",
  "solution": "Silakan login kembali"
}
```

**When this happens:**
- Token tampered with
- Corrupted token in storage
- Wrong token format

**Mobile handling:**
```dart
if (error.code == 1006) {
  await clearTokens();
  navigateToLogin();
}
```

---

### **1009 - AUTH_OTP_MAX_ATTEMPTS**
**🚫 Too many wrong OTP attempts (>3)**

```json
{
  "code": 1009,
  "errorCode": "AUTH_OTP_MAX_ATTEMPTS",
  "message": "Terlalu banyak percobaan OTP yang salah",
  "solution": "Silakan minta kode OTP baru"
}
```

**When this happens:**
- User entered wrong OTP 3+ times
- Security measure triggered

**Mobile handling:**
```dart
if (error.code == 1009) {
  showDialog(
    title: "Terlalu Banyak Percobaan",
    message: "Silakan minta kode OTP baru",
    actions: [ResendOTPButton()]
  );
}
```

---

## 📅 **Appointment Errors (2000-2099)**

### **2001 - APPOINTMENT_NOT_FOUND**
```json
{
  "code": 2001,
  "errorCode": "APPOINTMENT_NOT_FOUND",
  "message": "Janji temu tidak ditemukan"
}
```

### **2002 - APPOINTMENT_CONFLICT**
**⚠️ Time slot already booked**

```json
{
  "code": 2002,
  "errorCode": "APPOINTMENT_CONFLICT",
  "message": "Waktu yang dipilih sudah dibooking",
  "solution": "Pilih waktu lain yang tersedia"
}
```

**Mobile handling:**
```dart
if (error.code == 2002) {
  // Refresh available slots
  await refreshAvailableSlots();
  showDialog("Waktu ini sudah dibooking. Pilih waktu lain.");
}
```

### **2003 - APPOINTMENT_CANCEL_DEADLINE**
**⏰ Cannot cancel <24h before appointment**

```json
{
  "code": 2003,
  "errorCode": "APPOINTMENT_CANCEL_DEADLINE",
  "message": "Tidak bisa cancel dalam 24 jam sebelum janji",
  "solution": "Hubungi klinik langsung untuk bantuan"
}
```

**Mobile handling:**
```dart
if (error.code == 2003) {
  showDialog(
    title: "Tidak Bisa Cancel",
    message: "Hubungi klinik di ${clinic.phoneNumber}",
    actions: [CallClinicButton(clinic.phoneNumber)]
  );
}
```

---

## 💳 **Payment Errors (3000-3099)**

### **3001 - PAYMENT_NOT_FOUND**
### **3002 - PAYMENT_ALREADY_PAID**
### **3003 - PAYMENT_FAILED**
### **3004 - PAYMENT_EXPIRED**

**Mobile handling example:**
```dart
switch (error.code) {
  case 3002:
    // Already paid - navigate to success page
    navigateToPaymentSuccess();
    break;
  case 3003:
    // Failed - show retry options
    showRetryPaymentDialog();
    break;
  case 3004:
    // Expired - create new payment
    await createNewPayment();
    break;
}
```

---

## 💬 **Communication Errors (4000-4099)**

### **4003 - CHAT_MESSAGE_TOO_LONG**
**📏 Message exceeds 5000 characters**

```json
{
  "code": 4003,
  "errorCode": "CHAT_MESSAGE_TOO_LONG",
  "message": "Pesan terlalu panjang",
  "solution": "Maksimal 5000 karakter per pesan"
}
```

### **4004 - CHAT_FILE_TOO_LARGE**
**📁 File exceeds 5MB limit**

```json
{
  "code": 4004,
  "errorCode": "CHAT_FILE_TOO_LARGE",
  "message": "File terlalu besar",
  "solution": "Maksimal ukuran file 5MB"
}
```

---

## 📁 **File Upload Errors (8000-8099)**

### **8001 - FILE_TOO_LARGE**
**Mobile validation:**
```dart
Future<void> uploadFile(File file) async {
  final fileSizeInMB = file.lengthSync() / (1024 * 1024);
  
  if (fileSizeInMB > 5) {
    showError("File terlalu besar. Maksimal 5MB.");
    return;
  }
  
  // Continue upload...
}
```

### **8002 - FILE_INVALID_TYPE**
**Supported types:** jpg, png, pdf

---

## 🔧 **System Errors (9000-9099)**

### **9001 - VALIDATION_ERROR**
**Field validation failed**

```json
{
  "code": 9001,
  "errorCode": "VALIDATION_ERROR",
  "message": "Data tidak valid",
  "details": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    },
    {
      "field": "phone_number",
      "message": "Nomor telepon harus diawali +62"
    }
  ]
}
```

**Mobile handling:**
```dart
if (error.code == 9001 && error.details != null) {
  for (var detail in error.details) {
    showFieldError(detail.field, detail.message);
  }
}
```

### **9004 - RATE_LIMIT_EXCEEDED**
**Too many requests**

```json
{
  "code": 9004,
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "message": "Terlalu banyak request",
  "solution": "Silakan tunggu beberapa saat"
}
```

**Mobile handling:**
```dart
if (error.code == 9004) {
  disableSubmitButton();
  showCountdown(60); // Wait 60 seconds
}
```

---

## 📦 **Error Response Format**

All API errors follow this structure:

```json
{
  "code": 1004,
  "errorCode": "AUTH_OTP_INVALID",
  "message": "Kode OTP tidak valid",
  "solution": "Periksa kembali kode yang Anda masukkan",
  "details": null  // Optional: additional context
}
```

### **Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `code` | `number` | Numeric error code (1000-9999) |
| `errorCode` | `string` | Machine-readable error identifier |
| `message` | `string` | Human-readable error message (localized) |
| `solution` | `string` | Suggested action for user |
| `details` | `object/null` | Additional error context (optional) |

---

## 📱 **Mobile Implementation Guide**

### **1. Create Error Model**

```dart
// lib/models/api_error.dart
class APIError {
  final int code;
  final String errorCode;
  final String message;
  final String solution;
  final dynamic details;

  APIError({
    required this.code,
    required this.errorCode,
    required this.message,
    required this.solution,
    this.details,
  });

  factory APIError.fromJson(Map<String, dynamic> json) {
    return APIError(
      code: json['code'],
      errorCode: json['errorCode'],
      message: json['message'],
      solution: json['solution'],
      details: json['details'],
    );
  }

  bool get isAuthError => code >= 1000 && code < 2000;
  bool get isAppointmentError => code >= 2000 && code < 3000;
  bool get isPaymentError => code >= 3000 && code < 4000;
  bool get isServerError => code >= 9000;
}
```

### **2. HTTP Interceptor**

```dart
// lib/services/http_interceptor.dart
import 'package:dio/dio.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.data != null) {
      final apiError = APIError.fromJson(err.response!.data);
      
      // Global error handling
      switch (apiError.code) {
        case 1005: // Token expired
        case 1006: // Token invalid
          _handleTokenExpired();
          break;
        case 9004: // Rate limit
          _showRateLimitWarning();
          break;
        default:
          handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }
  
  void _handleTokenExpired() {
    // Logout and redirect to login
    Get.find<AuthController>().logout();
    Get.offAllNamed('/login');
  }
  
  void _showRateLimitWarning() {
    Get.snackbar(
      'Terlalu Banyak Request',
      'Mohon tunggu beberapa saat',
      duration: Duration(seconds: 5),
    );
  }
}
```

### **3. Error Display Utility**

```dart
// lib/utils/error_handler.dart
class ErrorHandler {
  static void show(APIError error, BuildContext context) {
    // Show appropriate UI based on error type
    if (error.isAuthError) {
      _showAuthError(error, context);
    } else if (error.code == 2002) {
      _showAppointmentConflict(error, context);
    } else {
      _showGenericError(error, context);
    }
  }
  
  static void _showAuthError(APIError error, BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Autentikasi Gagal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(error.message),
            SizedBox(height: 8),
            Text(
              error.solution,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('OK'),
          ),
        ],
      ),
    );
  }
}
```

### **4. Usage Example**

```dart
// In your service/repository
Future<User> login(String email, String password) async {
  try {
    final response = await dio.post('/v1/auth/login', data: {
      'email': email,
      'password': password,
    });
    
    return User.fromJson(response.data);
  } on DioException catch (e) {
    if (e.response?.data != null) {
      final error = APIError.fromJson(e.response!.data);
      
      // Handle specific errors
      if (error.code == 1001) {
        throw LoginException('Email atau password salah');
      }
      
      throw error;
    }
    
    throw Exception('Network error');
  }
}
```

---

## 🌍 **Localization Support**

All error messages support both Indonesian (`id`) and English (`en`):

```javascript
// Backend automatically detects language from Accept-Language header
const error = new APIError('AUTH_OTP_INVALID', null, 'en');
// Returns: "Invalid OTP"

const error = new APIError('AUTH_OTP_INVALID', null, 'id');
// Returns: "Kode OTP tidak valid"
```

**Mobile implementation:**
```dart
// Send language preference in headers
final headers = {
  'Accept-Language': Localizations.localeOf(context).languageCode,
};
```

---

## 📊 **Error Monitoring Recommendations**

### **Track these metrics:**

1. **Error Rate by Code**
   - Which errors occur most frequently?
   - Are users hitting auth errors repeatedly?

2. **Error Rate by Screen**
   - Which screens generate most errors?
   - User journey bottlenecks

3. **Time to Resolution**
   - How long until user resolves error?
   - Retry attempt patterns

### **Sentry/Firebase integration:**

```dart
void logError(APIError error, StackTrace stackTrace) {
  Sentry.captureException(
    error,
    stackTrace: stackTrace,
    withScope: (scope) {
      scope.setTag('error_code', error.code.toString());
      scope.setTag('error_type', error.errorCode);
      scope.setContext('error_details', {
        'message': error.message,
        'solution': error.solution,
      });
    },
  );
}
```

---

## 🔍 **Testing Checklist**

- [ ] All error codes have test cases
- [ ] Mobile app handles all 1xxx auth errors
- [ ] Appointment conflict (2002) shows alternative slots
- [ ] Rate limiting (9004) disables buttons temporarily
- [ ] Token expiry (1005) triggers refresh flow
- [ ] File upload validates size before sending
- [ ] Validation errors (9001) highlight specific fields
- [ ] Offline errors show retry options

---

## 📞 **Support**

If you encounter undocumented errors or need clarification:

**Backend Team:** @adrian  
**Mobile Team:** TBD  
**Docs:** `/docs/ERROR_CODE_REFERENCE.md`

---

**Last Updated:** November 10, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
