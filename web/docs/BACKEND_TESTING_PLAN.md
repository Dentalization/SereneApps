# 🧪 Backend Testing Plan for Mobile Readiness

**Purpose:** Ensure all backend APIs are production-ready before mobile development starts

---

## 📊 Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      🎯 E2E Tests                          │
│                     ████████░░░░  (10%)                     │
│                                                             │
│                 🔗 Integration Tests                       │
│              ████████████████████░░░░  (30%)               │
│                                                             │
│            ⚡ Unit Tests                                   │
│     ████████████████████████████████████████  (60%)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Coverage Target:** 80% minimum for critical paths

---

## ✅ Testing Checklist by Feature

### 1. Authentication & Authorization

#### Unit Tests
- [ ] **Password Hashing**
  - Test bcrypt hashing with different salts
  - Verify hash comparison works
  - Test invalid passwords rejected

- [ ] **JWT Token Generation**
  - Test token creation with user payload
  - Verify expiry times (15min access, 7d refresh)
  - Test token signing with different secrets

- [ ] **OTP Generation**
  - Test 6-digit OTP generation
  - Verify OTP uniqueness
  - Test OTP expiry (5 minutes)

#### Integration Tests
- [ ] **Patient Registration Flow**
  ```javascript
  test('Patient can register with valid data', async () => {
    const response = await request(app)
      .post('/v1/auth/patient/register')
      .send({
        name: 'Test Patient',
        email: 'patient@test.com',
        password: 'SecureP@ss123',
        phone_number: '+628123456789',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe('patient@test.com');
  });

  test('Registration fails with duplicate email', async () => {
    // Register first patient
    await request(app).post('/v1/auth/patient/register').send(patientData);
    
    // Try to register again with same email
    const response = await request(app)
      .post('/v1/auth/patient/register')
      .send(patientData);
    
    expect(response.status).toBe(409);
    expect(response.body.code).toBe(1002); // AUTH_EMAIL_EXISTS
  });
  ```

- [ ] **Login Flow**
  - Test successful login with correct credentials
  - Test login fails with wrong password
  - Test login fails with non-existent email
  - Test login returns both access and refresh tokens

- [ ] **OTP Verification**
  - Test OTP sent to phone number
  - Test OTP sent to email
  - Test OTP verification succeeds with correct code
  - Test OTP verification fails with wrong code
  - Test OTP expiry after 5 minutes

- [ ] **Password Reset**
  - Test reset token sent to email
  - Test password reset with valid token
  - Test password reset fails with expired token
  - Test password reset fails with invalid token

- [ ] **Email Verification**
  - Test verification email sent
  - Test email verified with valid token
  - Test verification fails with expired token

- [ ] **Token Refresh**
  - Test access token refresh with valid refresh token
  - Test refresh fails with invalid refresh token
  - Test refresh fails with expired refresh token

#### E2E Tests
- [ ] **Complete Registration → Login → Access Protected Route**
  ```javascript
  test('Full auth flow', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/v1/auth/patient/register')
      .send(patientData);
    
    // 2. Login
    const loginRes = await request(app)
      .post('/v1/auth/login')
      .send({ email: patientData.email, password: patientData.password });
    
    const token = loginRes.body.token;
    
    // 3. Access protected route
    const profileRes = await request(app)
      .get('/v1/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.email).toBe(patientData.email);
  });
  ```

---

### 2. Appointments

#### Unit Tests
- [ ] **Time Slot Validation**
  - Test valid time slot format (30min intervals)
  - Test invalid time slots rejected
  - Test working hours validation (8 AM - 6 PM)

- [ ] **Conflict Detection Logic**
  - Test overlapping appointments detected
  - Test adjacent appointments allowed
  - Test same dentist, different time allowed

#### Integration Tests
- [ ] **Check Availability**
  ```javascript
  test('Returns available time slots for dentist on date', async () => {
    const response = await request(app)
      .get('/v1/appointments/availability')
      .query({
        dentistId: 'dentist-123',
        date: '2025-11-15',
      })
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.slots).toBeInstanceOf(Array);
    expect(response.body.slots.length).toBeGreaterThan(0);
  });
  ```

- [ ] **Book Appointment**
  - Test successful booking with available slot
  - Test booking fails with conflict
  - Test booking fails outside working hours
  - Test booking requires authentication
  - Test booking creates payment intent

- [ ] **Reschedule Appointment**
  - Test reschedule to available slot
  - Test reschedule fails within 24h
  - Test reschedule fails to conflicting slot
  - Test reschedule updates audit trail

