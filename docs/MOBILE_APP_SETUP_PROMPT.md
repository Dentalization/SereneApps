# SereneAI Patient Mobile App - Complete Setup Prompt

## 🎯 Project Overview

Create a **React Native mobile application using Expo** for SereneAI dental platform patients. The app should be modern, user-friendly, and connect to existing backend API running on `http://localhost:4000`.

---

## 📱 Technical Stack

```json
{
  "framework": "React Native with Expo SDK 51+",
  "template": "blank (JavaScript)",
  "language": "JavaScript (ES6+)",
  "navigation": "@react-navigation/native (Stack + Bottom Tabs)",
  "ui_library": "React Native Paper (Material Design 3)",
  "state_management": "Zustand + @tanstack/react-query",
  "api_client": "Axios with interceptors",
  "forms": "react-hook-form",
  "storage": "expo-secure-store",
  "camera": "expo-camera + expo-image-picker",
  "notifications": "expo-notifications",
  "icons": "@expo/vector-icons (MaterialCommunityIcons)"
}
```

---

## 🏗️ Project Structure

```
SereneAI-Mobile/
├── App.js
├── app.json
├── package.json
├── babel.config.js
└── src/
    ├── api/
    │   ├── client.js              # Axios instance with interceptors
    │   ├── endpoints.js           # All API endpoint constants
    │   ├── auth.api.js            # Authentication APIs
    │   ├── profile.api.js         # Profile APIs
    │   ├── appointments.api.js    # Appointment APIs
    │   ├── ai.api.js              # AI Diagnosis APIs
    │   ├── clinics.api.js         # Clinic & Dentist APIs
    │   ├── chat.api.js            # Chat/Communication APIs
    │   ├── notifications.api.js   # Notification APIs
    │   └── ecommerce.api.js       # E-commerce APIs (NEW)
    ├── screens/
    │   ├── Auth/
    │   │   ├── LoginScreen.js
    │   │   ├── RegisterScreen.js
    │   │   └── OnboardingScreen.js
    │   ├── Dashboard/
    │   │   └── DashboardScreen.js
    │   ├── Appointment/
    │   │   ├── AppointmentListScreen.js
    │   │   ├── AppointmentDetailScreen.js
    │   │   ├── BookAppointmentScreen.js
    │   │   ├── ClinicSearchScreen.js
    │   │   └── DentistSelectionScreen.js
    │   ├── AICamera/
    │   │   ├── CameraScreen.js
    │   │   ├── ImagePreviewScreen.js
    │   │   ├── AIResultsScreen.js
    │   │   └── DiagnosisHistoryScreen.js
    │   ├── Ecommerce/
    │   │   ├── ProductListScreen.js
    │   │   ├── ProductDetailScreen.js
    │   │   ├── CartScreen.js
    │   │   ├── CheckoutScreen.js
    │   │   └── OrderHistoryScreen.js
    │   └── Profile/
    │       ├── ProfileScreen.js
    │       ├── EditProfileScreen.js
    │       ├── MedicalHistoryScreen.js
    │       ├── NotificationsScreen.js
    │       └── SettingsScreen.js
    ├── components/
    │   ├── common/
    │   │   ├── Button.js
    │   │   ├── Input.js
    │   │   ├── Card.js
    │   │   ├── Loading.js
    │   │   ├── ErrorState.js
    │   │   └── EmptyState.js
    │   ├── dashboard/
    │   │   ├── WelcomeHeader.js
    │   │   ├── QuickActions.js
    │   │   ├── UpcomingAppointmentCard.js
    │   │   └── HealthTipsCarousel.js
    │   ├── appointment/
    │   │   ├── AppointmentCard.js
    │   │   ├── ClinicCard.js
    │   │   ├── DentistCard.js
    │   │   ├── TimeSlotPicker.js
    │   │   └── AppointmentTypeSelector.js
    │   ├── ai/
    │   │   ├── CameraControls.js
    │   │   ├── ImageAnnotation.js
    │   │   ├── DiagnosisCard.js
    │   │   └── RecommendationList.js
    │   ├── ecommerce/
    │   │   ├── ProductCard.js
    │   │   ├── CategoryFilter.js
    │   │   ├── CartItem.js
    │   │   └── OrderCard.js
    │   └── profile/
    │       ├── ProfileHeader.js
    │       ├── MenuList.js
    │       ├── NotificationItem.js
    │       └── MedicalRecordCard.js
    ├── navigation/
    │   ├── AppNavigator.js          # Main navigator
    │   ├── AuthNavigator.js         # Auth stack
    │   └── MainNavigator.js         # Bottom tab navigator
    ├── store/
    │   ├── authStore.js              # Authentication state
    │   ├── cartStore.js              # Shopping cart state
    │   └── notificationStore.js      # Notification state
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useAppointments.js
    │   ├── useAIDiagnosis.js
    │   ├── useProducts.js
    │   └── useNotifications.js
    ├── utils/
    │   ├── constants.js
    │   ├── helpers.js
    │   ├── validators.js
    │   └── formatters.js
    ├── theme/
    │   ├── colors.js
    │   ├── typography.js
    │   └── theme.js
    └── assets/
        ├── images/
        ├── icons/
        └── fonts/
```

---

## 🎨 Main Features & Screens

### **1. 🏠 Dashboard Screen**
**Features:**
- Welcome header with patient name and avatar
- Quick action buttons (Book Appointment, AI Scan, Shop, View Records)
- Upcoming appointment card (next 1 appointment)
- Recent AI diagnosis summary
- Health tips carousel
- Notification bell with badge

**API Endpoints Used:**
- `GET /api/mobile/profile` - Get patient profile
- `GET /api/mobile/appointments?limit=1&sort=upcoming` - Get next appointment
- `GET /api/mobile/notifications?unread=true` - Get unread notifications count
- `GET /api/mobile/ai-diagnosis/history?limit=3` - Get recent AI diagnoses

---

### **2. 📅 Appointment Screen**

#### **2.1 Appointment List Tab**
**Features:**
- Tab switcher: Upcoming / Past / Cancelled
- Appointment cards with clinic, dentist, date, time, type, status
- Filter by date range
- Quick actions: Reschedule, Cancel, View Details
- Empty state for no appointments

**API Endpoints:**
```
GET /api/mobile/appointments
GET /api/mobile/appointments?status=upcoming
GET /api/mobile/appointments?status=completed
GET /api/mobile/appointments?status=cancelled
```

