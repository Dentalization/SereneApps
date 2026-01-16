# 🗓️ Mobile Patient App - Development Roadmap

## 📊 Timeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         6-WEEK ROADMAP                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHASE 1: BACKEND PREPARATION (Weeks 1-3)                               │
│  ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│                                                                          │
│  PHASE 2: MOBILE DEVELOPMENT (Weeks 2-6, parallel after Week 2)         │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████████████         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PHASE 1: Backend Preparation (Weeks 1-3)

### Week 1: Authentication & Security 🔐

#### Backend Team (15-20 hours)
```
┌────────────────────────────────────────┐
│ 🔴 CRITICAL BLOCKERS                   │
├────────────────────────────────────────┤
│ □ OTP Verification              (6h)   │
│   ├─ Phone OTP with Twilio            │
│   ├─ Email OTP with SendGrid          │
│   └─ Verification endpoints           │
│                                        │
│ □ Password Reset Flow          (4h)   │
│   ├─ Forgot password endpoint         │
│   ├─ Reset token generation           │
│   └─ Password update with token       │
│                                        │
│ □ Email Verification           (3h)   │
│   ├─ Send verification email          │
│   ├─ Verify token endpoint            │
│   └─ Resend verification              │
│                                        │
│ □ Rate Limiting                (3h)   │
│   ├─ Install express-rate-limit       │
│   ├─ Configure per-route limits       │
│   └─ Redis store for distributed      │
│                                        │
│ □ Input Validation             (4h)   │
│   ├─ Install Zod/Joi                  │
│   ├─ Create validation schemas        │
│   └─ Apply to all endpoints           │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ `POST /v1/auth/verify-phone` - Send OTP via SMS
- ✅ `POST /v1/auth/verify-phone/confirm` - Confirm phone OTP
- ✅ `POST /v1/auth/verify-email` - Send verification email
- ✅ `POST /v1/auth/verify-email/confirm` - Confirm email verification
- ✅ `POST /v1/auth/forgot-password` - Request password reset
- ✅ `POST /v1/auth/reset-password` - Reset password with token
- ✅ Rate limiting: 5 req/min for auth endpoints, 100 req/min general
- ✅ Validation schemas for all patient-facing endpoints

---

### Week 2: Payments & Infrastructure ☁️

#### Backend Team (20-25 hours)
```
┌────────────────────────────────────────┐
│ 🔴 CRITICAL BLOCKERS                   │
├────────────────────────────────────────┤
│ □ Refund API                   (5h)   │
│   ├─ Midtrans refund integration      │
│   ├─ Refund validation logic          │
│   └─ Update payment status            │
│                                        │
│ □ Payment History              (3h)   │
│   ├─ GET /v1/payments endpoint        │
│   ├─ Pagination & filters             │
│   └─ Include appointment details      │
│                                        │
│ □ Receipt Generation           (6h)   │
│   ├─ Install pdfkit/puppeteer         │
│   ├─ Design receipt template          │
│   └─ Generate & email receipt         │
│                                        │
│ □ Production Payment Setup     (4h)   │
│   ├─ Midtrans production account      │
│   ├─ Configure payment methods        │
│   └─ Test all payment flows           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ☁️  INFRASTRUCTURE                     │
├────────────────────────────────────────┤
│ □ Cloud Storage Setup          (6h)   │
│   ├─ AWS S3 / GCS bucket              │
│   ├─ Install @aws-sdk/client-s3       │
│   ├─ Migrate upload endpoints         │
│   └─ Update file URL generation       │
│                                        │
│ □ CDN Configuration            (3h)   │
│   ├─ CloudFront / Cloudflare          │
│   ├─ Configure cache rules            │
│   └─ Update media URLs                │
└────────────────────────────────────────┘
```

#### DevOps Team (10-15 hours)
```
┌────────────────────────────────────────┐
│ 🚀 DEPLOYMENT                          │
├────────────────────────────────────────┤
│ □ Staging Environment          (8h)   │
│   ├─ Deploy to Railway/Heroku         │
│   ├─ Setup PostgreSQL database        │
│   ├─ Configure environment vars       │
│   └─ Run migrations                   │
│                                        │
│ □ Monitoring Setup             (7h)   │
│   ├─ Sentry error tracking            │
│   ├─ DataDog/New Relic APM            │
│   ├─ Setup alerts (Slack/email)       │
│   └─ Create dashboard                 │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ `POST /v1/payments/:id/refund` - Refund endpoint
- ✅ `GET /v1/payments?userId=...` - Payment history
- ✅ PDF receipt generation after payment
- ✅ Midtrans production configured
- ✅ S3/GCS bucket for file uploads
- ✅ CDN serving media files
- ✅ Staging environment at `staging.sereneai.id`
- ✅ Sentry + monitoring dashboard live

