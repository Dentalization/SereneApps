# 📋 API Implementation Plan - Before Staging Deployment

**Date:** November 10, 2025  
**Status:** Planning Phase  
**Goal:** Complete core endpoints before mobile team integration

---

## 🎯 **Priority Overview**

Kita fokus pada **user journey dari booking appointment** sebagai flow utama:

```
Patient Login → Lihat Dentist/Clinic → Book Appointment → Chat dengan Clinic → Terima Notifikasi
```

**Payment akan ditunda** karena fokus kita adalah memastikan booking flow berjalan sempurna dulu.

---

## ✅ **Already Completed**

- ✅ **Authentication** (Phase 2)
  - Patient registration
  - Login with JWT
  - OTP verification (phone/email)
  - Token refresh
  - Role-based authentication

- ✅ **Infrastructure** (Phase 3)
  - Error code system (40+ codes)
  - Swagger documentation
  - Mobile translations
  - Testing framework

---

## 🚀 **Implementation Plan**

### **Phase 4: Core Endpoints (This Session)**

Prioritas berdasarkan user journey:

#### **Priority 1: Clinic & Dentist Endpoints** ⭐⭐⭐
> **Why:** Mobile app perlu menampilkan list clinic dan dentist untuk dipilih patient

**Endpoints:**
- `GET /v1/clinics` - List all clinics dengan pagination, filter, search
- `GET /v1/clinics/:id` - Detail clinic (alamat, jam buka, facilities, rating)
- `GET /v1/clinics/:id/dentists` - List dentists di clinic tersebut
- `GET /v1/dentists/:id` - Detail dentist (profile, specialization, availability)
- `GET /v1/dentists/:id/schedule` - Jadwal availability dentist
- `GET /v1/clinics/:id/services` - List layanan clinic dengan harga

**Database:** ✅ Already exists
- `clinic_profiles` table
- `dentist_profiles` table
- `clinic_staff` linking table
- Seed data sudah ada

**Estimation:** 4-6 hours

---

#### **Priority 2: Appointment Endpoints** ⭐⭐⭐
> **Why:** Core feature - patient booking appointment dengan dentist

**Endpoints:**
- `POST /v1/appointments` - Book new appointment
- `GET /v1/appointments` - List patient's appointments (upcoming, past, cancelled)
- `GET /v1/appointments/:id` - Appointment details
- `PATCH /v1/appointments/:id` - Reschedule appointment
- `DELETE /v1/appointments/:id` - Cancel appointment
- `PATCH /v1/appointments/:id/confirm` - Confirm appointment (staff only)
- `GET /v1/appointments/:id/available-slots` - Available time slots untuk reschedule

**Database:** ✅ Already exists
- `appointments` table
- `appointment_history` table

**Business Logic:**
- Validate appointment time (working hours, not in past)
- Check dentist availability (no double booking)
- Auto-generate appointment history on status change
- Send notification on booking/cancel/reschedule

**Estimation:** 6-8 hours

---

#### **Priority 3: Profile Endpoints** ⭐⭐
> **Why:** Patient perlu bisa update profile, medical history, emergency contact

**Endpoints:**
- `GET /v1/profile` - Get patient profile
- `PATCH /v1/profile` - Update basic profile (name, phone, address)
- `PATCH /v1/profile/medical` - Update medical history
- `PATCH /v1/profile/emergency` - Update emergency contact
- `PATCH /v1/profile/insurance` - Update insurance info
- `POST /v1/profile/avatar` - Upload profile picture
- `GET /v1/profile/appointments` - Patient's appointment history

**Database:** ✅ Already exists
- `patient_profiles` table
- `users` table

**Estimation:** 3-4 hours

---

#### **Priority 4: Notifications Endpoints** ⭐⭐
> **Why:** Patient perlu terima notifikasi untuk appointment reminders, confirmations, updates

**Endpoints:**
- `POST /v1/notifications/device` - Register device token (FCM)
- `DELETE /v1/notifications/device` - Unregister device
- `GET /v1/notifications` - List notifications dengan pagination
- `PATCH /v1/notifications/:id/read` - Mark as read
- `PATCH /v1/notifications/read-all` - Mark all as read
- `GET /v1/notifications/unread-count` - Get unread count

**Database:** ✅ Already exists
- `notifications` table
- `notification_devices` table

**Integration:**
- Firebase Cloud Messaging (FCM) untuk push notifications
- Email notifications (SendGrid) - optional
- SMS notifications (Twilio) - optional

**Estimation:** 4-5 hours

---

#### **Priority 5: Communications (Chat)** ⭐
> **Why:** Patient bisa chat dengan clinic untuk tanya-tanya sebelum/sesudah appointment

**Endpoints:**
- `GET /v1/chat/rooms` - List chat rooms
- `POST /v1/chat/rooms` - Create chat room (patient → clinic)
- `GET /v1/chat/rooms/:id` - Chat room details
- `GET /v1/chat/rooms/:id/messages` - Get messages dengan pagination
- `POST /v1/chat/rooms/:id/messages` - Send message
- `PATCH /v1/chat/messages/:id/read` - Mark message as read
- `POST /v1/chat/rooms/:id/typing` - Typing indicator
- `POST /v1/chat/messages/:id/files` - Upload file/image