**Appointment Data Flow:**
Ketika patient membuat appointment, data berikut akan dikirim ke backend dan **SANGAT PENTING** karena dentist akan menerima notifikasi dengan detail lengkap:
```javascript
{
  dentistId: number,          // ID dokter gigi yang dipilih
  clinicBranchId: number,     // ID cabang klinik (optional)
  startsAt: "2024-01-15T10:00:00Z",  // Waktu mulai (ISO 8601 format)
  endsAt: "2024-01-15T11:00:00Z",    // Waktu selesai
  reason: "Konsultasi Gigi",  // Tujuan kunjungan
  notes: "Sakit gigi sejak 3 hari yang lalu",  // Catatan tambahan patient
  metadata: {
    appointmentType: "consultation" | "checkup" | "treatment" | "emergency",
    patientConcerns: ["toothache", "bleeding_gums"],  // Keluhan patient
    preferredDentist: true,     // Patient pilih dentist tertentu atau tidak
  }
}
```

**Data yang Diterima Dentist (via Notification & Dashboard):**
```javascript
{
  appointment: {
    id: 123,
    startsAt: "2024-01-15T10:00:00Z",
    endsAt: "2024-01-15T11:00:00Z",
    status: "scheduled",
    reason: "Konsultasi Gigi",
    notes: "Sakit gigi sejak 3 hari yang lalu",
    appointmentType: "consultation"
  },
  patient: {
    id: 456,
    name: "John Doe",
    email: "john@example.com",
    phone: "+628123456789",
    avatar: "https://...",
    age: 28,
    gender: "male",
    // Medical History (PENTING untuk dentist!)
    medicalDetails: {
      allergies: ["Penicillin", "Aspirin"],  // Alergi obat
      chronicConditions: ["Diabetes", "Hypertension"],  // Penyakit kronis
      medications: ["Metformin 500mg"],  // Obat yang sedang dikonsumsi
      notes: "Riwayat gigi sensitif"
    },
    insuranceProvider: "BPJS Kesehatan",  // Provider asuransi
    insuranceNumber: "1234567890",
    emergencyContact: {
      name: "Jane Doe",
      phone: "+628987654321",
      relationship: "Istri"
    }
  },
  clinic: {
    id: 789,
    name: "Klinik Gigi Sehat",
    branchName: "Cabang Jakarta Selatan",
    address: "Jl. Sudirman No. 123"
  }
}
```

#### **2.2 Book Appointment Flow**
**Screens:**
1. **Search Clinics** - Search by name, location, specialty
2. **Select Clinic** - View clinic details, dentists, ratings
3. **Select Dentist** - View dentist profile, specialties, availability
4. **Choose Date & Time** - Calendar picker + available time slots
5. **Select Appointment Type** - Consultation, Checkup, Treatment, Emergency
6. **Add Notes** - Optional patient notes
7. **Confirm Booking** - Review and confirm

**API Endpoints:**
```
GET /api/mobile/clinics?search={query}&location={location}
GET /api/mobile/clinics/{clinicId}
GET /api/mobile/clinics/{clinicId}/dentists
GET /api/mobile/dentists/{dentistId}
GET /api/mobile/dentists/{dentistId}/availability?date={date}
POST /api/mobile/appointments
GET /api/mobile/appointments/{id}
PUT /api/mobile/appointments/{id}
DELETE /api/mobile/appointments/{id}
```

---

### **3. 📸 AI Camera / First Diagnosis Screen**

#### **3.1 Camera Screen**
**Features:**
- Live camera view with overlay guides
- Flash toggle
- Front/back camera switch
- Capture button
- Gallery access to upload existing photos
- Guidelines for proper dental photo capture

#### **3.2 Image Preview & Upload**
**Features:**
- Preview captured image
- Crop/rotate tools
- Retake or confirm
- Upload to AI analysis
- Loading indicator during processing
- Progress bar

#### **3.3 AI Results Screen**
**Features:**
- Diagnosis result cards with confidence scores
- Detected conditions (cavities, plaque, gum disease, etc.)
- Risk level indicators (Low, Medium, High)
- Recommended actions
- Dentist recommendations
- Save to history
- Share with dentist
- Book appointment CTA

#### **3.4 Diagnosis History**
**Features:**
- List of past AI scans
- Date, image thumbnail, diagnosis summary
- Filter by date range
- View full details
- Compare results over time

**API Endpoints:**
```
POST /api/mobile/ai-diagnosis/upload
POST /api/mobile/ai-diagnosis/analyze
GET /api/mobile/ai-diagnosis/history
GET /api/mobile/ai-diagnosis/{id}
DELETE /api/mobile/ai-diagnosis/{id}
```

---

### **4. 🛒 E-commerce Mini Screen**

#### **4.1 Product Categories**
**Categories:**
- Dental Care (Toothpaste, Mouthwash, Floss)
- Oral Hygiene Tools (Toothbrush, Electric Toothbrush, Water Flosser)
- Whitening Products
- Orthodontic Care
- Pain Relief
- Kids Dental Care
- Prescription Medications (requires dentist approval)

#### **4.2 Product List**
**Features:**
- Grid/List view toggle
- Category filter
- Search functionality
- Sort by: Price, Popularity, Rating
- Product cards: Image, Name, Price, Rating, Stock status
- Add to cart quick button
- Wishlist/Favorite toggle

#### **4.3 Product Detail**
**Features:**
- Image gallery with zoom
- Product name, brand, description
- Price (with discount if applicable)
- Stock availability
- Ratings & reviews
- Usage instructions
- Ingredients/specifications
- Related products
- Add to cart with quantity selector
- Buy now CTA

#### **4.4 Shopping Cart**
**Features:**
- Cart items with image, name, price, quantity
- Quantity adjustment (+/-)
- Remove item
- Apply coupon/promo code
- Shipping cost calculation
- Total price summary
- Proceed to checkout

#### **4.5 Checkout**
**Features:**
- Delivery address selection/add new
- Shipping method selection
- Payment method selection (Credit Card, E-wallet, COD)
- Order summary
- Terms & conditions checkbox
- Place order button

#### **4.6 Order History**
**Features:**
- List of past orders
- Order cards: Order number, date, status, total
- Status: Processing, Shipped, Delivered, Cancelled
- Track order
- Reorder option
- Leave review

