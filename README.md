# 🦷 SereneApps - Dental Care Platform

> **Monorepo** untuk aplikasi kesehatan gigi lengkap: Mobile App (Pasien), Web Dashboard (Klinik/Dokter), dan Backend API.

---

## 📁 Struktur Proyek

```
SereneApps/
├── mobile/          # 📱 React Native App (Pasien)
├── web/             # 🌐 Web Dashboard (Klinik/Admin/Dokter)
├── backend/         # ⚙️ Backend API (Node.js + PostgreSQL)
└── docs/            # 📚 Dokumentasi
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Expo CLI (untuk mobile)

### Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env dengan database credentials
npm run migrate
npm run seed
npm start
```

Backend akan berjalan di `http://localhost:4000`

### Setup Mobile App
```bash
cd mobile
npm install
npx expo start
```

Scan QR code dengan Expo Go app di smartphone Anda.

### Setup Web Dashboard
```bash
cd web
npm install
npm run dev
```

Web akan berjalan di `http://localhost:5173`

---

## 📚 Dokumentasi Penting

### Mobile App
- **Setup Guide:** `mobile/README.md`
- **Testing:** `mobile/TESTING_REGISTRATION_LOGIN.md`
- **Build Guide:** `mobile/BUILD_SUMMARY.md`
- **Roadmap:** `mobile/ROADMAP.md`

### Backend API
- **API Documentation:** Available di `http://localhost:4000/api-docs` (Swagger)
- **Patient API:** `docs/Register&Login/PATIENT_API.md`
- **Database Schema:** `docs/DATABASE_PATIENT_PROFILE.md`

### Web Dashboard
- **Setup:** `web/SETUP_INSTRUCTIONS.md`
- **Deployment:** `web/docs/RAILWAY_DEPLOYMENT.md`

### General
- **Architecture:** `docs/fullarchitecture.md`
- **Mobile API Contract:** `docs/mobile-api-contract.md`

---

## 🐛 Known Issues & Fixes

### Profile Loading Issue
**Problem:** Setelah login, profile data tidak muncul  
**Status:** 🟡 Mobile ready, backend needs implementation  
**Docs:** `docs/BACKEND_PROFILE_AUTO_CREATE.md`

**Quick Fix untuk Backend Team:**
```sql
-- Auto-create profile untuk existing users
INSERT INTO patient_profiles (user_id, preferred_language)
SELECT id, 'id' 
FROM users
WHERE id NOT IN (SELECT user_id FROM patient_profiles)
  AND 'patient' = ANY(roles);
```

Lihat detail lengkap di:
- `docs/LOGIN_PROFILE_FIX.md`
- `docs/STATUS_PROFILE_LOADING.md`
- `docs/BACKEND_PROFILE_AUTO_CREATE.md`

---

## 🏗️ Tech Stack

### Mobile
- **Framework:** React Native + Expo
- **State Management:** Redux Toolkit
- **UI Library:** React Native Paper
- **Navigation:** React Navigation

### Web
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **State Management:** Context API
- **UI Components:** Custom components

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **File Upload:** Multer
- **Documentation:** Swagger/OpenAPI

---

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/serene
JWT_SECRET=your-secret-key
PORT=4000
```

### Web (.env)
```env
VITE_API_URL=http://localhost:4000
```

### Mobile
Environment variables dikonfigurasi via `app.json` dan `babel.config.js`

---

## 📱 Features

### Mobile App (Pasien)
- ✅ Registrasi & Login
- ✅ Profile Management
- ✅ AI Diagnosis (foto gigi)
- ✅ Booking Appointment
- ✅ Cari Klinik & Dokter Gigi
- ✅ Riwayat Diagnosis
- ✅ Shop (produk kesehatan gigi)
- ✅ Notifikasi

### Web Dashboard (Klinik/Dokter)
- ✅ Dashboard Analytics
- ✅ Appointment Management
- ✅ Patient Management
- ✅ Dentist Profiles
- ✅ Clinic Settings
- ✅ Chat with Patients
- ✅ Payment Management

### Backend API
- ✅ Authentication (JWT)
- ✅ Patient Endpoints
- ✅ Dentist Endpoints
- ✅ Clinic Endpoints
- ✅ Appointment Booking
- ✅ AI Diagnosis
- ✅ Chat/Messaging
- ✅ Notifications
- ✅ File Uploads
- ✅ Payment Integration

---

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Mobile
```bash
cd mobile
# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Manual Testing
- **Patient Endpoints:** `web/test-patient-endpoints.html`
- **API Testing Guide:** `docs/API_TESTING_GUIDE.md`
- **Backend Testing Plan:** `docs/BACKEND_TESTING_PLAN.md`

---

## 🚢 Deployment

### Backend
- **Platform:** Railway / Heroku
- **Guide:** `web/docs/RAILWAY_DEPLOYMENT.md`
- **Checklist:** `docs/DEPLOYMENT_CHECKLIST.md`

### Web
- **Platform:** Vercel / Netlify
- **Build:** `cd web && npm run build`

### Mobile
- **iOS:** `cd mobile && eas build --platform ios`
- **Android:** `cd mobile && eas build --platform android`
- **Guide:** `mobile/BUILD_SUMMARY.md`

---

## 👥 Team

- **Mobile Developer:** Adrian Halim
- **Backend Team:** [Backend Team]
- **Web Team:** [Web Team]

---

## 📞 Support

Untuk pertanyaan atau issue:
1. Check dokumentasi di folder `docs/`
2. Baca `docs/QUICK_REFERENCE.md` untuk troubleshooting
3. Contact: care@serene.id

---

## 📝 Recent Updates

**November 19, 2025:**
- ✅ Merged SereneAI-Web, backend, dan mobile jadi 1 monorepo
- ✅ Fixed login flow - auto fetch patient profile after login
- ✅ Added data transformation (snake_case → camelCase)
- ⏳ Waiting: Backend implement auto-create patient profile

Lihat detail di `docs/STATUS_PROFILE_LOADING.md`

---

## 📜 License

Proprietary - © 2025 Serene Dental Care

