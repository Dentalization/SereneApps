# 🗄️ Database Schema: PatientProfile

## Table Structure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PATIENT_PROFILES TABLE                   │
├─────────────────────────────────────────────────────────────┤
│ Primary Key: id (BIGSERIAL)                                 │
│ Foreign Key: user_id → users(id) ON DELETE CASCADE          │
│ Unique Constraint: user_id (one profile per user)           │
├─────────────────────────────────────────────────────────────┤
│ COLUMN NAME           │ TYPE        │ NULLABLE │ DEFAULT    │
├─────────────────────────────────────────────────────────────┤
│ id                    │ BIGSERIAL   │ NO       │ auto       │
│ user_id               │ BIGINT      │ NO       │ -          │
│ date_of_birth         │ DATE        │ YES      │ NULL       │
│ gender                │ TEXT        │ YES      │ NULL       │
│ insurance_provider    │ TEXT        │ YES      │ NULL       │
│ insurance_number      │ TEXT        │ YES      │ NULL       │
│ insurance_member_id   │ TEXT        │ YES      │ NULL       │
│ emergency_contact     │ JSONB       │ YES      │ NULL       │
│ address               │ JSONB       │ YES      │ NULL       │
│ medical_details ⚠️    │ JSONB       │ YES      │ NULL       │
│ preferred_language    │ TEXT        │ NO       │ 'id'       │
│ created_at            │ TIMESTAMPTZ │ NO       │ now()      │
│ updated_at            │ TIMESTAMPTZ │ NO       │ now()      │
└─────────────────────────────────────────────────────────────┘

Indexes:
  - idx_patient_profiles_user_id (user_id)
  - idx_patient_profiles_insurance_number (insurance_number)
```

---

## JSONB Field Details

### 1. 🚨 `medical_details` - CRITICAL FOR PATIENT SAFETY

```json
{
  "allergies": [
    "Penicillin",        // ⚠️ CRITICAL: Prevent anaphylaxis
    "Aspirin",
    "Latex"
  ],
  "chronicConditions": [
    "Diabetes Type 2",   // ⚠️ Affects healing, anesthesia dosage
    "Hypertension",      // ⚠️ BP monitoring required
    "Heart Disease"      // ⚠️ Consult before procedures
  ],
  "medications": [
    "Metformin 500mg 2x/day",
    "Warfarin 5mg 1x/day"  // ⚠️ CRITICAL: Blood thinner - stop before surgery!
  ],
  "notes": "Riwayat gigi sensitif. Pernah operasi cabut gigi bungsu 2020."
}
```

**Why CRITICAL?**
- 🩸 **Allergies**: Prevent fatal allergic reactions during treatment
- 💊 **Medications**: Avoid drug interactions (e.g., Warfarin + Aspirin = bleeding risk)
- 🏥 **Chronic Conditions**: Adjust treatment plan (diabetics heal slower)
- ⚡ **Emergency Info**: Quick reference during emergencies

---

### 2. 📞 `emergency_contact` - REQUIRED FOR SAFETY

```json
{
  "name": "Jane Doe",
  "phone": "+628987654321",
  "relationship": "Istri"
}
```

**When Used?**
- Patient experiences complications during treatment
- Allergic reaction or medical emergency
- Patient needs transportation after sedation
- Follow-up care coordination

---

### 3. 🏠 `address` - OPTIONAL

```json
{
  "line1": "Jl. Sudirman No. 123",
  "line2": "RT 005 RW 012, Karet Tengsin",
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "postalCode": "12920"
}
```

---

## Data Relationships

```
┌────────────┐
│   USERS    │ (Basic account info)
├────────────┤
│ id         │◄─────┐
│ name       │      │
│ email      │      │ ONE-TO-ONE
│ password   │      │
│ roles      │      │
│ phone      │      │
└────────────┘      │
                    │
                    │
        ┌───────────┴──────────────┐
        │   PATIENT_PROFILES       │ (Extended patient data)
        ├──────────────────────────┤
        │ user_id (FK, UNIQUE)     │
        │ date_of_birth            │
        │ gender                   │
        │ insurance_provider       │
        │ emergency_contact (JSONB)│
        │ medical_details (JSONB)  │ ◄─── CRITICAL FOR DENTIST
        └──────────────────────────┘
                    │
                    │ Used in
                    ▼
        ┌──────────────────────────┐
        │    APPOINTMENTS          │
        ├──────────────────────────┤
        │ patient_id (FK)          │
        │ dentist_id (FK)          │
        │ starts_at                │
        │ reason                   │
        │ notes                    │
        └──────────────────────────┘