**API Endpoints (NEW - Need to be created):**
```
# Products
GET /api/mobile/products
GET /api/mobile/products?category={category}
GET /api/mobile/products?search={query}
GET /api/mobile/products/{id}
GET /api/mobile/categories

# Cart
GET /api/mobile/cart
POST /api/mobile/cart/add
PUT /api/mobile/cart/update/{itemId}
DELETE /api/mobile/cart/remove/{itemId}
POST /api/mobile/cart/apply-coupon

# Orders
POST /api/mobile/orders
GET /api/mobile/orders
GET /api/mobile/orders/{id}
PUT /api/mobile/orders/{id}/cancel
GET /api/mobile/orders/{id}/track

# Reviews
POST /api/mobile/products/{id}/review
GET /api/mobile/products/{id}/reviews

# Wishlist
GET /api/mobile/wishlist
POST /api/mobile/wishlist/add/{productId}
DELETE /api/mobile/wishlist/remove/{productId}
```

---

### **5. 👤 Profile Screen**

#### **5.1 Profile Overview**
**Features:**
- Profile photo with edit option
- Patient name, email, phone
- Patient ID
- Quick stats: Appointments completed, AI scans, Orders
- Menu list with navigation

**Menu Items:**
- 📝 Edit Profile
- 🏥 Medical History
- 💳 Payment Methods
- 📦 My Orders
- 🔔 Notifications
- ⚙️ Settings
- 📞 Contact Support
- 📄 Terms & Privacy
- 🚪 Logout

#### **5.2 Edit Profile**
**Features:**
- Upload/change profile photo
- Edit name, email, phone, date of birth, gender
- Emergency contact information
- Insurance information
- Save changes

#### **5.3 Medical History**
**Features:**
- Allergies list (add/remove)
- Current medications
- Past dental procedures
- Medical conditions
- Blood type
- Notes for dentist

#### **5.4 Notifications**
**Features:**
- List of all notifications
- Tabs: All / Appointments / AI Results / Orders / System
- Mark as read
- Delete notification
- Notification settings (toggle types)

#### **5.5 Settings**
**Features:**
- Language selection (EN/ID)
- Theme (Light/Dark/Auto)
- Notification preferences
- Privacy settings
- App version
- Clear cache
- Delete account

**API Endpoints:**
```
GET /api/mobile/profile
PUT /api/mobile/profile
PUT /api/mobile/profile/avatar
GET /api/mobile/profile/medical-history
PUT /api/mobile/profile/medical-history
GET /api/mobile/notifications
PUT /api/mobile/notifications/{id}/read
DELETE /api/mobile/notifications/{id}
PUT /api/mobile/profile/settings
POST /api/auth/logout
```

---

## 🗄️ Database Schema: PatientProfile

### **Table: `patient_profiles`**

```sql
CREATE TABLE patient_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Information
  date_of_birth DATE,                    -- Format: YYYY-MM-DD
  gender TEXT,                            -- 'male', 'female', 'other'
  
  -- Insurance Information
  insurance_provider TEXT,                -- e.g., "BPJS Kesehatan", "Prudential"
  insurance_number TEXT,                  -- Nomor kartu asuransi
  insurance_member_id TEXT,               -- Nomor member/peserta
  
  -- JSON Fields (Flexible Structure)
  emergency_contact JSONB,                -- { name, phone, relationship }
  address JSONB,                          -- { line1, line2, city, province, postalCode }
  medical_details JSONB,                  -- { allergies[], chronicConditions[], medications[], notes }
  
  -- Preferences
  preferred_language TEXT NOT NULL DEFAULT 'id',  -- 'id' or 'en'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_insurance_number ON patient_profiles(insurance_number);
```

### **Prisma Schema Model**

```prisma
model PatientProfile {
  id                BigInt    @id @default(autoincrement())
  userId            BigInt    @unique @map("user_id")
  dateOfBirth       DateTime? @map("date_of_birth") @db.Date
  gender            String?
  insuranceProvider String?   @map("insurance_provider")
  insuranceNumber   String?   @map("insurance_number")
  insuranceMemberId String?   @map("insurance_member_id")
  emergencyContact  Json?     @map("emergency_contact")
  address           Json?
  medicalDetails    Json?     @map("medical_details")
  preferredLanguage String    @default("id") @map("preferred_language")
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_patient_profiles_user_id")
  @@index([insuranceNumber], map: "idx_patient_profiles_insurance_number")
  @@map("patient_profiles")
}
```

### **JSON Field Structures**

#### **1. `emergency_contact` (JSONB)**
```json
{
  "name": "Jane Doe",
  "phone": "+628987654321",
  "relationship": "Istri"
}
```

**Possible Relationships:**
- "Suami" / "Husband"
- "Istri" / "Wife"
- "Orang Tua" / "Parent"
- "Anak" / "Child"
- "Saudara" / "Sibling"
- "Teman" / "Friend"

#### **2. `address` (JSONB)**
```json
{
  "line1": "Jl. Sudirman No. 123",
  "line2": "RT 005 RW 012, Karet Tengsin",
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "postalCode": "12920"
}
```

#### **3. `medical_details` (JSONB) - ⚠️ MOST CRITICAL!**
```json
{
  "allergies": [
    "Penicillin",
    "Aspirin",
    "Latex",
    "Local Anesthetic"
  ],
  "chronicConditions": [
    "Diabetes Type 2",
    "Hypertension",
    "Asthma"
  ],
  "medications": [
    "Metformin 500mg 2x/day",
    "Amlodipine 10mg 1x/day",
    "Salbutamol inhaler as needed"
  ],
  "notes": "Riwayat gigi sensitif. Pernah operasi cabut gigi bungsu tahun 2020. Tidak tahan sakit, prefer anestesi lokal dosis tinggi."
}
```

### **Common Medical Data Reference**

#### **Common Allergies in Dental Practice:**
```javascript
const commonDentalAllergies = [
  "Penicillin",              // Antibiotic (most common)
  "Amoxicillin",             // Antibiotic
  "Aspirin",                 // Pain reliever
  "Ibuprofen",               // NSAID
  "Paracetamol",             // Pain reliever
  "Latex",                   // Gloves (use nitrile instead)
  "Lidocaine",               // Local anesthetic
  "Benzocaine",              // Topical anesthetic
  "Epinephrine",             // Vasoconstrictor
  "Sulfa drugs",             // Antibiotics
  "Codeine",                 // Opioid pain medication
  "Nickel",                  // Dental materials/braces
];
```

