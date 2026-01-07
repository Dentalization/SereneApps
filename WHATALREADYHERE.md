# 🦷 SereneApps - Gambaran Sistem & Fitur Terintegrasi

> **Dokumentasi Lengkap** tentang apa yang sudah dibangun di platform SereneApps Dental Care

---

## 📋 Ringkasan Eksekutif

**SereneApps** adalah platform kesehatan gigi lengkap (Full-Stack Dental Care Platform) yang terdiri dari 3 komponen utama:

| Komponen | Teknologi | Target Pengguna |
|----------|-----------|-----------------|
| **Mobile App** | React Native + Expo | Pasien |
| **Web Dashboard** | React + Vite + TailwindCSS | Klinik, Dokter, Admin |
| **Backend API** | Node.js + Express + PostgreSQL | Server/API |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────┬───────────────────────────────────┤
│   📱 Mobile App (Pasien)    │   🌐 Web Dashboard (Klinik/Admin)  │
│   React Native + Expo       │   React + Vite + TailwindCSS      │
│   Port: Expo Go / Build     │   Port: 5173 (dev)                │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ⚙️ BACKEND API                              │
│              Node.js + Express + PostgreSQL                      │
│                      Port: 4000                                  │
├─────────────────────────────────────────────────────────────────┤
│  • Authentication (JWT + Refresh Token)                          │
│  • Appointment Management                                        │
│  • Payment Processing (Midtrans)                                 │
│  • Real-time Chat (Socket.io)                                    │
│  • Push Notifications (Firebase)                                 │
│  • OTP Services (Twilio + SendGrid)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   🤖 AI DIAGNOSIS SERVICE                        │
│              DeepDental API (Python/FastAPI)                     │
│                      Port: 8000                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📱 Mobile App (Patient-Facing)

### Tech Stack
- **Framework:** React Native dengan Expo SDK 51
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **UI Library:** React Native Paper (Material Design 3)
- **State Management:** Redux Toolkit + Redux Persist
- **HTTP Client:** Axios dengan interceptors
- **Validation:** Zod untuk runtime validation

### 5 Tab Utama

| Tab | Nama | Fitur |
|-----|------|-------|
| 🏠 | **Dashboard (Beranda)** | Welcome hero, Quick actions, Dental tips carousel, Upcoming appointment preview |
| 📅 | **Appointment (Janji)** | Browse klinik, Cari dokter, Booking jadwal, History appointment |
| 🤖 | **AI Diagnosis** | Capture foto gigi, Multi-image support, AI analysis, Risk assessment, History diagnosis |
| 🛒 | **Shop (Belanja)** | Katalog produk, Detail produk, Cart management, Checkout, Order history |
| ⚙️ | **Settings (Akun)** | Account management, Profile editing, Theme switcher, Language selection |

### Fitur Terintegrasi di Mobile

#### ✅ Authentication System
- Guest mode (akses terbatas)
- OTP-based authentication (Phone/Email)
- Full account registration
- JWT token management dengan refresh token
- Secure token storage (AsyncStorage)

#### ✅ AI Diagnosis
- Camera interface untuk capture foto gigi
- Multi-image support (3-5 foto)
- Client-side validation (size, quality)
- Real AI processing via DeepDental API
- Hasil: Findings, Detections, Annotated images, Recommendations
- Diagnosis history dengan offline support

#### ✅ Appointment Booking
- Browse dan search dental clinics
- View dentist profiles dan availability
- Date/time slot selection
- OTP verification untuk booking
- Appointment history management

#### ✅ Theme & Localization
- Light/Dark mode support
- Multi-language (ID/EN)
- Persistent settings

---

## 🌐 Web Dashboard

### Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **State Management:** Redux Toolkit
- **Routing:** React Router v6
- **Charts:** D3.js + Recharts
- **Forms:** React Hook Form
- **Animation:** Framer Motion

### Portal/Dashboard yang Tersedia

#### 1. 👨‍⚕️ Dentist Portal (`/dentist-portal`)
- **Home Dashboard** - Overview aktivitas
- **Schedule** - Kelola jadwal praktek
- **Patient Management** - Daftar pasien
- **Patient EMR** - Electronic Medical Records
- **AI Tools** - AI-assisted diagnosis
- **Teledentistry** - Video consultation
- **Practice Management** - Kelola praktek
- **Reports** - Laporan dan analytics
- **Profile & Settings** - Pengaturan akun

#### 2. 🏥 Clinic Portal (`/clinic-portal`)
- **Home Dashboard** - Overview klinik
- **Staff Management** - Kelola staff
- **Branch Management** - Multi-branch support
- **Schedule Management** - Jadwal klinik
- **Patient Records** - Data pasien
- **Inventory** - Stock management
- **Billing** - Penagihan
- **Reports** - Laporan klinik
- **Public Profile** - Profil publik klinik
- **Settings** - Pengaturan klinik