```

---

## Mobile App Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   MOBILE APP REGISTRATION                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Step 1: Basic Information    │
          ├────────────────────────────────┤
          │ • Name ✓                       │
          │ • Email ✓                      │
          │ • Password ✓                   │
          │ • Phone ✓                      │
          │ • Date of Birth ✓              │
          │ • Gender ✓                     │
          └────────────────────────────────┘
                           │
                           ▼
                POST /api/auth/patient/register
                           │
                           ▼
          ┌────────────────────────────────┐
          │  BACKEND: Create User (users)  │
          ├────────────────────────────────┤
          │ INSERT INTO users              │
          │   (name, email, password_hash, │
          │    roles=['patient'], phone)   │
          │ RETURNING id                   │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ Step 2: Medical Information ⚠️ │
          ├────────────────────────────────┤
          │ • Allergies (array) ✓          │
          │ • Chronic Conditions (array)   │
          │ • Current Medications (array)  │
          │ • Medical Notes (text)         │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Step 3: Insurance (optional) │
          ├────────────────────────────────┤
          │ • Provider                     │
          │ • Insurance Number             │
          │ • Member ID                    │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │  Step 4: Emergency Contact ✓   │
          ├────────────────────────────────┤
          │ • Name ✓                       │
          │ • Phone ✓                      │
          │ • Relationship ✓               │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Step 5: Address (optional)   │
          ├────────────────────────────────┤
          │ • Line 1, Line 2               │
          │ • City, Province               │
          │ • Postal Code                  │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │ BACKEND: Create PatientProfile │
          ├────────────────────────────────┤
          │ INSERT INTO patient_profiles   │
          │   (user_id,                    │
          │    date_of_birth,              │
          │    gender,                     │
          │    emergency_contact::jsonb,   │
          │    medical_details::jsonb,     │
          │    ...)                        │
          └────────────────────────────────┘
                           │
                           ▼
          ┌────────────────────────────────┐
          │   Return JWT Tokens + User     │
          ├────────────────────────────────┤
          │ {                              │
          │   accessToken: "...",          │
          │   refreshToken: "...",         │
          │   user: { id, name, email },   │
          │   patientProfile: { ... }      │
          │ }                              │
          └────────────────────────────────┘
```

---

## Critical Medical Data Examples

### ⚠️ High-Risk Allergies (Immediate Action Required)

```sql
-- Patients allergic to common dental anesthetics
SELECT u.name, u.email, u.phone_number, 
       pp.medical_details->'allergies' as allergies
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'allergies' ?| array['Lidocaine', 'Benzocaine', 'Epinephrine'];
```

### 🩸 Bleeding Risk Patients (Stop Medications Before Surgery)

```sql
-- Patients on blood thinners (MUST consult before extraction/surgery)
SELECT u.name, u.email, 
       pp.medical_details->'medications' as medications,
       pp.medical_details->'chronicConditions' as conditions
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'medications'::text ~* 'warfarin|aspirin|clopidogrel|rivaroxaban'
   OR pp.medical_details->'chronicConditions' ?| array['Hemophilia', 'Bleeding Disorder'];
```

### 💉 Diabetic Patients (Adjust Appointment Timing & Dosage)

```sql
-- Diabetic patients (schedule appointments post-meal, adjust anesthesia)
SELECT u.name, 
       EXTRACT(YEAR FROM AGE(pp.date_of_birth)) as age,
       pp.medical_details->'chronicConditions' as conditions,
       pp.medical_details->'medications' as medications
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'chronicConditions' ?| array['Diabetes Type 1', 'Diabetes Type 2'];
```

### 🤰 Pregnant Patients (No X-rays, Limited Medications)

```sql
-- Pregnant patients (special care required)
SELECT u.name, u.phone_number,
       pp.date_of_birth,
       pp.medical_details
FROM patient_profiles pp
JOIN users u ON u.id = pp.user_id
WHERE pp.medical_details->'chronicConditions' ? 'Pregnancy'
   OR pp.medical_details->'notes'::text ~* 'pregnant|pregnancy|hamil';
```

---

## Validation Checklist for Mobile App