#### **Common Chronic Conditions:**
```javascript
const chronicConditionsAffectingDentalCare = [
  // High Priority (Affect Anesthesia/Bleeding)
  "Diabetes Type 1",
  "Diabetes Type 2",
  "Hypertension",
  "Heart Disease",
  "Hemophilia",              // Bleeding disorder - CRITICAL!
  "Warfarin use",            // Blood thinner - CRITICAL!
  
  // Medium Priority (Affect Treatment Planning)
  "Asthma",
  "Epilepsy",
  "Kidney Disease",
  "Liver Disease",
  "HIV/AIDS",
  "Cancer (Active/History)",
  
  // Special Conditions
  "Pregnancy",               // No X-rays, careful with medications
  "Breastfeeding",           // Medication restrictions
  "Osteoporosis",            // Bone density affects implants
  "Thyroid Disease",
];
```

#### **Medication Format Guidelines:**
```javascript
// Format: "Drug Name + Dosage + Frequency"
const medicationExamples = [
  "Metformin 500mg 2x/day",
  "Amlodipine 10mg 1x/day morning",
  "Aspirin 100mg 1x/day",              // ⚠️ Blood thinner
  "Warfarin 5mg 1x/day",               // ⚠️ Blood thinner - CRITICAL!
  "Insulin Humalog as prescribed",
  "Salbutamol inhaler as needed",
  "Lisinopril 10mg 1x/day",
  "Atorvastatin 20mg 1x/night",
];
```

### **Why JSONB Fields?**

**Advantages:**
1. ✅ **Flexibility**: Easy to add new fields without database migration
2. ✅ **Dynamic Arrays**: Allergies and medications can be unlimited
3. ✅ **Easy Updates**: Patients can update medical info anytime
4. ✅ **PostgreSQL JSONB**: Indexable, queryable, and performant
5. ✅ **Schema Evolution**: Can evolve data structure without breaking changes

### **Important Database Queries**

```sql
-- Find all patients with specific allergy (e.g., Penicillin)
SELECT u.name, u.email, pp.medical_details->'allergies'
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details @> '{"allergies": ["Penicillin"]}';

-- Find diabetic patients
SELECT u.name, pp.medical_details
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'chronicConditions' ? 'Diabetes Type 2';

-- Find patients on blood thinners (IMPORTANT before dental surgery!)
SELECT u.name, u.email, u.phone_number, pp.medical_details->'medications'
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'medications'::text ILIKE '%warfarin%'
   OR pp.medical_details->'medications'::text ILIKE '%aspirin%'
   OR pp.medical_details->'medications'::text ILIKE '%clopidogrel%';

-- Get patient age from date of birth
SELECT 
  u.name,
  pp.date_of_birth,
  EXTRACT(YEAR FROM AGE(pp.date_of_birth)) as age
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id;

-- Find patients with incomplete medical information (for mobile app reminder)
SELECT u.id, u.name, u.email
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details IS NULL
   OR pp.emergency_contact IS NULL
   OR pp.date_of_birth IS NULL;
```

### **Data Validation in Backend**

```javascript
// backend/src/utils/validators.js
const validateMedicalDetails = (medicalDetails) => {
  const errors = [];
  
  // Allergies must be array
  if (medicalDetails.allergies && !Array.isArray(medicalDetails.allergies)) {
    errors.push('allergies must be an array');
  }
  
  // Chronic conditions must be array
  if (medicalDetails.chronicConditions && !Array.isArray(medicalDetails.chronicConditions)) {
    errors.push('chronicConditions must be an array');
  }
  
  // Medications must be array
  if (medicalDetails.medications && !Array.isArray(medicalDetails.medications)) {
    errors.push('medications must be an array');
  }
  
  // Notes max length
  if (medicalDetails.notes && medicalDetails.notes.length > 2000) {
    errors.push('notes must be less than 2000 characters');
  }
  
  return errors;
};

const validateEmergencyContact = (emergencyContact) => {
  const errors = [];
  
  if (!emergencyContact.name || emergencyContact.name.length < 2) {
    errors.push('Emergency contact name is required (min 2 characters)');
  }
  
  if (!emergencyContact.phone || !/^\+628\d{8,11}$/.test(emergencyContact.phone)) {
    errors.push('Emergency contact phone must be valid Indonesian format (+628...)');
  }
  
  if (!emergencyContact.relationship) {
    errors.push('Emergency contact relationship is required');
  }
  
  return errors;
};
```

### **Sample Test Data**

```sql
-- Complete patient profile with all medical information
INSERT INTO patient_profiles (
  user_id,
  date_of_birth,
  gender,
  insurance_provider,
  insurance_number,
  insurance_member_id,
  emergency_contact,
  address,
  medical_details,
  preferred_language
) VALUES (
  456,  -- Must match existing user.id
  '1995-06-15',
  'male',
  'BPJS Kesehatan',
  '0001234567890',
  '0001234567890',
  '{"name": "Jane Doe", "phone": "+628987654321", "relationship": "Istri"}'::jsonb,
  '{"line1": "Jl. Sudirman No. 123", "line2": "RT 005 RW 012, Karet Tengsin", "city": "Jakarta Selatan", "province": "DKI Jakarta", "postalCode": "12920"}'::jsonb,
  '{"allergies": ["Penicillin", "Aspirin"], "chronicConditions": ["Diabetes Type 2"], "medications": ["Metformin 500mg 2x/day"], "notes": "Riwayat gigi sensitif, pernah cabut gigi bungsu 2020"}'::jsonb,
  'id'
);

-- Patient with no allergies (explicitly stated)
INSERT INTO patient_profiles (user_id, date_of_birth, gender, medical_details)
VALUES (
  457,
  '1990-03-20',
  'female',
  '{"allergies": [], "chronicConditions": [], "medications": [], "notes": "Tidak ada alergi atau riwayat penyakit"}'::jsonb
);

-- Patient with critical blood thinner medication
INSERT INTO patient_profiles (user_id, date_of_birth, gender, medical_details)
VALUES (
  458,
  '1960-12-10',
  'male',
  '{"allergies": [], "chronicConditions": ["Heart Disease", "Atrial Fibrillation"], "medications": ["Warfarin 5mg 1x/day", "Atorvastatin 20mg 1x/night"], "notes": "Harus stop Warfarin 3 hari sebelum prosedur invasif"}'::jsonb
);
```

---