#### 3. 🔧 Admin Portal (`/admin-portal`)
- **Home Dashboard** - System overview
- **Dentist Management** - Verifikasi dokter
- **Clinic Management** - Kelola klinik
- **AI Platform** - Manage AI services
- **Content Management** - CMS
- **Revenue & Billing** - Financial management
- **Support Helpdesk** - Customer support
- **Compliance & Security** - Audit trails
- **System Administration** - System config
- **Partnership** - Manage partnerships
- **Admin Profile** - Admin settings

#### 4. 🧑‍🤝‍🧑 Patient Portal (`/patient-portal`)
- **Appointments** - View/manage appointments

---

## ⚙️ Backend API

### Tech Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Prisma
- **Authentication:** JWT (Access + Refresh tokens)
- **Real-time:** Socket.io
- **File Upload:** Multer
- **Validation:** Zod
- **Documentation:** Swagger/OpenAPI

### API Routes Terintegrasi

#### 🔐 Authentication (`/v1/auth`)
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/register` | POST | Registrasi user baru |
| `/login` | POST | Login (email/password) |
| `/me` | GET | Get current user info |
| `/refresh` | POST | Refresh access token |
| `/logout` | POST | Logout user |
| `/otp/phone` | POST | Kirim OTP ke phone |
| `/otp/email` | POST | Kirim OTP ke email |
| `/otp/verify` | POST | Verifikasi OTP |

#### 📅 Appointments (`/api/appointments`)
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/availability` | GET | Cek slot tersedia |
| `/` | POST | Buat appointment baru |
| `/` | GET | List appointments |
| `/:id` | GET | Detail appointment |
| `/:id/reschedule` | PATCH | Ubah jadwal |
| `/:id/cancel` | PATCH | Batalkan appointment |
| `/:id/confirm` | PATCH | Konfirmasi (dentist) |

#### 💳 Payments (`/api/payments`)
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/` | POST | Create payment intent |
| `/webhooks/midtrans` | POST | Handle payment webhook |

#### 👤 Profile & Patient (`/api/profile`, `/api/patient`)
- Profile management
- Patient profile CRUD
- Avatar upload

#### 🏥 Clinics & Dentists
- `/api/clinics` - Clinic listing & detail
- `/api/dentists` - Dentist profiles
- `/api/clinic-services` - Services klinik

#### 💬 Communication
- `/api/chat` - Chat messaging
- `/api/communications` - Video/Voice calls
- `/api/notifications` - Push notifications

#### 📋 EMR (Electronic Medical Records)
- `/api/emr` - Medical records management

### Services Layer

| Service | Fungsi |
|---------|--------|
| `otp.service.js` | OTP via Twilio (SMS) dan SendGrid (Email) |
| `agora.js` | Video/Voice call tokens |
| `payments/` | Payment processing & webhooks |
| `appointments/` | Appointment business logic |
| `notifications/` | Push notification via Firebase |
| `communications.js` | Chat/Video room management |
| `emrRecords.js` | Medical records handling |

---

## 🤖 AI Diagnosis Service (DeepDental)

### Endpoint yang Digunakan
| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/sessions` | POST | Buat session baru |
| `/api/v1/sessions` | GET | List history diagnosis |
| `/api/v1/images/analyze` | POST | Analisis gambar dengan AI |

### Fitur AI
- ✅ Deteksi patologi gigi (karies, plak, gingivitis, dll)
- ✅ Risk level assessment
- ✅ Affected teeth identification
- ✅ Annotated image dengan markers
- ✅ Recommendations

---

## 🔔 Notification System

### 11 Jenis Notifikasi

| # | Type | Priority | Channels |
|---|------|----------|----------|
| 1 | Appointment Confirmed | Medium | Push, Email, SMS |
| 2 | Appointment Reminder (24h) | High | Push, Email, SMS |
| 3 | Appointment Reminder (1h) | Critical | Push, Email, SMS |
| 4 | Appointment Cancelled | High | Push, Email, SMS |
| 5 | Appointment Rescheduled | High | Push, Email, SMS |
| 6 | Payment Failed | Critical | Push, Email, SMS |
| 7 | Payment Success | Medium | Push, Email |
| 8 | Chat Invite | Medium | Push, Email |
| 9 | New Chat Message | Low | Push |
| 10 | AI Diagnosis Complete | Medium | Push, Email |
| 11 | Order Status Update | Low | Push, Email |

### Channels
- **Push Notification:** Firebase Cloud Messaging
- **Email:** SendGrid
- **SMS:** Twilio

---

## 🗄️ Database Schema (PostgreSQL)

### Tabel Utama
- `users` - User accounts (all roles)
- `patient_profiles` - Patient-specific data
- `dentist_profiles` - Dentist credentials, specializations
- `clinics` - Clinic information
- `clinic_branches` - Multi-branch support
- `appointments` - Booking records
- `appointment_history` - Status change logs
- `payments` - Payment transactions
- `payment_ledger` - Financial records
- `chat_rooms` - Chat sessions
- `chat_messages` - Chat messages
- `notifications` - Notification logs
- `emr_records` - Medical records