**WebSocket Events:**
- `message:new` - New message received
- `message:read` - Message read by recipient
- `user:typing` - User is typing
- `user:online` - User online status

**Database:** ✅ Already exists
- `chat_rooms` table
- `chat_room_members` table
- `chat_messages` table
- `chat_message_files` table

**Integration:**
- Socket.io untuk real-time messaging
- File upload ke `/uploads/chat/`

**Estimation:** 8-10 hours

---

## 📊 **Total Estimation**

| Priority | Module | Endpoints | Estimation | Status |
|----------|--------|-----------|------------|--------|
| ⭐⭐⭐ | Clinic & Dentist | 6 endpoints | 4-6 hours | 🔴 Not Started |
| ⭐⭐⭐ | Appointments | 7 endpoints | 6-8 hours | 🔴 Not Started |
| ⭐⭐ | Profile | 7 endpoints | 3-4 hours | 🔴 Not Started |
| ⭐⭐ | Notifications | 6 endpoints | 4-5 hours | 🔴 Not Started |
| ⭐ | Communications | 8 endpoints | 8-10 hours | 🔴 Not Started |

**Total:** 34 endpoints, 25-33 hours (~3-4 work days)

---

## 🎯 **Recommended Approach**

### **Option 1: Complete All Before Staging** (Recommended)
**Pros:**
- Mobile team gets complete API dari awal
- Semua user journey bisa ditest end-to-end
- Tidak perlu multiple staging deployments

**Cons:**
- Delay staging deployment 3-4 hari
- Mobile team harus tunggu

**Timeline:**
- Day 1: Clinic & Dentist + Appointments (10-14 hours)
- Day 2: Profile + Notifications (7-9 hours)
- Day 3: Communications (Chat) (8-10 hours)
- Day 4: Testing, bug fixes, documentation
- Day 5: Deploy to staging

---

### **Option 2: Phased Deployment**
**Pros:**
- Mobile team bisa mulai develop lebih cepat
- Faster feedback loop

**Cons:**
- Multiple deployments
- Mobile team perlu adjust ketika ada endpoint baru

**Timeline:**
- **Phase 4A (Deploy 1):** Clinic & Dentist + Appointments
  - Mobile team bisa develop: clinic list, dentist list, booking flow
- **Phase 4B (Deploy 2):** Profile + Notifications
  - Mobile team bisa develop: profile screen, notifications
- **Phase 4C (Deploy 3):** Communications
  - Mobile team bisa develop: chat feature

---

## 💡 **My Recommendation**

**Go with Option 1: Complete All Before Staging**

**Alasan:**
1. **User journey lebih complete** - Mobile team bisa develop full booking flow
2. **Lebih efficient** - 1x deployment vs 3x deployment
3. **Better testing** - Kita bisa test semua interaction antar module
4. **Documentation lebih complete** - Swagger UI langsung lengkap

**Yang bisa dilakukan mobile team sambil nunggu:**
- Setup project structure
- Implement translation files (sudah ready)
- Design UI screens
- Setup navigation
- Implement error handling (error codes sudah ready)

---

## 🚀 **Implementation Order (Recommended)**

Jika kita pilih Option 1, ini urutan implementasinya:

### **Session 1: Clinic & Dentist APIs (4-6 hours)**

1. **Create routes & controllers:**
   - `backend/src/routes/clinics.js`
   - `backend/src/routes/dentists.js`
   - `backend/src/controllers/clinicsController.js`
   - `backend/src/controllers/dentistsController.js`

2. **Implement endpoints:**
   - List clinics dengan filter (location, services, rating)
   - Clinic details dengan dentist list
   - Dentist profile dengan specialization
   - Dentist schedule/availability

3. **Add Swagger documentation:**
   - `backend/src/docs/clinics.swagger.js`
   - `backend/src/docs/dentists.swagger.js`

4. **Test & validate:**
   - Test all endpoints
   - Update Swagger UI
   - Add to error codes if needed

---

### **Session 2: Appointments APIs (6-8 hours)**

1. **Create routes & controllers:**
   - `backend/src/routes/appointments.js`
   - `backend/src/controllers/appointmentsController.js`

2. **Implement business logic:**
   - Validation: time slots, working hours, no double booking
   - Create appointment dengan auto-history
   - Reschedule dengan availability check
   - Cancel appointment dengan reason
   - Status transitions (pending → confirmed → completed → cancelled)

3. **Add Swagger documentation:**
   - `backend/src/docs/appointments.swagger.js`

4. **Test scenarios:**
   - Book appointment
   - Reschedule appointment
   - Cancel appointment
   - View appointment history

---

### **Session 3: Profile APIs (3-4 hours)**

1. **Create routes & controllers:**
   - `backend/src/routes/profile.js`
   - `backend/src/controllers/profileController.js`

