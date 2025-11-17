<<<<<<< ours
# Clinic Detail Screen

This document defines the UX contract for `ClinicDetailScreen` (`mobile/src/features/appointment/screens/ClinicDetailScreen.jsx`) and the data it consumes from `mobile/src/features/appointment/data/appointments.js`.

## Hero section
- Gradient background with back button, name, rating, address, and distance.
- Quick stats pill row:
  - `tech` → example: `Digital 3D Scan`
  - `patients` → example: `2.1k pasien`
  - `operationalHours` short summary.

## Clinic entity shape
```ts
type Clinic = {
  id: string;
  name: string;
  tagline: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  phone: string;
  email: string;
  operationalHours: string;
  stats: { dentists: number; patients: string; rooms: string };
  highlights: string[];
  services: { name: string; price: number; description: string }[];
  gallery: string[];
  dentists: string[]; // array of dentist ids
};
```

## UI blocks
1. **Highlights chips** – use `clinic.tagline` + `clinic.highlights`.
2. **Services list** – show name, short description, formatted fee.
3. **Gallery carousel** – horizontal scroll of images.
4. **Dentist roster** – cards derived from `clinic.dentists` (call `getDentistById`). Each card:
   - Avatar (use `dentist.avatar`).
   - Name, specialty, rating.
   - CTA buttons: `Lihat profil` (→ DentistDetail) and `Pilih jadwal` (→ BookingSlot).
5. **Contact card** – phone + email + address button (open map later).
6. **Sticky CTA** – “Book onsite” (navigate to BookingSlot with first dentist) and “Chat clinic” placeholder.

## Data source
- `mobile/src/features/appointment/data/appointments.js` exports:
  - `CLINICS` array (see example below).
  - `getClinicById(id)` helper.
  - `getDentistById(id)` re-used for roster.

Example entry:
```js
{
  id: 'clinic-001',
  name: 'SereneAI Dental Sudirman',
  tagline: 'Digital-first smile studio',
  address: 'Jl. Jend. Sudirman No. 12, Jakarta Pusat',
  distance: '1.2 km',
  rating: 4.9,
  reviews: 276,
  phone: '+62 812-3344-5566',
  email: 'hello@sudirmandental.id',
  operationalHours: 'Setiap hari · 08:00 - 21:00',
  stats: { dentists: 6, patients: '2.1k', rooms: '8 Smart Rooms' },
  highlights: ['Digital 3D Scan', 'Sedation ready', 'Child-friendly'],
  services: [
    { name: 'Konsultasi Orthodontic', price: 280000, description: 'Penilaian komprehensif + rencana aligner' },
    { name: 'Scaling & polishing', price: 480000, description: 'Pembersihan ultrasonik + fluor' },
    { name: 'Laser whitening express', price: 950000, description: '60 menit, aman untuk enamel sensitif' },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900',
    'https://images.unsplash.com/photo-1487412720507-e75fd3b8d278?w=900',
  ],
  dentists: ['dentist-001', 'dentist-003', 'dentist-004'],
}
```

## Navigation
- Dentist cards: `navigation.navigate('DentistDetail', { dentistId, dentist })`.
- CTA “Book onsite” defaults to first dentist id.
- Hide bottom tab bar via `useFocusEffect`.
=======
# Clinic Detail Screen (Patient App)

Dokumen ini memetakan semua data yang saat ini tersedia dari backend untuk ditampilkan pada **ClinicDetailScreen** di aplikasi pasien. Sumber utama berasal dari endpoint `GET /v1/clinics/:id` beserta turunan `GET /v1/clinics/:id/dentists` dan `GET /v1/clinics/:id/services`.

## 1. Ringkasan Endpoint & Struktur Respons

| Tujuan | Endpoint | Highlight Data |
| --- | --- | --- |
| Detail klinik | `GET /v1/clinics/:id` | Nama brand, jenis fasilitas, alamat lengkap, kontak, status verifikasi, jam operasional, metadata verifikasi. 【F:backend/src/controllers/clinicsController.js†L120-L160】|
| Daftar dokter | `GET /v1/clinics/:id/dentists` | Profil dokter per klinik termasuk spesialisasi, pengalaman, biaya konsultasi, status verifikasi. 【F:backend/src/controllers/clinicsController.js†L170-L254】|
| Layanan klinik | `GET /v1/clinics/:id/services` | Saat ini mengembalikan array kosong + pesan placeholder (belum ada tabel layanan). 【F:backend/src/controllers/clinicsController.js†L260-L301】|

Jam operasional disimpan dalam kolom JSON dengan struktur per-hari (`open`, `close`, `isOpen`) yang dipakai sebagai dasar logika open/closed di UI. 【F:backend/migrations/006_add_clinic_profile.sql†L5-L59】【F:backend/migrations/006_add_clinic_profile.sql†L126-L128】

## 2. Susunan Konten Layar

### 2.1 Header Klinik
- **Nama Brand** (`name`) – headline utama layar. 【F:backend/src/controllers/clinicsController.js†L125-L140】
- **Jenis Fasilitas** (`facility_type`) – tampilkan label seperti *Klinik Gigi* atau *RSGM*. 【F:backend/src/controllers/clinicsController.js†L125-L140】
- **Status Verifikasi** (`is_verified`, `verification_date`) – gunakan badge "Verified Clinic" jika true, serta tooltip tanggal verifikasi. 【F:backend/src/controllers/clinicsController.js†L142-L144】
- **CTA Booking** – gunakan label dari terjemahan `clinics.details.bookHere`. 【F:mobile-translations/en.json†L219-L237】