---

## 🎨 Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Teal) | `#00BFA6` | Main brand color |
| Secondary (Blue) | `#1976D2` | Supporting actions |
| Accent (Pink) | `#FF6B9D` | Highlights |
| Success | `#4CAF50` | Success states |
| Warning | `#FF9800` | Warnings |
| Error | `#F44336` | Errors |

### Theme Features
- ✅ Light & Dark mode
- ✅ Material Design 3 (Mobile)
- ✅ Consistent typography
- ✅ Responsive design (Web)

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI (untuk mobile)
- Python 3.9+ (untuk AI server)

### Quick Start

```bash
# Backend
cd backend && npm install && npm run migrate && npm start
# Runs at http://localhost:4000

# Mobile
cd mobile && npm install && npx expo start
# Scan QR dengan Expo Go

# Web
cd web && npm install && npm run dev
# Runs at http://localhost:5173

# AI Server (separate project)
cd deepdental-api && source venv/bin/activate && python main.py
# Runs at http://localhost:8000
```

---

## 📊 Status Integrasi

### ✅ Fully Integrated
- [x] User Authentication (Register, Login, OTP)
- [x] JWT Token Management
- [x] Patient Profile CRUD
- [x] Clinic & Dentist Listing
- [x] Appointment Booking Flow
- [x] Appointment Management (Reschedule, Cancel, Confirm)
- [x] Payment Integration (Midtrans)
- [x] AI Diagnosis (DeepDental API)
- [x] EMR (Backend ready, frontend integration pending)
- [x] Real-time Chat (Socket.io)
- [x] Push Notifications (Firebase)
- [x] Multi-language (ID/EN)
- [x] Theme Switching (Light/Dark)

### 🔄 In Progress / Partial
- [ ] Video Consultation (Agora setup done, UI pending)
- [ ] E-commerce Shop (UI done, backend partial)
- [ ] Complete Admin Dashboard features

### 📋 Planned
- [ ] Order Management (E-commerce)
- [ ] Review & Rating System
- [ ] Loyalty/Points System
- [ ] Insurance Integration
- [ ] Analytics Dashboard

---

## 📁 File Structure Overview

```
SereneApps/
├── 📱 mobile/                    # React Native Patient App
│   ├── src/
│   │   ├── features/             # Feature-based modules
│   │   │   ├── ai-diagnosis/
│   │   │   ├── appointment/
│   │   │   ├── dashboard/
│   │   │   ├── settings/
│   │   │   └── shop/
│   │   ├── navigation/           # Stack & Tab navigators
│   │   ├── store/                # Redux slices
│   │   ├── services/             # API services
│   │   ├── components/           # Shared components
│   │   └── theme/                # Theme config
│   └── App.js
│
├── 🌐 web/                       # React Web Dashboard
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin-portal/     # Admin dashboard
│   │   │   ├── clinic-portal/    # Clinic management
│   │   │   ├── dentist-portal/   # Dentist dashboard
│   │   │   └── patient-portal/   # Patient web view
│   │   ├── components/           # Reusable components
│   │   ├── services/             # API services
│   │   └── contexts/             # React contexts
│   └── index.html
│
├── ⚙️ backend/                   # Node.js API Server
│   ├── src/
│   │   ├── routes/               # API endpoints
│   │   ├── services/             # Business logic
│   │   ├── middleware/           # Auth, validation
│   │   ├── utils/                # Helper functions
│   │   └── server.js
│   ├── prisma/                   # Prisma schema
│   └── migrations/               # Database migrations
│
└── 📚 docs/                      # Documentation
    ├── Register&Login/
    ├── apiendpointAI/
    └── *.md files
```

---

## 🚀 Deployment

### Production URLs (Planned/Configured)
- **Web Dashboard:** Railway / Vercel
- **Backend API:** Railway
- **Mobile App:** Expo EAS Build → App Store / Play Store

### Environment Variables Required
```env
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGINS=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SENDGRID_API_KEY=...
FIREBASE_PROJECT_ID=...
MIDTRANS_SERVER_KEY=...

# Mobile
API_URL=...
AI_API_URL=...
AI_API_KEY=...

# Web
VITE_API_URL=...
```

---

## 📝 Catatan Penting

1. **Mock Mode AI:** Sudah dinonaktifkan, menggunakan real DeepDental API
2. **OTP Service:** Aktif via Twilio (SMS) dan SendGrid (Email)
3. **Payment Gateway:** Terintegrasi dengan Midtrans
4. **Real-time Features:** Socket.io untuk chat, Agora untuk video
5. **Multi-role Support:** Patient, Dentist, Clinic Staff, Admin

---

*Dokumentasi ini terakhir diupdate: Januari 2026*