---

### Week 3: Documentation & Mobile Prep 📚

#### Backend Team (15-20 hours)
```
┌────────────────────────────────────────┐
│ 📄 DOCUMENTATION                       │
├────────────────────────────────────────┤
│ □ OpenAPI/Swagger              (8h)   │
│   ├─ Install swagger-jsdoc            │
│   ├─ Annotate all endpoints           │
│   ├─ Generate swagger.json            │
│   └─ Host Swagger UI at /docs         │
│                                        │
│ □ Error Code Reference         (3h)   │
│   ├─ Document all error codes         │
│   ├─ Add descriptions & solutions     │
│   └─ Publish in Swagger UI            │
│                                        │
│ □ Mobile Translation Package   (4h)   │
│   ├─ Extract from id2.js/en2.js       │
│   ├─ Create @sereneai/translations    │
│   └─ Publish to npm/private registry  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📱 MOBILE-SPECIFIC APIs                │
├────────────────────────────────────────┤
│ □ App Version Check            (2h)   │
│   ├─ GET /v1/app/version              │
│   ├─ Return min/current versions      │
│   └─ Force update flag                │
│                                        │
│ □ Notification Production      (3h)   │
│   ├─ FCM production credentials       │
│   ├─ SendGrid verified domain         │
│   └─ Twilio production account        │
│                                        │
│ □ Appointment Reminders        (5h)   │
│   ├─ Install BullMQ                   │
│   ├─ Schedule reminder jobs           │
│   └─ Send 24h + 1h before             │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Swagger UI at `staging.sereneai.id/docs`
- ✅ Complete error code documentation
- ✅ `@sereneai/translations` npm package
- ✅ `GET /v1/app/version` endpoint
- ✅ Production notification credentials
- ✅ Automated appointment reminders

---

## 🚀 PHASE 2: Mobile Development (Weeks 2-6)

### Week 2: Project Setup & Design System 🎨

#### Mobile Team (15-20 hours)
```
┌────────────────────────────────────────┐
│ 🏗️  PROJECT SETUP                      │
├────────────────────────────────────────┤
│ □ Tech Stack Setup             (6h)   │
│   ├─ Create React Native project     │
│   ├─ Install Zustand (state mgmt)    │
│   ├─ Install React Navigation         │
│   └─ Setup folder structure           │
│                                        │
│ □ Design System                (8h)   │
│   ├─ Extract Tailwind tokens          │
│   ├─ Create theme.ts                  │
│   ├─ Build core components            │
│   │   ├─ Button, Input, Card          │
│   │   ├─ Typography, Icons            │
│   │   └─ Layout components            │
│   └─ Storybook/showcase app           │
│                                        │
│ □ API Client Setup             (4h)   │
│   ├─ Install Axios                    │
│   ├─ Create API service layer         │
│   ├─ Setup interceptors (auth)        │
│   └─ Test against staging             │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ React Native project scaffolded
- ✅ Design system with 20+ components
- ✅ API client connected to staging
- ✅ Navigation structure defined

---

### Week 3: Authentication & Onboarding 🔐

