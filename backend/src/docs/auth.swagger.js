/**
 * @swagger
 * /auth/patient/register:
 *   post:
 *     summary: Register a new patient
 *     description: |
 *       Creates a new patient account with full profile information.
 *       
 *       **Rate Limit:** 5 requests / 15 minutes
 *       
 *       **After registration:**
 *       - User receives JWT access token and refresh token
 *       - Phone verification required before booking appointments
 *       - Send OTP to phone number using `/auth/send-phone-otp`
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phoneNumber
 *               - dateOfBirth
 *               - gender
 *             properties:
 *               name:
 *                 type: string
 *                 description: Patient's full name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Unique email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Minimum 8 characters, must include uppercase, lowercase, and number
 *                 example: SecurePass123
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number with country code (+62 for Indonesia)
 *                 example: +628123456789
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: Patient's date of birth (YYYY-MM-DD)
 *                 example: 1990-01-15
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 example: male
 *               insuranceProvider:
 *                 type: string
 *                 description: Insurance company name (optional)
 *                 example: BPJS Kesehatan
 *               insuranceNumber:
 *                 type: string
 *                 description: Insurance policy number (optional)
 *                 example: 1234567890123
 *               emergencyContactName:
 *                 type: string
 *                 description: Emergency contact person's name (optional)
 *                 example: Jane Doe
 *               emergencyContactPhone:
 *                 type: string
 *                 description: Emergency contact phone number (optional)
 *                 example: +628987654321
 *               addressLine1:
 *                 type: string
 *                 description: Primary address (optional)
 *                 example: Jl. Sudirman No. 123
 *               city:
 *                 type: string
 *                 example: Jakarta
 *               province:
 *                 type: string
 *                 example: DKI Jakarta
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of known allergies (optional)
 *                 example: ["penicillin", "latex"]
 *     responses:
 *       201:
 *         description: Patient registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Patient registered successfully
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (1 hour expiry)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (7 days expiry)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email or phone already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 1002
 *               errorCode: AUTH_EMAIL_EXISTS
 *               message: Email sudah terdaftar
 *               solution: Gunakan email lain atau coba login
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * 
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: |
 *       Authenticate user with email and password.
 *       
 *       **Rate Limit:** 5 requests / 15 minutes
 *       
 *       **Returns:**
 *       - Access token (1 hour expiry) - Use for API requests
 *       - Refresh token (7 days expiry) - Use to get new access token
 *       
 *       **For dentists:**
 *       - Account must be verified by admin before login
 *       - Unverified dentists receive error code `DENTIST_NOT_VERIFIED`
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: patient@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token (1 hour expiry)
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token (7 days expiry)
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidEmail:
 *                 value:
 *                   code: 1001
 *                   errorCode: AUTH_INVALID_CREDENTIALS
 *                   message: Email tidak ditemukan
 *                   solution: Periksa kembali email Anda atau daftar akun baru
 *               invalidPassword:
 *                 value:
 *                   code: 1001
 *                   errorCode: AUTH_INVALID_CREDENTIALS
 *                   message: Password salah
 *                   solution: Periksa kembali password Anda
 *       403:
 *         description: Dentist account not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Akun Anda belum diverifikasi
 *                 code:
 *                   type: string
 *                   example: DENTIST_NOT_VERIFIED
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 * 
 * /auth/send-phone-otp:
 *   post:
 *     summary: Send OTP to phone number
 *     description: |
 *       Sends a 6-digit OTP code via SMS to verify phone number.
 *       
 *       **Rate Limit:** 3 requests / 5 minutes (stricter limit)
 *       
 *       **OTP Details:**
 *       - 6-digit numeric code
 *       - Valid for 5 minutes
 *       - Maximum 3 verification attempts
 *       - After 3 failed attempts, request new OTP
 *       
 *       **Development Mode:**
 *       - If Twilio credentials not configured, OTP is logged to console
 *       - OTP returned in response for testing (removed in production)
 *     tags:
 *       - OTP Verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone_number
 *             properties:
 *               phone_number:
 *                 type: string
 *                 description: Phone number with country code
 *                 example: +628123456789
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP sent to +628123456789
 *                 expiresIn:
 *                   type: integer
 *                   description: OTP validity in seconds
 *                   example: 300
 *                 otp:
 *                   type: string
 *                   description: OTP code (only in dev mode)
 *                   example: "123456"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * 
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     description: |
 *       Verifies the OTP code sent to phone number or email.
 *       
 *       **Rate Limit:** 3 requests / 5 minutes
 *       
 *       **Verification Rules:**
 *       - OTP must match exactly (case-sensitive)
 *       - OTP must not be expired (< 5 minutes old)
 *       - Maximum 3 attempts per OTP
 *       - After 3 failed attempts, request new OTP
 *       
 *       **After successful verification:**
 *       - User's `isPhoneVerified` or `isEmailVerified` flag is set to true
 *       - User can proceed with booking appointments
 *     tags:
 *       - OTP Verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - otp
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Phone number or email that received OTP
 *                 example: +628123456789
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Phone number verified successfully
 *                 verified:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidOtp:
 *                 value:
 *                   code: 1004
 *                   errorCode: AUTH_OTP_INVALID
 *                   message: Kode OTP tidak valid
 *                   solution: Periksa kembali kode yang Anda masukkan
 *               expiredOtp:
 *                 value:
 *                   code: 1003
 *                   errorCode: AUTH_OTP_EXPIRED
 *                   message: Kode OTP sudah kadaluarsa
 *                   solution: Silakan minta kode OTP baru
 *               maxAttempts:
 *                 value:
 *                   code: 1009
 *                   errorCode: AUTH_OTP_MAX_ATTEMPTS
 *                   message: Terlalu banyak percobaan OTP yang salah
 *                   solution: Silakan minta kode OTP baru
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 * 
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Get new access token using refresh token.
 *       
 *       **When to use:**
 *       - When access token expires (after 1 hour)
 *       - Before making important API calls to ensure token is fresh
 *       
 *       **Token lifecycle:**
 *       - Access token: 1 hour expiry
 *       - Refresh token: 7 days expiry
 *       - After 7 days, user must login again
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token from login/register response
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: New tokens generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New access token (1 hour expiry)
 *                 refreshToken:
 *                   type: string
 *                   description: New refresh token (7 days expiry)
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 1006
 *               errorCode: AUTH_TOKEN_INVALID
 *               message: Token tidak valid
 *               solution: Silakan login kembali
 */

// This file contains JSDoc annotations for Swagger documentation
// Actual route implementations are in auth.js
export default {};
