# Standar Spesialisasi Dokter Gigi Indonesia

## ✅ Daftar Spesialisasi yang Sudah Distandarisasi

Berikut adalah 10 spesialisasi dokter gigi yang sesuai dengan standar Ikatan Dokter Gigi Indonesia (PDGI):

### 1. **Ortodonti (Sp.Ort)**
- **Deskripsi**: Mengatasi masalah gigi dan rahang yang tidak sejajar, menggunakan kawat gigi atau clear aligner
- **Layanan**:
  - Pemasangan Behel/Kawat Gigi
  - Clear Aligner (Invisalign)
  - Retainer Ortodonti
  - Kontrol Behel Bulanan

### 2. **Konservasi Gigi (Sp.KG)**
- **Deskripsi**: Fokus pada perawatan gigi berlubang, saluran akar (endodontik), serta restorasi seperti penambalan atau pemasangan mahkota gigi
- **Layanan**:
  - Perawatan Saluran Akar (PSA)
  - Crown (Mahkota Gigi) Porselen
  - Inlay/Onlay
  - Veneer Komposit

### 3. **Bedah Mulut (Sp.BM)**
- **Deskripsi**: Melakukan pembedahan untuk masalah seperti gigi bungsu yang impaksi, bibir sumbing, atau operasi rahang
- **Layanan**:
  - Cabut Gigi Bungsu Impaksi
  - Operasi Bibir Sumbing
  - Operasi Rahang (Orthognathic)
  - Odontektomi

### 4. **Periodonsia (Sp.Perio)**
- **Deskripsi**: Mendiagnosis dan mengobati penyakit yang menyerang jaringan pendukung gigi, seperti gusi dan tulang rahang (gingivitis dan periodontitis)
- **Layanan**:
  - Kuretase Gusi
  - Flap Surgery
  - Gingivektomi
  - Bone Grafting

### 5. **Prostodonsia (Sp.Pros)**
- **Deskripsi**: Menangani masalah gigi yang hilang atau rusak dengan membuat dan memasang gigi tiruan, mahkota, atau implan
- **Layanan**:
  - Gigi Tiruan Sebagian Lepasan
  - Gigi Tiruan Lengkap
  - Implan Gigi
  - Bridge (Jembatan Gigi)

### 6. **Kedokteran Gigi Anak (Sp.KGA)**
- **Deskripsi**: Memberikan perawatan gigi dan mulut khusus untuk anak-anak, mulai dari bayi hingga remaja
- **Layanan**:
  - Perawatan Gigi Anak
  - Tambal Gigi Susu
  - Aplikasi Fluoride
  - Space Maintainer

### 7. **Penyakit Mulut (Sp.PM)**
- **Deskripsi**: Menangani penyakit pada jaringan lunak mulut, seperti sariawan kronis, tumor, atau kanker mulut
- **Layanan**:
  - Biopsi Jaringan Mulut
  - Pengobatan Sariawan Kronis
  - Terapi Lesi Mulut

### 8. **Radiologi Kedokteran Gigi (Sp.RKG)**
- **Deskripsi**: Bertanggung jawab untuk menganalisis dan mendiagnosis penyakit menggunakan pencitraan, seperti rontgen, CT scan, atau MRI gigi
- **Layanan**:
  - CT Scan Gigi dan Rahang
  - CBCT (Cone Beam CT)
  - Panoramik Digital

### 9. **Odontologi Forensik**
- **Deskripsi**: Dokter gigi yang memiliki keahlian khusus dalam menggunakan ilmu kedokteran gigi untuk kepentingan hukum dan identifikasi dalam kasus pidana atau bencana. Mereka bertugas melakukan identifikasi jenazah yang tidak diketahui dengan membandingkan data gigi postmortem dan antemortem, serta dapat menganalisis bekas gigitan dan mengestimasi usia
- **Layanan**:
  - Identifikasi Jenazah
  - Analisis Bekas Gigitan
  - Estimasi Usia Forensik
  - Visum Kedokteran Gigi Forensik