- [ ] **Cancel Appointment**
  - Test cancel with valid reason
  - Test cancel fails within 24h
  - Test cancel refunds payment
  - Test cancel updates status history

- [ ] **List Appointments**
  - Test patient sees only own appointments
  - Test dentist sees only assigned appointments
  - Test clinic sees all appointments
  - Test filtering by status (upcoming, past, cancelled)
  - Test pagination works

#### E2E Tests
- [ ] **Complete Booking Flow**
  ```javascript
  test('Patient books, pays, and attends appointment', async () => {
    // 1. Check availability
    const availRes = await request(app)
      .get('/v1/appointments/availability')
      .query({ dentistId, date })
      .set('Authorization', `Bearer ${patientToken}`);
    
    const slot = availRes.body.slots[0];
    
    // 2. Book appointment
    const bookRes = await request(app)
      .post('/v1/appointments')
      .send({
        dentistId,
        clinicId,
        scheduled_time: slot,
        treatment_type: 'General Checkup',
      })
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(bookRes.status).toBe(201);
    const appointmentId = bookRes.body.id;
    
    // 3. Create payment
    const paymentRes = await request(app)
      .post('/v1/payments')
      .send({
        appointmentId,
        amount: 150000,
        provider: 'midtrans',
      })
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(paymentRes.status).toBe(201);
    
    // 4. Confirm payment (simulate webhook)
    await request(app)
      .post('/v1/payments/webhooks/midtrans')
      .send({
        order_id: paymentRes.body.id,
        transaction_status: 'settlement',
      });
    
    // 5. Check appointment status updated
    const statusRes = await request(app)
      .get(`/v1/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(statusRes.body.status).toBe('confirmed');
  });
  ```

---

### 3. Payments

#### Unit Tests
- [ ] **Amount Validation**
  - Test positive amounts only
  - Test decimal precision (2 places)
  - Test maximum amount limit

- [ ] **Refund Calculation**
  - Test full refund amount
  - Test partial refund amount
  - Test refund doesn't exceed original

#### Integration Tests
- [ ] **Create Payment Intent**
  - Test payment creation with valid appointment
  - Test payment fails for already-paid appointment
  - Test payment amount matches treatment price
  - Test payment creates Midtrans transaction

- [ ] **Confirm Payment**
  - Test payment confirmation updates status
  - Test payment updates appointment status
  - Test payment sends confirmation email
  - Test payment generates receipt

- [ ] **Midtrans Webhook**
  - Test webhook handles 'pending' status
  - Test webhook handles 'settlement' status
  - Test webhook handles 'deny' status
  - Test webhook validates signature
  - Test webhook is idempotent

- [ ] **Refund Payment**
  - Test refund creates Midtrans refund
  - Test refund updates payment status
  - Test refund sends notification
  - Test refund only allowed within 90 days
  - Test refund only allowed for 'completed' payments

- [ ] **Payment History**
  - Test patient sees only own payments
  - Test filtering by status
  - Test filtering by date range
  - Test pagination works

#### E2E Tests
- [ ] **Payment → Refund Flow**
  ```javascript
  test('Patient pays and receives refund', async () => {
    // 1. Create payment
    const paymentRes = await request(app)
      .post('/v1/payments')
      .send({ appointmentId, amount: 150000, provider: 'midtrans' })
      .set('Authorization', `Bearer ${patientToken}`);
    
    const paymentId = paymentRes.body.id;
    
    // 2. Simulate successful payment
    await request(app)
      .post('/v1/payments/webhooks/midtrans')
      .send({ order_id: paymentId, transaction_status: 'settlement' });
    
    // 3. Request refund
    const refundRes = await request(app)
      .post(`/v1/payments/${paymentId}/refund`)
      .send({ amount: 150000, reason: 'Changed my mind' })
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(refundRes.status).toBe(200);
    
    // 4. Check payment status
    const statusRes = await request(app)
      .get(`/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(statusRes.body.status).toBe('refunded');
  });
  ```

---

### 4. Communications (Chat & Video)

#### Unit Tests
- [ ] **Message Sanitization**
  - Test HTML stripped from messages
  - Test XSS attempts blocked
  - Test emoji/unicode preserved

- [ ] **File Type Validation**
  - Test allowed file types (jpg, png, pdf)
  - Test disallowed file types rejected
  - Test file size limit (5MB)

#### Integration Tests
- [ ] **Create Chat Room**
  - Test room created for appointment
  - Test room includes patient and dentist as members
  - Test duplicate room not created

- [ ] **Send Message**
  - Test message sent successfully
  - Test message saved to database
  - Test Socket.IO emits message event
  - Test message includes sender info

- [ ] **Upload Attachment**
  - Test image upload successful
  - Test file uploaded to S3/GCS
  - Test thumbnail generated for images
  - Test file URL returned

- [ ] **Video Token Generation**
  - Test Twilio token generated
  - Test token includes room name
  - Test token has 1-hour expiry
  - Test token includes user identity

- [ ] **Socket.IO Events**
  - Test 'message' event emitted on send
  - Test 'typing' event emitted
  - Test 'read' event emitted
  - Test events only sent to room members

#### E2E Tests
- [ ] **Chat Flow**
  ```javascript
  test('Patient and dentist exchange messages', async () => {
    // 1. Patient sends message
    const msgRes = await request(app)
      .post(`/v1/communications/appointments/${appointmentId}/chat/messages`)
      .send({ content: 'Hello doctor!' })
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(msgRes.status).toBe(201);
    
    // 2. Dentist receives message (via Socket.IO)
    // Mock Socket.IO client here
    
    // 3. Dentist sends reply
    const replyRes = await request(app)
      .post(`/v1/communications/appointments/${appointmentId}/chat/messages`)
      .send({ content: 'Hello! How can I help?' })
      .set('Authorization', `Bearer ${dentistToken}`);
    
    expect(replyRes.status).toBe(201);
    
    // 4. Fetch message history
    const historyRes = await request(app)
      .get(`/v1/communications/appointments/${appointmentId}/chat/messages`)
      .set('Authorization', `Bearer ${patientToken}`);
    
    expect(historyRes.body.messages.length).toBe(2);
  });
  ```

---

### 5. Notifications

#### Unit Tests
- [ ] **Template Rendering**
  - Test appointment reminder template
  - Test payment confirmation template
  - Test cancellation template
  - Test variables substituted correctly

- [ ] **Device Token Validation**
  - Test valid FCM token format
  - Test invalid token rejected

#### Integration Tests
- [ ] **Register Device**
  - Test device token saved
  - Test duplicate tokens updated
  - Test device linked to user

- [ ] **Update Preferences**
  - Test preferences saved per channel
  - Test defaults applied for new users

- [ ] **Send Notification**
  - Test FCM push sent
  - Test email sent via SendGrid
  - Test SMS sent via Twilio
  - Test notification job created
  - Test failed jobs retried

- [ ] **Notification History**
  - Test user sees own notifications
  - Test filtering by type
  - Test pagination works

#### E2E Tests
- [ ] **Appointment Reminder Flow**
  ```javascript
  test('Patient receives reminders for appointment', async () => {
    // 1. Register device token
    await request(app)
      .post('/v1/notifications/devices')
      .send({
        token: 'fcm-token-123',
        platform: 'android',
      })
      .set('Authorization', `Bearer ${patientToken}`);
    
    // 2. Book appointment (triggers reminder scheduling)
    const appointmentDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now
    const bookRes = await request(app)
      .post('/v1/appointments')
      .send({
        dentistId,
        clinicId,
        scheduled_time: appointmentDate.toISOString(),
        treatment_type: 'Checkup',
      })
      .set('Authorization', `Bearer ${patientToken}`);
    
    // 3. Fast-forward time to 24h before (use test clock)
    // Verify 24h reminder sent
    
    // 4. Fast-forward to 1h before
    // Verify 1h reminder sent
  });
  ```

---

## 🔒 Security Testing

### Authentication Security
- [ ] **Password Strength**
  - Test weak passwords rejected (< 8 chars)
  - Test passwords without uppercase rejected
  - Test passwords without numbers rejected

- [ ] **Rate Limiting**
  - Test login rate limit (5 req/15min)
  - Test registration rate limit
  - Test OTP rate limit

- [ ] **Token Security**
  - Test expired tokens rejected
  - Test tampered tokens rejected
  - Test tokens validated on every request

### Authorization Tests
- [ ] **Role-Based Access**
  - Test patient can't access dentist routes
  - Test dentist can't access admin routes
  - Test users only see own data

- [ ] **Resource Ownership**
  - Test patient can't view others' appointments
  - Test patient can't cancel others' appointments
  - Test patient can't refund others' payments

### Input Validation
- [ ] **SQL Injection Prevention**
  - Test malicious SQL in inputs (Prisma protects)
  - Test parameterized queries used

- [ ] **XSS Prevention**
  - Test script tags stripped from messages
  - Test event handlers removed from inputs

- [ ] **CSRF Protection**
  - Test CSRF token required for state-changing operations

---

## 📈 Performance Testing

### Load Tests
- [ ] **Concurrent Users**
  - Test 100 concurrent logins
  - Test 50 concurrent appointment bookings
  - Test 100 concurrent chat messages

- [ ] **Response Time**
  - Test API responds < 200ms p95
  - Test database queries < 50ms p95

- [ ] **Throughput**
  - Test handles 1000 req/min
  - Test handles 10,000 req/hour

### Stress Tests
- [ ] **Database Connections**
  - Test connection pool handling
  - Test connection timeout recovery

- [ ] **Memory Leaks**
  - Test long-running server (24 hours)
  - Test memory usage stable

---

## 🧪 Test Data Management

### Seed Data for Testing
```javascript
// backend/tests/seed.js
async function seedTestData() {
  // Create test clinic
  const clinic = await prisma.clinic.create({
    data: {
      name: 'Test Clinic',
      address: 'Test Address',
      phone_number: '+628111111111',
    },
  });

  // Create test dentist
  const dentist = await prisma.user.create({
    data: {
      name: 'Dr. Test Dentist',
      email: 'dentist@test.com',
      password_hash: await bcrypt.hash('TestPass123', 10),
      roles: ['dentist'],
      dentistProfile: {
        create: {
          specialty: 'General',
          experience_years: 5,
          verification_status: 'verified',
        },
      },
    },
  });

  // Create test patient
  const patient = await prisma.user.create({
    data: {
      name: 'Test Patient',
      email: 'patient@test.com',
      password_hash: await bcrypt.hash('TestPass123', 10),
      roles: ['patient'],
      patientProfile: {
        create: {
          dateOfBirth: new Date('1990-01-01'),
          gender: 'male',
        },
      },
    },
  });

  return { clinic, dentist, patient };
}
```

### Cleanup After Tests
```javascript
afterEach(async () => {
  // Clean up test data
  await prisma.appointment.deleteMany({ where: { id: { startsWith: 'test-' } } });
  await prisma.paymentIntent.deleteMany({ where: { id: { startsWith: 'test-' } } });
  await prisma.chatMessage.deleteMany({ where: { id: { startsWith: 'test-' } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## 📊 Test Execution Plan

### Week 1: Authentication Tests
```bash
# Run all auth tests
npm test -- --testPathPattern=auth

# Coverage report
npm test -- --coverage --testPathPattern=auth
```
**Target:** 90% coverage for auth module

### Week 2: Appointments & Payments Tests
```bash
npm test -- --testPathPattern=appointments
npm test -- --testPathPattern=payments
```
**Target:** 85% coverage for business logic

### Week 3: Communications & Notifications Tests
```bash
npm test -- --testPathPattern=communications
npm test -- --testPathPattern=notifications
```
**Target:** 80% coverage for real-time features

### Continuous Testing
```bash
# Run all tests before every commit
npm test

# Run tests in watch mode during development
npm test -- --watch

# Run only changed tests
npm test -- --onlyChanged
```

---

## ✅ Test Coverage Requirements

### Critical Paths (90%+ coverage required)
- Authentication (login, registration, OTP)
- Payment processing
- Appointment booking
- Authorization checks

### Important Features (80%+ coverage required)
- Chat messaging
- Notifications
- Profile management
- File uploads

### Nice-to-Have (70%+ coverage required)
- Analytics endpoints
- Admin features
- Reporting

---

## 🚀 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Backend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run migrations
        run: |
          cd backend
          npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/sereneai_test
      
      - name: Run tests
        run: |
          cd backend
          npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/sereneai_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
```

---

## ✅ Sign-Off Criteria

Before approving mobile development start, ensure:

- [ ] **Unit Tests:** 60%+ coverage achieved
- [ ] **Integration Tests:** 30%+ coverage achieved
- [ ] **E2E Tests:** 10%+ coverage achieved
- [ ] **Overall Coverage:** 80%+ for critical paths
- [ ] **All Tests Passing:** 100% success rate on staging
- [ ] **Performance:** API response time < 200ms p95
- [ ] **Security:** All security tests passing
- [ ] **CI/CD:** Automated tests running on every commit

---

**Last Updated:** November 10, 2025  
**Status:** Use this plan to validate backend quality  
**Contact:** QA Lead