#### Mobile Team (20-25 hours)
```
┌────────────────────────────────────────┐
│ 👤 USER STORY: PAT-001 (Onboarding)   │
├────────────────────────────────────────┤
│ □ Splash & Intro Screens       (4h)   │
│   ├─ Splash animation                 │
│   ├─ Onboarding carousel (3 slides)   │
│   └─ Skip/next navigation             │
│                                        │
│ □ Patient Registration         (8h)   │
│   ├─ Phone/email input screen         │
│   ├─ OTP verification screen          │
│   ├─ Password creation                │
│   ├─ Profile completion               │
│   │   ├─ Name, DOB, gender            │
│   │   ├─ Insurance (optional)         │
│   │   └─ Emergency contact            │
│   └─ Avatar upload                    │
│                                        │
│ □ Login & Auth Flow            (6h)   │
│   ├─ Login screen                     │
│   ├─ Forgot password flow             │
│   ├─ Biometric prompt (iOS/Android)   │
│   ├─ Secure token storage             │
│   └─ Auto-refresh tokens              │
│                                        │
│ □ State Management             (4h)   │
│   ├─ Auth store (Zustand)             │
│   ├─ User profile store               │
│   └─ Persistent auth state            │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Complete onboarding flow (PAT-001)
- ✅ Patient can register with OTP
- ✅ Patient can login with biometric
- ✅ Profile management screen

---

### Week 4: Dentist Search & Booking 🔍

#### Mobile Team (25-30 hours)
```
┌────────────────────────────────────────┐
│ 🔎 USER STORY: PAT-002 (Browse)       │
├────────────────────────────────────────┤
│ □ Home Screen                  (5h)   │
│   ├─ Search bar                       │
│   ├─ Featured dentists                │
│   ├─ Nearby clinics                   │
│   └─ Categories (general, ortho, etc) │
│                                        │
│ □ Dentist List & Filters       (8h)   │
│   ├─ List with pagination             │
│   ├─ Filter by specialty              │
│   ├─ Filter by location (maps)        │
│   ├─ Filter by availability           │
│   ├─ Sort by rating/price/distance    │
│   └─ Search functionality             │
│                                        │
│ □ Dentist Profile              (6h)   │
│   ├─ Avatar, name, specialty          │
│   ├─ Ratings & reviews                │
│   ├─ Experience & education           │
│   ├─ Available time slots             │
│   └─ Clinic location (map)            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📅 USER STORY: PAT-003 (Book)          │
├────────────────────────────────────────┤
│ □ Appointment Booking          (10h)  │
│   ├─ Select date (calendar)           │
│   ├─ Select time slot                 │
│   ├─ Check availability API           │
│   ├─ Treatment type selection         │
│   ├─ Add notes for dentist            │
│   ├─ Booking summary                  │
│   ├─ Conflict detection               │
│   └─ Success confirmation             │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Dentist browsing (PAT-002)
- ✅ Appointment booking (PAT-003)
- ✅ Calendar integration
- ✅ Map view for clinics

---

### Week 5: Payments & Appointment Management 💳