## 📋 Patient Registration Data Requirements
```

---

## � Patient Registration Data Requirements

### **CRITICAL: Data yang Diperlukan untuk Register Patient**

Ketika patient melakukan registrasi, data berikut **WAJIB dan PENTING** karena akan digunakan oleh dentist untuk diagnosis dan treatment:

#### **1. Required Fields (Wajib diisi)**
```javascript
{
  // Basic Info
  name: string,              // Nama lengkap patient
  email: string,             // Email (unique, untuk login)
  password: string,          // Password (min 8 karakter)
  phone_number: string,      // Format: +628123456789
  dateOfBirth: string,       // Format: YYYY-MM-DD (untuk hitung umur)
  gender: "male" | "female" | "other"  // Gender
}
```

#### **2. Medical Information (SANGAT PENTING untuk Dentist)**
```javascript
{
  medicalDetails: {
    allergies: string[],           // ["Penicillin", "Aspirin", "Latex"]
    chronicConditions: string[],   // ["Diabetes", "Hypertension", "Heart Disease"]
    medications: string[],         // ["Metformin 500mg", "Amlodipine 10mg"]
    notes: string                  // "Riwayat gigi sensitif, pernah operasi gigi bungsu"
  }
}
```

**⚠️ WARNING:** Data `allergies` dan `medications` KRUSIAL untuk dentist! Dentist HARUS tahu alergi obat sebelum memberikan anestesi atau obat apapun.

#### **3. Insurance Information (Optional tapi Recommended)**
```javascript
{
  insuranceProvider: string,    // "BPJS Kesehatan", "Prudential", "Allianz"
  insuranceNumber: string,      // Nomor kartu asuransi
  insuranceMemberId: string     // Nomor member/peserta
}
```

#### **4. Emergency Contact (Required untuk Safety)**
```javascript
{
  emergencyContact: {
    name: string,              // Nama kontak darurat
    phone: string,             // Nomor HP (format: +628...)
    relationship: string       // "Suami", "Istri", "Orang Tua", "Saudara"
  }
}
```

#### **5. Address Information (Optional)**
```javascript
{
  address: {
    line1: string,             // Alamat jalan
    line2: string,             // Alamat tambahan (RT/RW, dll)
    city: string,              // Kota
    province: string,          // Provinsi
    postalCode: string         // Kode pos
  }
}
```

#### **6. Preferences**
```javascript
{
  preferredLanguage: "id" | "en"  // Default: "id" (Indonesia)
}
```

### **Complete Registration Request Example**

```javascript
// POST /api/auth/patient/register
{
  // Required Basic Info
  name: "John Doe",
  email: "john.doe@example.com",
  password: "SecurePass123!",
  phone_number: "+628123456789",
  dateOfBirth: "1995-06-15",
  gender: "male",
  
  // Critical Medical Info (IMPORTANT!)
  allergies: ["Penicillin", "Aspirin"],
  chronicConditions: ["Diabetes Type 2"],
  medications: ["Metformin 500mg 2x/day"],
  medicalNotes: "Riwayat gigi sensitif, pernah cabut gigi bungsu tahun 2020",
  
  // Insurance (Optional)
  insuranceProvider: "BPJS Kesehatan",
  insuranceNumber: "0001234567890",
  insuranceMemberId: "0001234567890",
  
  // Emergency Contact (Required)
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "+628987654321",
  emergencyContactRelationship: "Istri",
  
  // Address (Optional)
  addressLine1: "Jl. Sudirman No. 123",
  addressLine2: "RT 005 RW 012, Karet Tengsin",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12920",
  
  // Preferences
  preferredLanguage: "id"
}
```

### **Registration Response**
```javascript
{
  accessToken: "eyJhbGciOiJIUzI1NiIsInR...",
  refreshToken: "eyJhbGciOiJIUzI1NiIsInR...",
  user: {
    id: 456,
    name: "John Doe",
    email: "john.doe@example.com",
    roles: ["patient"],
    phone_number: "+628123456789",
    avatar_url: null
  },
  patientProfile: {
    dateOfBirth: "1995-06-15",
    gender: "male",
    insuranceProvider: "BPJS Kesehatan",
    insuranceNumber: "0001234567890",
    insuranceMemberId: "0001234567890",
    emergencyContact: {
      name: "Jane Doe",
      phone: "+628987654321",
      relationship: "Istri"
    },
    address: {
      line1: "Jl. Sudirman No. 123",
      line2: "RT 005 RW 012, Karet Tengsin",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      postalCode: "12920"
    },
    medicalDetails: {
      allergies: ["Penicillin", "Aspirin"],
      chronicConditions: ["Diabetes Type 2"],
      medications: ["Metformin 500mg 2x/day"],
      notes: "Riwayat gigi sensitif, pernah cabut gigi bungsu tahun 2020"
    },
    preferredLanguage: "id"
  }
}
```

### **Validation Rules**

1. **Email**: Must be unique, valid email format
2. **Password**: Minimum 8 characters, must contain uppercase, lowercase, and number
3. **Phone**: Must follow international format (+628...)
4. **Date of Birth**: Must be valid date (YYYY-MM-DD), patient must be at least 1 year old
5. **Allergies**: Array of strings (dapat kosong `[]`)
6. **Medications**: Array of strings dengan format "Nama Obat Dosis Frekuensi"

### **Why This Data is Critical for Dentists**

1. **Allergies** → Mencegah reaksi alergi fatal saat pemberian anestesi/obat
2. **Chronic Conditions** → Mempengaruhi treatment plan (diabetes = penyembuhan luka lebih lama)
3. **Medications** → Kemungkinan interaksi obat dengan obat yang akan diresepkan
4. **Age (from DOB)** → Menentukan dosis obat dan jenis treatment
5. **Emergency Contact** → Diperlukan jika terjadi komplikasi saat treatment
6. **Insurance** → Untuk klaim biaya treatment

---

## �🔌 Backend API Endpoints Summary

### **✅ Already Implemented (36 endpoints)**

#### **Authentication (3)**
```
POST /api/auth/login
POST /api/auth/patient/register  ← Patient Registration
POST /api/auth/logout
```

#### **Profile (4)**
```
GET /api/mobile/profile
PUT /api/mobile/profile
PUT /api/mobile/profile/avatar
PUT /api/mobile/profile/settings
```

#### **Appointments (7)**
```
GET /api/mobile/appointments
POST /api/mobile/appointments
GET /api/mobile/appointments/:id
PUT /api/mobile/appointments/:id
DELETE /api/mobile/appointments/:id
GET /api/mobile/appointments/:id/payment-status
POST /api/mobile/appointments/:id/cancel
```

#### **Clinics & Dentists (6)**
```
GET /api/mobile/clinics
GET /api/mobile/clinics/:id
GET /api/mobile/clinics/:id/dentists
GET /api/mobile/dentists/:id
GET /api/mobile/dentists/:id/availability
GET /api/mobile/dentists/:id/reviews
```

#### **Chat/Communication (5)**
```
GET /api/mobile/chat/rooms
GET /api/mobile/chat/rooms/:roomId/messages
POST /api/mobile/chat/rooms/:roomId/messages
PUT /api/mobile/chat/messages/:messageId/read
DELETE /api/mobile/chat/messages/:messageId
```

#### **Notifications (5)**
```
GET /api/mobile/notifications
GET /api/mobile/notifications/unread-count
PUT /api/mobile/notifications/:id/read
PUT /api/mobile/notifications/mark-all-read
DELETE /api/mobile/notifications/:id
```

#### **AI Diagnosis (6)**
```
POST /api/mobile/ai-diagnosis/upload
POST /api/mobile/ai-diagnosis/analyze
GET /api/mobile/ai-diagnosis/history
GET /api/mobile/ai-diagnosis/:id
PUT /api/mobile/ai-diagnosis/:id
DELETE /api/mobile/ai-diagnosis/:id
```

---

### **❌ Need to Implement (E-commerce - ~20 endpoints)**

#### **Products (6)**
```
GET /api/mobile/products
GET /api/mobile/products/:id
GET /api/mobile/categories
GET /api/mobile/products/:id/reviews
POST /api/mobile/products/:id/reviews
GET /api/mobile/products/search
```

#### **Cart (5)**
```
GET /api/mobile/cart
POST /api/mobile/cart/items
PUT /api/mobile/cart/items/:itemId
DELETE /api/mobile/cart/items/:itemId
POST /api/mobile/cart/apply-coupon
```

#### **Orders (6)**
```
POST /api/mobile/orders
GET /api/mobile/orders
GET /api/mobile/orders/:id
PUT /api/mobile/orders/:id/cancel
GET /api/mobile/orders/:id/track
POST /api/mobile/orders/:id/review
```

#### **Wishlist (3)**
```
GET /api/mobile/wishlist
POST /api/mobile/wishlist/:productId
DELETE /api/mobile/wishlist/:productId
```

---

## � Appointment & Notification Flow

### **1. Patient Books Appointment (Mobile App)**

```javascript
// Step 1: Patient submits appointment
const appointmentData = {
  dentistId: 123,
  clinicBranchId: 456,
  startsAt: "2024-01-15T10:00:00Z",
  endsAt: "2024-01-15T11:00:00Z",
  reason: "Sakit gigi",
  notes: "Gigi geraham kanan bawah sakit sejak 3 hari yang lalu",
  metadata: {
    appointmentType: "consultation",
    patientConcerns: ["toothache", "sensitivity"]
  }
};