2. **Implement endpoints:**
   - Get patient profile (join users + patient_profiles)
   - Update basic info
   - Update medical history (JSON field)
   - Update emergency contact (JSON field)
   - Update insurance info (JSON field)
   - Upload avatar (multer)

3. **Add Swagger documentation:**
   - `backend/src/docs/profile.swagger.js`

---

### **Session 4: Notifications APIs (4-5 hours)**

1. **Create routes & controllers:**
   - `backend/src/routes/notifications.js`
   - `backend/src/controllers/notificationsController.js`

2. **Setup Firebase Admin SDK:**
   - `backend/src/services/firebaseService.js`
   - Initialize Firebase Admin
   - Send push notifications helper

3. **Implement endpoints:**
   - Register FCM device token
   - List notifications dengan pagination
   - Mark as read (single/all)
   - Unread count

4. **Create notification triggers:**
   - Appointment booked → notify clinic & patient
   - Appointment confirmed → notify patient
   - Appointment reminder (1 day before)
   - Message received → notify recipient

5. **Add Swagger documentation:**
   - `backend/src/docs/notifications.swagger.js`

---

### **Session 5: Communications (Chat) APIs (8-10 hours)**

1. **Setup Socket.io:**
   - `backend/src/sockets/chatSocket.js`
   - Initialize Socket.io server
   - JWT authentication for WebSocket

2. **Create routes & controllers:**
   - `backend/src/routes/chat.js`
   - `backend/src/controllers/chatController.js`

3. **Implement REST endpoints:**
   - List chat rooms
   - Create chat room (patient → clinic)
   - Get messages dengan pagination
   - Send message
   - Mark as read
   - Upload files (multer)

4. **Implement WebSocket events:**
   - `message:new` - Real-time message delivery
   - `message:read` - Read receipts
   - `user:typing` - Typing indicators
   - `user:online` - Online status

5. **Add Swagger documentation:**
   - `backend/src/docs/chat.swagger.js`

---

### **Session 6: Integration Testing (Full Day)**

1. **End-to-end scenarios:**
   - Patient register → login → view clinics → book appointment → receive notification → chat dengan clinic

2. **Update documentation:**
   - Update Swagger UI dengan semua endpoints
   - Update mobile translations jika ada yang kurang
   - Update error codes jika ada yang baru

3. **Performance testing:**
   - Load test untuk list endpoints
   - WebSocket stress testing

4. **Security review:**
   - Check authorization di semua endpoints
   - Validate input sanitization
   - Rate limiting untuk sensitive endpoints

---

## 📝 **Database Verification**

Verify semua tables sudah ada:

```sql
-- Already exists ✅
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- ✅ users
-- ✅ patient_profiles
-- ✅ dentist_profiles
-- ✅ clinic_profiles
-- ✅ clinic_staff
-- ✅ appointments
-- ✅ appointment_history
-- ✅ notifications
-- ✅ notification_devices
-- ✅ chat_rooms
-- ✅ chat_room_members
-- ✅ chat_messages
-- ✅ chat_message_files
```

**Database Status:** ✅ All tables ready dari migrations

---

## 🎯 **Success Criteria**

Sebelum deploy ke staging, harus memenuhi:

- ✅ 34 endpoints implemented dan tested
- ✅ Swagger documentation complete untuk semua endpoints
- ✅ All endpoints memiliki proper error handling
- ✅ Authorization middleware di semua protected routes
- ✅ Input validation dengan Zod
- ✅ Rate limiting pada sensitive endpoints
- ✅ WebSocket authentication working
- ✅ File upload working (avatars, chat files)
- ✅ Notifications triggered correctly
- ✅ End-to-end booking flow tested

---

## 📱 **Mobile Team Handoff (After Completion)**

Setelah semua endpoints ready, mobile team akan terima:

1. **Complete Swagger UI** dengan 34+ endpoints
2. **Updated translations** (jika ada penambahan)
3. **WebSocket documentation** untuk real-time chat
4. **Test credentials** untuk semua user roles
5. **Sample booking flow** documentation
6. **Postman collection** updated dengan semua endpoints

---

## 🚀 **Kesimpulan**

**Pilihan Anda:**

**A) Complete All Now (Option 1)** - 3-4 hari work
- Mobile team dapat complete API
- Deploy 1x ke staging
- Better testing & documentation

**B) Phased Approach (Option 2)** - Deploy bertahap
- Deploy 1: Clinic + Dentist + Appointments (2 hari)
- Deploy 2: Profile + Notifications (1 hari)
- Deploy 3: Communications (1-2 hari)

**C) Minimal Viable Product (Quick Option)**
- Deploy cuma Clinic + Dentist + Appointments (2 hari)
- Mobile team bisa mulai develop booking flow
- Profile, Notifications, Chat di-deploy belakangan

---

**Mana yang Anda pilih?** 🤔

Atau mau saya mulai langsung dengan **Session 1 (Clinic & Dentist APIs)** supaya kita bisa move fast?