#### Mobile Team (25-30 hours)
```
┌────────────────────────────────────────┐
│ 💰 USER STORY: PAT-004 (Payments)     │
├────────────────────────────────────────┤
│ □ Payment Integration          (12h)  │
│   ├─ Midtrans SDK setup               │
│   ├─ Payment method selection         │
│   │   ├─ Credit/debit card            │
│   │   ├─ Virtual account              │
│   │   ├─ E-wallet (GoPay, OVO, etc)   │
│   │   └─ QRIS                          │
│   ├─ Payment processing screen        │
│   ├─ Payment confirmation             │
│   ├─ Receipt display                  │
│   └─ Payment history                  │
│                                        │
│ □ Error Handling               (4h)   │
│   ├─ Payment failed scenarios         │
│   ├─ Retry logic                      │
│   └─ Support contact                  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 📋 USER STORY: PAT-005 (Management)   │
├────────────────────────────────────────┤
│ □ Appointment List             (5h)   │
│   ├─ Upcoming appointments            │
│   ├─ Past appointments                │
│   ├─ Cancelled appointments           │
│   └─ Pull-to-refresh                  │
│                                        │
│ □ Appointment Details          (4h)   │
│   ├─ Dentist info                     │
│   ├─ Date, time, location             │
│   ├─ Treatment type                   │
│   ├─ Payment status                   │
│   └─ Notes                            │
│                                        │
│ □ Reschedule & Cancel          (6h)   │
│   ├─ Reschedule flow (calendar)       │
│   ├─ 24h cutoff validation            │
│   ├─ Cancel with reason               │
│   └─ Confirmation dialogs             │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Payment integration (PAT-004)
- ✅ Appointment management (PAT-005)
- ✅ Reschedule/cancel functionality
- ✅ Payment history screen

---

### Week 6: Communications & Polish 💬

#### Mobile Team (25-30 hours)
```
┌────────────────────────────────────────┐
│ 💬 USER STORY: PAT-006 (Teleconsult)  │
├────────────────────────────────────────┤
│ □ Chat Interface               (10h)  │
│   ├─ Socket.IO client setup           │
│   ├─ Message list (reversed)          │
│   ├─ Send message input               │
│   ├─ Image/file attachments           │
│   ├─ Typing indicators                │
│   ├─ Read receipts                    │
│   └─ Offline message queue            │
│                                        │
│ □ Video Call                   (8h)   │
│   ├─ Twilio Video SDK integration     │
│   ├─ Get video token from API         │
│   ├─ Video call UI                    │
│   ├─ Mute/unmute controls             │
│   ├─ Camera flip                      │
│   └─ End call handling                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🔔 USER STORY: PAT-007 (Notifications) │
├────────────────────────────────────────┤
│ □ Push Notifications           (6h)   │
│   ├─ FCM setup (iOS + Android)        │
│   ├─ Request permission               │
│   ├─ Register device token            │
│   ├─ Handle notification tap          │
│   ├─ Deep linking to screens          │
│   └─ Notification preferences         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🛠️  FINAL POLISH                       │
├────────────────────────────────────────┤
│ □ Profile & Settings           (5h)   │
│   ├─ View/edit profile                │
│   ├─ Change password                  │
│   ├─ Notification settings            │
│   ├─ Language selection               │
│   └─ Logout                            │
│                                        │
│ □ Error States & Loading       (4h)   │
│   ├─ Loading skeletons                │
│   ├─ Empty states                     │
│   ├─ Error screens                    │
│   └─ Retry mechanisms                 │
│                                        │
│ □ Testing & Bug Fixes          (6h)   │
│   ├─ E2E testing                      │
│   ├─ Unit tests for critical flows    │
│   ├─ Bug fixes from QA                │
│   └─ Performance optimization         │
└────────────────────────────────────────┘
```

**Deliverables:**
- ✅ Chat functionality (PAT-006)
- ✅ Video calls integrated
- ✅ Push notifications (PAT-007)
- ✅ Complete profile management
- ✅ MVP ready for beta testing

---

## 📊 Resource Allocation

### Backend Team (2 Engineers)

```
Week 1: ████████████████████████████████  40h (Auth & Security)
Week 2: ████████████████████████████████  40h (Payments & Infra)
Week 3: ████████████████████████████████  40h (Docs & Mobile APIs)
Week 4: ████████░░░░░░░░░░░░░░░░░░░░░░░░  10h (Mobile support)
Week 5: ████████░░░░░░░░░░░░░░░░░░░░░░░░  10h (Mobile support)
Week 6: ████████░░░░░░░░░░░░░░░░░░░░░░░░  10h (Mobile support)
────────────────────────────────────────
TOTAL:  150 hours
```

### Mobile Team (2 Engineers)

```
Week 1: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0h (Waiting for backend)
Week 2: ████████████████░░░░░░░░░░░░░░░░  20h (Setup & Design)
Week 3: ████████████████████████████████  40h (Auth & Onboarding)
Week 4: ████████████████████████████████  40h (Browse & Book)
Week 5: ████████████████████████████████  40h (Payments & Mgmt)
Week 6: ████████████████████████████████  40h (Comms & Polish)
────────────────────────────────────────
TOTAL:  180 hours
```

### DevOps Team (1 Engineer)

```
Week 1: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0h
Week 2: ████████████████████████████████  16h (Staging + Monitoring)
Week 3: ████████░░░░░░░░░░░░░░░░░░░░░░░░   4h (CI/CD setup)
Week 4: ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2h (Support)
Week 5: ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2h (Support)
Week 6: ████████░░░░░░░░░░░░░░░░░░░░░░░░   4h (Production prep)
────────────────────────────────────────
TOTAL:  28 hours
```

### QA Team (1 Engineer)

```
Week 1: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0h
Week 2: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0h
Week 3: ████████████████░░░░░░░░░░░░░░░░   8h (Staging API testing)
Week 4: ████████████████████████░░░░░░░░  12h (Mobile testing)
Week 5: ████████████████████████░░░░░░░░  12h (Mobile testing)
Week 6: ████████████████████████████████  16h (Full regression)
────────────────────────────────────────
TOTAL:  48 hours
```

---

## 🎯 Milestones & Gates

### ✅ Milestone 1: Backend Ready (End of Week 2)
**Gate Criteria:**
- [ ] All 🔴 CRITICAL authentication items complete
- [ ] Staging environment deployed and accessible
- [ ] Payment refund/history APIs working
- [ ] Cloud storage configured
- [ ] Monitoring dashboard live

**Decision Point:** GO/NO-GO for mobile development start

---

### ✅ Milestone 2: Documentation Complete (End of Week 3)
**Gate Criteria:**
- [ ] Swagger UI accessible at `/docs`
- [ ] All endpoints documented with examples
- [ ] Mobile translation package published
- [ ] Appointment reminders automated
- [ ] Production notification credentials configured

**Decision Point:** Full mobile team can onboard

---

### ✅ Milestone 3: Core User Journeys (End of Week 4)
**Gate Criteria:**
- [ ] Patient can register and login (PAT-001)
- [ ] Patient can browse dentists (PAT-002)
- [ ] Patient can book appointment (PAT-003)
- [ ] All screens tested on iOS and Android
- [ ] No critical bugs

**Decision Point:** Continue to payments or pivot

---

### ✅ Milestone 4: Payments Integrated (End of Week 5)
**Gate Criteria:**
- [ ] Patient can pay for appointment (PAT-004)
- [ ] Patient can view payment history
- [ ] Patient can reschedule/cancel (PAT-005)
- [ ] Refund flow tested
- [ ] Payment receipts generated

**Decision Point:** Ready for beta testing or need more work

---

### ✅ Milestone 5: MVP Complete (End of Week 6)
**Gate Criteria:**
- [ ] All 8 user stories (PAT-001 to PAT-008) complete
- [ ] Chat and video calls working (PAT-006)
- [ ] Push notifications working (PAT-007)
- [ ] E2E tests passing
- [ ] Performance benchmarks met (<3s load time)
- [ ] Crash-free rate >99%

**Decision Point:** GO for beta launch

---

## 📈 Success Metrics

### Development Metrics
- **Velocity:** 40 story points per week (mobile team)
- **Code Coverage:** >70% for critical flows
- **API Response Time:** <200ms p95
- **Build Success Rate:** >95%
- **Bug Escape Rate:** <5% to production

### Product Metrics (Post-Launch)
- **User Acquisition:** 1000 patients in first 3 months
- **Booking Completion Rate:** >70%
- **Payment Success Rate:** >95%
- **App Crash Rate:** <1%
- **User Rating:** >4.0/5.0

---

## 🚨 Risk Mitigation

### HIGH RISK
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Payment provider delays | 40% | HIGH | Setup mock mode fallback, contact Midtrans early |
| Staging downtime | 30% | MEDIUM | Use Railway/Heroku with 99.9% SLA, setup monitoring |
| Twilio video issues | 25% | HIGH | Test early in Week 6, have backup (Jitsi/Whereby) |
| Mobile build failures | 20% | MEDIUM | Setup CI/CD early, test on real devices |

### MEDIUM RISK
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Design system incomplete | 35% | MEDIUM | Extract Tailwind tokens first, use web as reference |
| API changes during mobile dev | 30% | MEDIUM | Version API at /v1, create changelog |
| Notification delivery failures | 25% | LOW | Test FCM early, have email fallback |

---

## 📞 Communication Plan

### Daily Standups (15 min)
- **Time:** 9:00 AM WIB
- **Attendees:** All team members
- **Format:** What did I do? What will I do? Blockers?

### Weekly Sprint Planning (1 hour)
- **Time:** Monday 10:00 AM WIB
- **Attendees:** All team members + PM
- **Agenda:** Review last week, plan this week, assign tasks

### Bi-weekly Demo (30 min)
- **Time:** Friday 3:00 PM WIB
- **Attendees:** Team + stakeholders
- **Format:** Show completed features, gather feedback

### Ad-hoc Sync
- **Slack:** #sereneai-mobile for quick questions
- **Huddle:** As needed for debugging sessions

---

## ✅ Action Items

### This Week (Week 0)
- [ ] **PM:** Schedule kickoff meeting with all teams
- [ ] **Backend Lead:** Create JIRA tickets for all 🔴 items
- [ ] **Mobile Lead:** Setup React Native project scaffold
- [ ] **DevOps:** Research Railway/Heroku pricing
- [ ] **Everyone:** Review this roadmap and full checklist

### Next Week (Week 1)
- [ ] **Backend:** Start authentication implementation
- [ ] **Backend:** Setup rate limiting
- [ ] **Mobile:** Extract design tokens from web
- [ ] **DevOps:** Standby for staging deployment
- [ ] **QA:** Create test plan for authentication

---

**Last Updated:** November 10, 2025  
**Next Review:** End of Week 1 (Authentication Sprint)  
**Contact:** Adrian Halim (Project Lead)