// POST /api/mobile/appointments
const response = await appointmentsApi.create(appointmentData);
```

### **2. Backend Creates Appointment & Sends Notification to Dentist**

```javascript
// Backend: src/routes/mobile/appointments.routes.js
router.post('/appointments', authenticateToken, async (req, res) => {
  // 1. Create appointment
  const appointment = await createAppointment(req.body);
  
  // 2. Get patient profile (dengan medical history!)
  const patient = await getPatientProfile(req.user.id);
  
  // 3. Send notification to dentist
  await notificationService.send({
    userId: appointment.dentistId,
    type: 'NEW_APPOINTMENT',
    title: `Appointment Baru dari ${patient.name}`,
    body: `${patient.name} membuat appointment pada ${formatDate(appointment.startsAt)}`,
    data: {
      appointmentId: appointment.id,
      patientId: patient.id,
      startsAt: appointment.startsAt,
      reason: appointment.reason,
      // CRITICAL: Include medical info!
      patientMedicalInfo: {
        allergies: patient.medicalDetails?.allergies || [],
        chronicConditions: patient.medicalDetails?.chronicConditions || [],
        medications: patient.medicalDetails?.medications || [],
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender
      }
    }
  });
  
  // 4. Create chat room for communication
  await createChatRoom(appointment.id, patient.id, appointment.dentistId);
  
  res.json({ appointment });
});
```

### **3. Dentist Receives Notification (Web Dashboard)**

**Notification Content:**
```javascript
{
  id: "notif_123",
  type: "NEW_APPOINTMENT",
  title: "Appointment Baru dari John Doe",
  body: "John Doe membuat appointment pada Senin, 15 Jan 2024 10:00",
  timestamp: "2024-01-10T14:30:00Z",
  read: false,
  data: {
    appointmentId: 789,
    patient: {
      id: 456,
      name: "John Doe",
      age: 28,
      gender: "male",
      phone: "+628123456789",
      email: "john@example.com",
      avatar: "https://...",
      // ⚠️ CRITICAL INFO for Dentist
      medicalInfo: {
        allergies: ["Penicillin", "Aspirin"],
        chronicConditions: ["Diabetes Type 2"],
        medications: ["Metformin 500mg 2x/day"],
        notes: "Riwayat gigi sensitif"
      },
      insuranceProvider: "BPJS Kesehatan",
      emergencyContact: {
        name: "Jane Doe",
        phone: "+628987654321",
        relationship: "Istri"
      }
    },
    appointment: {
      id: 789,
      startsAt: "2024-01-15T10:00:00Z",
      endsAt: "2024-01-15T11:00:00Z",
      reason: "Sakit gigi",
      notes: "Gigi geraham kanan bawah sakit sejak 3 hari yang lalu",
      appointmentType: "consultation",
      status: "scheduled"
    }
  },
  actions: [
    {
      label: "Lihat Detail",
      action: "VIEW_APPOINTMENT",
      url: "/dentist/appointments/789"
    },
    {
      label: "Hubungi Patient",
      action: "OPEN_CHAT",
      url: "/dentist/teledentistry?appointmentId=789"
    }
  ]
}
```

### **4. Dentist Views Patient Detail Before Appointment**

Di dashboard dentist, ketika melihat appointment detail, dentist WAJIB bisa lihat:

```javascript
// Appointment Detail View
<AppointmentDetail>
  {/* Basic Info */}
  <PatientInfo>
    <Avatar src={patient.avatar} />
    <Name>{patient.name}, {patient.age} tahun</Name>
    <Contact>{patient.phone} • {patient.email}</Contact>
  </PatientInfo>
  
  {/* ⚠️ CRITICAL: Medical Information Alert */}
  {patient.medicalInfo.allergies.length > 0 && (
    <Alert severity="error">
      <AlertTitle>⚠️ ALERGI OBAT</AlertTitle>
      <List>
        {patient.medicalInfo.allergies.map(allergy => (
          <ListItem key={allergy}>
            <Icon>warning</Icon> {allergy}
          </ListItem>
        ))}
      </List>
    </Alert>
  )}
  
  {patient.medicalInfo.chronicConditions.length > 0 && (
    <Alert severity="warning">
      <AlertTitle>Riwayat Penyakit</AlertTitle>
      <Chips>
        {patient.medicalInfo.chronicConditions.map(condition => (
          <Chip key={condition} label={condition} />
        ))}
      </Chips>
    </Alert>
  )}
  
  {patient.medicalInfo.medications.length > 0 && (
    <Card>
      <CardTitle>Obat yang Sedang Dikonsumsi</CardTitle>
      <List>
        {patient.medicalInfo.medications.map(med => (
          <ListItem key={med}>{med}</ListItem>
        ))}
      </List>
    </Card>
  )}
  
  {/* Insurance Info */}
  {patient.insuranceProvider && (
    <Card>
      <CardTitle>Asuransi</CardTitle>
      <Text>{patient.insuranceProvider}</Text>
      <Text>{patient.insuranceNumber}</Text>
    </Card>
  )}
  
  {/* Emergency Contact */}
  <Card>
    <CardTitle>Kontak Darurat</CardTitle>
    <Text>{patient.emergencyContact.name} ({patient.emergencyContact.relationship})</Text>
    <Text>{patient.emergencyContact.phone}</Text>
  </Card>
  
  {/* Appointment Details */}
  <Card>
    <CardTitle>Detail Appointment</CardTitle>
    <DateTime>{formatDateTime(appointment.startsAt)}</DateTime>
    <Type>{appointment.appointmentType}</Type>
    <Reason>{appointment.reason}</Reason>
    <Notes>{appointment.notes}</Notes>
  </Card>
  
  {/* Actions */}
  <Actions>
    <Button onClick={openChat}>💬 Chat dengan Patient</Button>
    <Button onClick={startVideoCall}>📹 Mulai Video Call</Button>
    <Button onClick={acceptAppointment}>✅ Terima Appointment</Button>
    <Button onClick={rescheduleAppointment}>📅 Reschedule</Button>
    <Button onClick={cancelAppointment}>❌ Tolak</Button>
  </Actions>
