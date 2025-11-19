# SereneAI - Petunjuk Setup Database dan Backend

## 🚨 PENTING! Backend dan Database Perlu Update

Form registrasi yang telah dibuat memiliki **25+ field** untuk data dokter gigi, tetapi backend dan database saat ini hanya mendukung **3 field** dasar (name, email, password).

## 📋 Yang Sudah Dibuat:

### ✅ Frontend (Complete)
- Multi-step registration form dengan validasi lengkap
- 25+ field sesuai kebutuhan dokter gigi
- Validasi SIP, STR, experience, dll
- UI/UX yang professional

### ❌ Backend & Database (Perlu Update)
- Database schema hanya support basic fields
- Backend route tidak handle field tambahan
- Perlu migration baru dan update logic

---

## 🛠️ Langkah-Langkah Setup:

### 1. **Update Database**
```bash
cd backend
npm run migrate
```

### 2. **Verifikasi Migration**
Login ke database dan cek:
```sql
-- Cek tabel users sudah ada kolom baru
\d users

-- Cek tabel dentist_profiles sudah dibuat
\d dentist_profiles

-- Cek indexes
\di
```

### 3. **Test Backend**
```bash
cd backend
npm run dev
```

### 4. **Test Frontend Registration**
- Buka http://localhost:3000/register
- Isi form registrasi lengkap
- Submit dan cek di database:

```sql
-- Cek data user
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;

-- Cek data profile dokter
SELECT * FROM dentist_profiles ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 Database Schema Baru:

### **users table** (updated)
- Tambah: `phone_number`, `about`

### **dentist_profiles table** (new)
- **Professional Info**: title, license_number, license_issuing_body, license_expiry_date, registration_number, specialization, education, experience
- **Clinic Info**: clinic_name, clinic_address, working_hours, consultation_types[], services_offered[]
- **Optional Info**: consultation_fee, accepts_insurance, accepts_bpjs, emergency_availability
- **Verification**: is_verified, verification_date
- **Constraints**: Unique license_number dan registration_number

---

## 🔧 Files yang Sudah Diupdate:

1. **`/backend/migrations/002_add_dentist_profile.sql`** - Schema baru
2. **`/backend/src/routes/auth.js`** - Register endpoint lengkap
3. **`/src/services/authService.js`** - Frontend service update
4. **`/src/pages/auth/Register.jsx`** - Form registrasi lengkap

---

## ⚠️ Testing Checklist:

- [ ] Migration berhasil dijalankan
- [ ] Backend bisa receive semua field
- [ ] Frontend bisa submit form lengkap
- [ ] Data tersimpan di kedua tabel
- [ ] Validasi berjalan dengan benar
- [ ] Error handling bekerja
- [ ] Unique constraints ditegakkan (SIP, STR)

---

## 🚀 Next Steps:

1. **Immediate**: Jalankan migration dan test full flow
2. **Short-term**: Buat API untuk update profile dokter
3. **Medium-term**: Implement verification workflow
4. **Long-term**: Add file upload untuk dokumen SIP/STR