### Before Registration Submit:

- [ ] **Basic Info**
  - [ ] Name: min 2 chars
  - [ ] Email: valid format + unique
  - [ ] Password: min 8 chars, uppercase, lowercase, number
  - [ ] Phone: format `+628XXXXXXXXXX`
  - [ ] DOB: valid date, age between 1-120
  - [ ] Gender: one of ['male', 'female', 'other']

- [ ] **Medical Info (CRITICAL)**
  - [ ] Allergies: array (can be empty [])
  - [ ] At least ask: "Do you have any allergies?" with checkbox "No allergies"
  - [ ] Chronic Conditions: array (can be empty [])
  - [ ] Medications: array with format "Name + Dosage + Frequency"
  - [ ] Notes: max 2000 chars

- [ ] **Emergency Contact (REQUIRED)**
  - [ ] Name: min 2 chars
  - [ ] Phone: format `+628XXXXXXXXXX`
  - [ ] Relationship: not empty

- [ ] **Insurance (Optional but Recommended)**
  - [ ] Provider name
  - [ ] Insurance number
  - [ ] Member ID

- [ ] **Address (Optional)**
  - [ ] City and Province (for clinic search proximity)

---

## Backend API Example

```javascript
// POST /api/auth/patient/register

// Request Body
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone_number": "+628123456789",
  "dateOfBirth": "1995-06-15",
  "gender": "male",
  
  // Medical Info - CRITICAL
  "allergies": ["Penicillin", "Aspirin"],
  "chronicConditions": ["Diabetes Type 2"],
  "medications": ["Metformin 500mg 2x/day"],
  "medicalNotes": "Riwayat gigi sensitif",
  
  // Emergency Contact - REQUIRED
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+628987654321",
  "emergencyContactRelationship": "Istri",
  
  // Insurance - Optional
  "insuranceProvider": "BPJS Kesehatan",
  "insuranceNumber": "0001234567890",
  "insuranceMemberId": "0001234567890",
  
  // Address - Optional
  "addressLine1": "Jl. Sudirman No. 123",
  "city": "Jakarta Selatan",
  "province": "DKI Jakarta",
  "postalCode": "12920",
  
  "preferredLanguage": "id"
}

// Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": 456,
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["patient"],
    "phone_number": "+628123456789"
  },
  "patientProfile": {
    "id": 789,
    "userId": 456,
    "dateOfBirth": "1995-06-15",
    "gender": "male",
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+628987654321",
      "relationship": "Istri"
    },
    "medicalDetails": {
      "allergies": ["Penicillin", "Aspirin"],
      "chronicConditions": ["Diabetes Type 2"],
      "medications": ["Metformin 500mg 2x/day"],
      "notes": "Riwayat gigi sensitif"
    },
    "insuranceProvider": "BPJS Kesehatan",
    "insuranceNumber": "0001234567890"
  }
}
```

---

## Summary

### ✅ Database is Ready!

**Current Status:**
- ✅ Table `patient_profiles` exists (migration 011)
- ✅ All required fields present
- ✅ JSONB fields for flexible medical data
- ✅ Indexes on `user_id` and `insurance_number`
- ✅ Foreign key constraint to `users` table
- ✅ Auto-update trigger on `updated_at`

**Field Coverage:**
- ✅ Basic: DOB, gender (2 fields)
- ✅ Insurance: provider, number, member ID (3 fields)
- ✅ Emergency Contact: JSONB (name, phone, relationship)
- ✅ Address: JSONB (line1, line2, city, province, postalCode)
- ✅ Medical Details: JSONB (allergies[], conditions[], medications[], notes)
- ✅ Preferences: language (id/en)

**Total Data Points:** 20+ fields available for patient information

**Critical for Dentist:**
1. 🚨 **medical_details.allergies** → Prevent fatal reactions
2. 💊 **medical_details.medications** → Avoid drug interactions
3. 🏥 **medical_details.chronicConditions** → Adjust treatment plan
4. 📞 **emergency_contact** → Call in emergencies
5. 📅 **dateOfBirth** → Calculate age for dosage

**Next Steps for Mobile App:**
1. Implement multi-step registration form (5 steps)
2. Add medical info suggestions (common allergies, conditions)
3. Validate all fields before submission
4. Store tokens securely (expo-secure-store)
5. Show medical data in appointment booking (remind to update if old)