### 2.2 Tab "About"
- **Nama Legal** (`legal_name`) – tampilkan sebagai subjudul atau detail resmi. 【F:backend/src/controllers/clinicsController.js†L125-L140】
- **Deskripsi Fasilitas** – saat ini belum ada field deskripsi, gunakan fallback teks seperti "Belum ada deskripsi" atau copy marketing jika tersedia di CMS lain.
- **Status Operasional** – hitung dari `operating_hours` + timezone (`timezone`). Dapat menampilkan chip "Open Now" atau "Closed Now" berdasarkan jam saat ini. 【F:backend/src/controllers/clinicsController.js†L135-L138】【F:backend/migrations/006_add_clinic_profile.sql†L21-L28】

### 2.3 Tab "Services"
- Endpoint mengembalikan `services: []` plus pesan placeholder sehingga UI dapat menampilkan state "Coming Soon". 【F:backend/src/controllers/clinicsController.js†L285-L296】
- Siapkan kartu kosong atau ilustrasi sampai tabel layanan tersedia.

### 2.4 Tab "Dentists"
Gunakan `GET /v1/clinics/:id/dentists` untuk mengisi daftar dokter dalam klinik.
- **Nama & Gelar** (`name`, `title`) – teks utama tiap kartu. 【F:backend/src/controllers/clinicsController.js†L213-L226】
- **Spesialisasi Utama** (`specialization`) – tampilkan di bawah nama. 【F:backend/src/controllers/clinicsController.js†L220-L227】
- **Pengalaman** (`years_of_experience`) – konversi ke teks "{{years}} tahun pengalaman" atau versi Inggris. 【F:backend/src/controllers/clinicsController.js†L221-L224】【F:mobile-translations/en.json†L247-L255】
- **Biaya Konsultasi** (`consultation_fee`) – format ke rupiah. 【F:backend/src/controllers/clinicsController.js†L225-L226】
- **Atribut Lain**: status verifikasi (`dp.is_verified`), penerimaan asuransi (`accepts_insurance`, `accepts_bpjs`), ketersediaan darurat (`emergency_availability`), avatar dokter (`avatar_url`). 【F:backend/src/controllers/clinicsController.js†L217-L231】
- **Pagination** – gunakan `data.pagination` untuk infinite scroll / tombol "Load more". 【F:backend/src/controllers/clinicsController.js†L243-L252】

### 2.5 Tab "Operating Hours"
- Render per hari menggunakan struktur JSON `operating_hours`. Tampilkan status `open`/`closed` dan jam `open`-`close`. 【F:backend/src/controllers/clinicsController.js†L135-L138】【F:backend/migrations/006_add_clinic_profile.sql†L23-L28】【F:mobile-translations/en.json†L238-L245】
- Bila suatu hari `isOpen: false`, tampilkan "Closed".

### 2.6 Tab "Location"
- **Alamat Lengkap** (`address`, `city`, `province`, `postal_code`) – satukan menjadi format alamat siap copy. 【F:backend/src/controllers/clinicsController.js†L129-L134】
- **Pin Peta** – gunakan geocoding eksternal berdasarkan alamat (belum ada koordinat dari API).
- **Cabang** – API belum mengembalikan data cabang. Bila dibutuhkan, perlu endpoint tambahan yang memaparkan `clinic_branches`. 【F:backend/migrations/006_add_clinic_profile.sql†L61-L95】

### 2.7 Tab "Contact"
- **Nomor Telepon** (`phone_number`) – sediakan tombol tap-to-call. 【F:backend/src/controllers/clinicsController.js†L133-L135】
- **Email** (`email`) – buka composer email.
- **WhatsApp Owner** (`owner_whatsapp`) – karena `GET /v1/clinics/:id` mengembalikan field ini, validasi dulu sebelum menampilkan ke pasien (opsional, per kebijakan privasi). 【F:backend/src/controllers/clinicsController.js†L138-L142】
- **PIC Name** (`owner_name`, `owner_position`) – bisa muncul sebagai "Contact Person" bila ingin menampilkan representatif klinik. 【F:backend/src/controllers/clinicsController.js†L138-L142】

### 2.8 Tab "Reviews" & "Facilities"
- Belum ada data dari API. Gunakan placeholder state hingga modul rating dan fasilitas terpublikasi.
- Untuk "Facilities", referensi potensial berasal dari tabel `clinic_branches` (`treatment_rooms_count`, `has_sterilization`, `has_radiography`) apabila nanti diekspos. 【F:backend/migrations/006_add_clinic_profile.sql†L61-L95】

## 3. Experience Notes untuk UI/UX
1. **State Loading & Error** – tangani error `CLINIC_NOT_FOUND` dari endpoint detail sehingga layar menampilkan empty state atau kembali ke daftar. 【F:backend/src/controllers/clinicsController.js†L152-L160】
2. **Badge dan Copywriting** – gunakan kunci lokal `clinics.details` untuk judul tab, `clinics.hours` untuk label status buka/tutup. 【F:mobile-translations/en.json†L219-L245】
3. **Future-proof Services & Reviews** – desain modul agar mudah mengonsumsi data saat tabel layanan/review tersedia tanpa refactor besar.

## 4. Checklist Implementasi
- [ ] Integrasi data detail klinik dan jam operasional.
- [ ] Render daftar dokter dengan pagination dan filter spesialisasi (opsional).
- [ ] Tangani placeholder Services/Reviews.
- [ ] Tambahkan CTA booking yang mengarah ke flow appointment dengan pre-filled `clinicId`.
- [ ] Audit privasi sebelum menampilkan kontak PIC (owner).

Dokumen ini dapat menjadi panduan lintas tim (produk, desain, mobile, QA) untuk memastikan ClinicDetailScreen menampilkan data yang konsisten dengan kontrak backend saat ini.
>>>>>>> theirs