</AppointmentDetail>
```

### **5. Real-time Communication During Appointment**

Ketika appointment dimulai, dentist dan patient bisa berkomunikasi melalui:

1. **Text Chat**: `/dentist/teledentistry` (web) ↔ Mobile App
2. **Video Call**: WebRTC integration
3. **File Sharing**: Patient bisa kirim foto gigi, dentist bisa kirim resep

### **Important Notes for Mobile App Development**

1. **Validasi Medical Info**:
   - Wajib isi allergies (minimal konfirmasi "Tidak ada alergi")
   - Suggest common allergies: Penicillin, Aspirin, Latex, Sulfa, Local Anesthetic
   - Suggest common conditions: Diabetes, Hypertension, Heart Disease, Asthma

2. **Appointment Booking**:
   - Tampilkan warning jika patient belum isi medical info
   - Remind patient untuk update medical info jika sudah lama (> 6 bulan)

3. **Notification Settings**:
   - Patient bisa setting notification untuk: Appointment reminder (1 day before, 1 hour before), Chat messages, AI diagnosis results, Order updates

---

## �📋 Implementation Requirements

### **Phase 1: Initial Setup**
1. Create Expo project with TypeScript template
2. Install all required dependencies
3. Setup folder structure
4. Configure API client with interceptors
5. Setup navigation (Stack + Bottom Tabs)
6. Implement theme (React Native Paper)
7. Create common components (Button, Input, Card, etc.)

### **Phase 2: Authentication**
1. Onboarding screens (3 slides)
2. Login screen with email/password
3. **Register screen with COMPLETE form validation**:
   - Basic Info: name, email, password, phone, DOB, gender
   - **Medical Info (CRITICAL)**: allergies, chronic conditions, current medications, notes
   - Insurance Info: provider, number, member ID
   - Emergency Contact: name, phone, relationship
   - Address: line1, line2, city, province, postal code
   - Language preference
4. Auth store with Zustand
5. Secure token storage
6. Auto-login on app launch

**Registration Form Implementation Guide:**

```javascript
// RegisterScreen.js - Multi-step form (5 steps)
const steps = [
  {
    title: "Informasi Dasar",
    fields: ["name", "email", "password", "phone", "dateOfBirth", "gender"]
  },
  {
    title: "Informasi Medis",  // ⚠️ PALING PENTING!
    fields: ["allergies", "chronicConditions", "medications", "medicalNotes"],
    helpText: "Data ini sangat penting untuk keamanan treatment Anda"
  },
  {
    title: "Asuransi",
    fields: ["insuranceProvider", "insuranceNumber", "insuranceMemberId"],
    optional: true
  },
  {
    title: "Kontak Darurat",
    fields: ["emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship"]
  },
  {
    title: "Alamat",
    fields: ["addressLine1", "addressLine2", "city", "province", "postalCode"],
    optional: true
  }
];