### 10. **Dokter Gigi Umum**
- **Deskripsi**: Dokter gigi yang menangani perawatan gigi umum dan pencegahan
- **Layanan**:
  - Konsultasi Gigi
  - Scaling (Pembersihan Karang Gigi)
  - Tambal Gigi Komposit
  - Cabut Gigi Sederhana
  - Bleaching Gigi
  - Foto Rontgen Gigi

---

## 📁 File yang Sudah Diupdate

### Backend Files:
1. ✅ `/backend/scripts/seed_comprehensive_clinics.js` - Seed script dengan 10 spesialisasi
2. ✅ `/backend/src/constants/specializations.js` - Konstanta spesialisasi untuk backend

### Web Frontend Files:
1. ✅ `/web/src/pages/auth/Register.jsx` - Form registrasi dentist
2. ✅ `/web/src/pages/clinic-portal/staff/components/AddDentistModal.jsx` - Form add dentist di clinic portal
3. ✅ `/web/src/pages/clinic-portal/public-profile/components/ServicesManagement.jsx` - Management services
4. ✅ `/web/src/pages/clinic-portal/settings/components/services-settings.jsx` - Settings services
5. ✅ `/web/src/constants/specializations.js` - Konstanta spesialisasi untuk web

---

## 🎯 Cara Penggunaan

### Di Backend (Node.js):
```javascript
import { DENTAL_SPECIALIZATIONS, SPECIALIZATION_OPTIONS } from '../constants/specializations.js';

// Untuk dropdown/select options
const specialties = SPECIALIZATION_OPTIONS;

// Untuk mendapatkan detail lengkap
const orthodontics = DENTAL_SPECIALIZATIONS.find(s => s.code === 'Sp.Ort');
console.log(orthodontics.description); // "Mengatasi masalah gigi dan rahang..."
```

### Di Web Frontend (React):
```javascript
import { DENTAL_SPECIALIZATIONS, SPECIALIZATION_OPTIONS } from '../constants/specializations';

// Di component
const specializations = SPECIALIZATION_OPTIONS;

// Render dropdown
{specializations.map(spec => (
  <option key={spec} value={spec}>{spec}</option>
))}
```

---

## 📊 Konsistensi Data

Semua spesialisasi menggunakan format yang sama:
- **Format Nama**: `Nama Spesialisasi (Kode)`
- **Contoh**: `Ortodonti (Sp.Ort)`, `Konservasi Gigi (Sp.KG)`

Ini memastikan:
- ✅ Konsistensi di seluruh aplikasi (Web, Backend, Mobile)
- ✅ Mudah di-filter berdasarkan kode
- ✅ User-friendly untuk ditampilkan
- ✅ Sesuai standar PDGI Indonesia

---

## 🔄 Migration Notes

Jika ada data lama dengan format berbeda (misal: "Orthodontics", "Periodontics"), perlu migration script untuk update ke format baru:

```sql
-- Contoh migration query
UPDATE dentist_profiles 
SET primary_specialization = 'Ortodonti (Sp.Ort)' 
WHERE primary_specialization IN ('Orthodontics', 'Ortodontik');

UPDATE dentist_profiles 
SET primary_specialization = 'Periodonsia (Sp.Perio)' 
WHERE primary_specialization IN ('Periodontics', 'Periodonsia');

-- Dan seterusnya untuk semua spesialisasi...
```

---

## ✨ Summary

Semua spesialisasi dokter gigi di SereneApps sudah disesuaikan dengan standar Indonesia (PDGI) dan tersedia di:

1. **Seed Scripts** - untuk generate data dummy
2. **Registration Forms** - untuk registrasi dentist baru
3. **Admin Panels** - untuk manage dentist oleh clinic
4. **Service Management** - untuk assign services ke specialist
5. **Constants Files** - untuk konsistensi di seluruh app

Password default untuk semua user di seed: `password123`