// Form validation with react-hook-form + zod
const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Harus ada huruf besar")
    .regex(/[a-z]/, "Harus ada huruf kecil")
    .regex(/[0-9]/, "Harus ada angka"),
  phone_number: z.string().regex(/^\+628\d{8,11}$/, "Format: +628123456789"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  gender: z.enum(["male", "female", "other"]),
  
  // Medical Info - Critical Fields
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  medicalNotes: z.string().optional(),
  
  // Emergency Contact - Required
  emergencyContactName: z.string().min(2, "Nama kontak darurat wajib diisi"),
  emergencyContactPhone: z.string().regex(/^\+628\d{8,11}$/),
  emergencyContactRelationship: z.string().min(2, "Hubungan wajib diisi"),
  
  // Optional fields
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceMemberId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  preferredLanguage: z.enum(["id", "en"]).default("id")
});
```

**UI Components for Medical Info:**
- **Allergies Input**: Multi-select chips dengan suggestions (Penicillin, Aspirin, Latex, dll)
- **Chronic Conditions**: Multi-select dengan common conditions (Diabetes, Hypertension, dll)
- **Medications**: Text input array dengan format "Nama Obat + Dosis + Frekuensi"
- **Medical Notes**: Textarea untuk catatan tambahan

### **Phase 3: Dashboard**
1. Welcome header with patient info
2. Quick action cards
3. Upcoming appointment widget
4. Recent AI scans widget
5. Health tips carousel
6. Notification bell with badge

### **Phase 4: Appointments**
1. Appointment list with filters
2. Appointment detail view
3. Clinic search with filters
4. Clinic detail with dentist list
5. Dentist profile view
6. Date & time slot picker
7. Appointment type selector
8. Booking confirmation
9. Reschedule functionality
10. Cancel appointment

### **Phase 5: AI Camera**
1. Camera screen with overlay
2. Image picker from gallery
3. Image preview & crop
4. Upload to backend
5. AI analysis results display
6. Diagnosis history list
7. Share results feature
8. Book appointment from results

### **Phase 6: E-commerce**
1. Product categories
2. Product listing with filters
3. Product detail page
4. Shopping cart
5. Checkout flow
6. Order history
7. Order tracking
8. Product reviews
9. Wishlist

### **Phase 7: Profile**
1. Profile overview
2. Edit profile
3. Medical history management
4. Notifications list
5. Settings page
6. Logout functionality

### **Phase 8: Polish & Testing**
1. Loading states
2. Error handling
3. Empty states
4. Form validations
5. Offline support
6. Push notifications
7. Deep linking
8. Performance optimization

---

## 🔐 Security Requirements

1. **Secure Storage**: Use `expo-secure-store` for tokens
2. **API Security**: Add Authorization header to all requests
3. **Input Validation**: Validate all user inputs
4. **Biometric Auth**: Implement fingerprint/face ID (optional)
5. **SSL Pinning**: For production (optional)
6. **Auto Logout**: After 30 minutes of inactivity
7. **Token Refresh**: Implement token refresh logic

---

## 📱 Responsive Design

1. Support both iOS and Android
2. Handle different screen sizes (small phones to tablets)
3. Support both portrait and landscape
4. Safe area insets for notch devices
5. Keyboard avoiding view for forms

---

## 🚀 Performance Optimization

1. **Image Optimization**: Use FastImage for caching
2. **List Performance**: Use FlatList with proper optimization
3. **API Caching**: Implement React Query caching
4. **Lazy Loading**: Code splitting for screens
5. **Memory Management**: Proper cleanup in useEffect

---

## 📦 Dependencies to Install

```bash
# Core
npx expo install expo-router expo-status-bar

# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# UI
npm install react-native-paper react-native-vector-icons
npx expo install react-native-safe-area-context

# State Management
npm install zustand @tanstack/react-query

# API
npm install axios

# Forms
npm install react-hook-form zod @hookform/resolvers

# Camera & Images
npx expo install expo-camera expo-image-picker expo-media-library

# Storage
npx expo install expo-secure-store expo-file-system

# Notifications
npx expo install expo-notifications expo-device

# Utils
npm install date-fns
npx expo install expo-constants expo-updates
```

---

## 🧪 Testing Strategy

1. **Unit Tests**: Jest for utility functions
2. **Component Tests**: React Native Testing Library
3. **E2E Tests**: Detox (optional)
4. **Manual Testing**: Real devices (iOS + Android)

---

## 📝 Documentation Requirements

1. README.md with setup instructions
2. API documentation reference
3. Component documentation with Storybook (optional)
4. Development workflow guide
5. Deployment guide

---

## 🎯 Success Criteria

- ✅ All 5 main screens functional
- ✅ Smooth navigation between screens
- ✅ All API endpoints integrated
- ✅ Proper error handling
- ✅ Loading states implemented
- ✅ Form validations working
- ✅ Beautiful UI matching design system
- ✅ Responsive on all screen sizes
- ✅ Works offline (basic functionality)
- ✅ Push notifications working
- ✅ No performance issues
- ✅ No memory leaks

---

## 🔄 Development Workflow

1. **Setup**: Create project and install dependencies
2. **Authentication**: Build login/register flow first
3. **Navigation**: Setup navigation structure
4. **Dashboard**: Build main dashboard
5. **Features**: Implement each main feature one by one
6. **Polish**: Add animations, loading states, error handling
7. **Testing**: Test on real devices
8. **Optimization**: Optimize performance
9. **Deployment**: Build and deploy to stores

---

## 📞 Support & Resources

- Backend API: `http://localhost:4000` (Development)
- API Documentation: Available in Swagger at `/api-docs`
- Design Assets: [Provide Figma link if available]
- Brand Guidelines: SereneAI branding colors and fonts

---

## 🎨 Bottom Tab Navigation Configuration

```typescript
const tabs = [
  {
    name: 'Dashboard',
    icon: 'home',
    screen: DashboardScreen,
  },
  {
    name: 'Appointments',
    icon: 'calendar-clock',
    screen: AppointmentNavigator,
  },
  {
    name: 'AI Camera',
    icon: 'camera-plus',
    screen: CameraNavigator,
  },
  {
    name: 'Shop',
    icon: 'shopping',
    screen: EcommerceNavigator,
  },
  {
    name: 'Profile',
    icon: 'account-circle',
    screen: ProfileNavigator,
  },
];
```

---

## 🚨 Important Notes

1. **Backend Already Running**: Backend API is already implemented and running on port 4000. NO backend changes needed for Phase 1-7 (except E-commerce endpoints).

2. **E-commerce Backend**: You will need to implement ~20 e-commerce endpoints in the backend. I can provide the implementation separately.

3. **API Base URL**: 
   - Development: `http://YOUR_LOCAL_IP:4000/api`
   - Find your IP: `ifconfig` (Mac/Linux) or `ipconfig` (Windows)
   - Phone and laptop must be on same WiFi

4. **Expo Go Testing**: Use Expo Go app for development testing (scan QR code)

5. **Image Upload**: Use FormData for image uploads to backend

6. **Real-time Features**: Chat and notifications should use Socket.IO (already implemented in backend)

---

## ✅ Ready to Start!

This prompt provides everything needed to build the complete SereneAI Patient Mobile App. Follow the implementation phases sequentially, and refer to the existing backend API documentation at `http://localhost:4000/api-docs`.

**Backend Status:**
- ✅ 36 endpoints ready to use
- ❌ 20 e-commerce endpoints need implementation

**Next Steps:**
1. Create Expo project
2. Setup project structure
3. Configure API client
4. Start with Authentication flow
5. Build features phase by phase

Good luck! 🚀
