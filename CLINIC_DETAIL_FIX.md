# Fix untuk Error 500 pada Clinic Detail Endpoint

## Masalah
Backend Node.js/PostgreSQL mengembalikan error 500 saat mengambil detail klinik (`GET /clinics/:id`). 
Error yang tercatat: `relation "clinic_gallery" does not exist`

## Root Cause
1. Query di `clinicsController.js` menggunakan **LATERAL JOIN** dengan subquery kompleks
2. Query mencoba mengakses tabel `clinic_gallery`, `clinic_highlights`, `clinic_facilities` secara langsung dalam LATERAL subquery
3. Jika tabel tidak ada atau query gagal pada bagian tertentu, seluruh query gagal dengan 500 error
4. Tidak ada error handling untuk kasus tabel tidak ada atau kosong

## Solusi yang Diterapkan

### 1. Refactor Query menjadi Separate Queries dengan Error Handling
**File:** `/backend/src/controllers/clinicsController.js`

**Perubahan:**
- ❌ **Hapus:** Query kompleks dengan LATERAL JOIN yang mereference beberapa tabel sekaligus
- ✅ **Gunakan:** Separate queries untuk:
  - Branch data (clinic_branches + clinic_profiles)
  - Dentist count (clinic_staff)
  - Gallery images (clinic_gallery)
  - Highlights (clinic_highlights)
  - Facilities (clinic_facilities)
  - Services (clinic_services)
  - Doctors (clinic_staff + dentist_profiles)

**Keuntungan:**
- Setiap query dibungkus dalam try-catch block terpisah
- Jika satu query gagal (mis. tabel tidak ada), query lainnya tetap berjalan
- Fallback: field yang gagal di-fetch akan return empty array/null bukannya 500 error
- Logging detail untuk each query memudahkan debugging

**Kode Pattern:**
```javascript
// Gallery
try {
  const galleryQuery = `SELECT ... FROM clinic_gallery ...`;
  const galleryResult = await query(galleryQuery, [row.branch_id]);
  clinicData.gallery = galleryResult.rows.map(img => ({...}));
} catch (err) {
  console.error('⚠️ Error fetching gallery:', err.message);
  clinicData.gallery = []; // Fallback to empty array
}

// Highlights
try {
  const highlightsQuery = `SELECT ... FROM clinic_highlights ...`;
  const highlightsResult = await query(highlightsQuery, [row.branch_id]);
  clinicData.highlights = highlightsResult.rows.map(h => ({...}));
} catch (err) {
  console.error('⚠️ Error fetching highlights:', err.message);
  clinicData.highlights = []; // Fallback to empty array
}

// Similar pattern for facilities, services, dentists
```

### 2. Ensure Tabel-tabel Ada di Database
**File:** `/backend/ensure_gallery_tables.sql`

Script SQL untuk memastikan tabel-tabel ada:
- ✅ `clinic_gallery` - untuk foto klinik
- ✅ `clinic_highlights` - untuk highlight/keunggulan klinik
- ✅ `clinic_facilities` - untuk fasilitas klinik

**Struktur Tabel:**

**clinic_gallery:**
```sql
- id (BIGSERIAL PRIMARY KEY)
- clinic_branch_id (FOREIGN KEY → clinic_branches)
- image_url (TEXT NOT NULL)
- image_type (VARCHAR: 'hero', 'cover', 'facility', 'general')
- caption (TEXT)
- display_order (INTEGER)
- is_active (BOOLEAN DEFAULT true)
- created_at, updated_at (TIMESTAMP)
```

**clinic_highlights:**
```sql
- id (BIGSERIAL PRIMARY KEY)
- clinic_branch_id (FOREIGN KEY → clinic_branches)
- highlight_text (VARCHAR NOT NULL)
- icon (VARCHAR)
- display_order (INTEGER)
- is_active (BOOLEAN DEFAULT true)
- created_at, updated_at (TIMESTAMP)
```

**clinic_facilities:**
```sql
- id (BIGSERIAL PRIMARY KEY)
- clinic_branch_id (FOREIGN KEY → clinic_branches)
- facility_name (VARCHAR NOT NULL)
- description (TEXT)
- icon (VARCHAR)
- display_order (INTEGER)
- is_active (BOOLEAN DEFAULT true)
- created_at, updated_at (TIMESTAMP)
```

## Implementasi

### Step 1: Jalankan SQL untuk Ensure Tabel Ada
```bash
psql -d sereneapps_dev -f backend/ensure_gallery_tables.sql
```

Atau jika sudah ada migration 027, tabel sudah ada dan query akan skip dengan `CREATE TABLE IF NOT EXISTS`.

### Step 2: Restart Backend Server
```bash
cd backend
npm start
```

### Step 3: Test Endpoint
```bash
curl http://localhost:3001/api/v1/clinics/1
```

**Expected Response (Success - Status 200):**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Klinik Gigi Sehat",
    "address": "Jl. Merdeka 123",
    "city": "Jakarta",
    "rating": 4.5,
    "reviews": 120,
    "gallery": [],  // Empty array jika tidak ada foto, bukan error
    "highlights": [],
    "facilities": [],
    "services": [],
    "doctors": [],
    "openStatus": "Buka",
    "isOpenNow": true
  }
}
```

**Expected Response (Not Found - Status 404):**
```json
{
  "success": false,
  "error": "Clinic not found"
}
```

## Behavior Sebelum vs Sesudah

| Skenario | Sebelum | Sesudah |
|----------|---------|---------|
| Klinik ada, gallery kosong | ❌ Error 500 | ✅ Status 200, gallery: [] |
| Tabel clinic_gallery tidak ada | ❌ Error 500 | ✅ Status 200, gallery: [] |
| Klinik tidak ada | ❌ Error 500 | ✅ Status 404, message: not found |
| Beberapa kolom query gagal | ❌ Error 500 | ✅ Status 200, failed fields: empty array |
| Dentist count query gagal | ❌ Error 500 | ✅ Status 200, default values |

## Logs untuk Debugging

Setiap query yang dijalankan sekarang mencatat detail level:

```
🏥 [getClinicById] Fetching clinic with ID: 1
🔍 [getClinicById] Executing branch query for ID: 1
✅ [getClinicById] Found branch: 1
🔍 [getClinicById] Fetching dentist count for clinic_profile_id: 5
✅ [getClinicById] Found 3 dentists
🖼️ [getClinicById] Fetching gallery for branch_id: 1
✅ [getClinicById] Found 2 gallery images
⭐ [getClinicById] Fetching highlights for branch_id: 1
⚠️ [getClinicById] Error fetching highlights: relation "clinic_highlights" does not exist
(Continues gracefully with empty highlights array)
🏥 [getClinicById] Fetching facilities for branch_id: 1
✅ [getClinicById] Found 4 facilities
📋 [getClinicById] Fetching services for branch_id: 1
✅ [getClinicById] Found 5 services
👨‍⚕️ [getClinicById] Fetching dentists for clinic_profile_id: 5 branch_id: 1
✅ [getClinicById] Found 3 dentists for branch 1
✅ [getClinicById] Returning clinic data with all nested data
```

## Verifikasi

### Periksa apakah tabel ada:
```sql
\dt clinic_gallery
\dt clinic_highlights
\dt clinic_facilities
```

### Periksa struktur tabel:
```sql
\d clinic_gallery
\d clinic_highlights
\d clinic_facilities
```

### Cek data di tabel:
```sql
SELECT COUNT(*) FROM clinic_gallery;
SELECT COUNT(*) FROM clinic_highlights;
SELECT COUNT(*) FROM clinic_facilities;
```

## Testing Checklist

- [ ] Run `ensure_gallery_tables.sql` untuk create tables
- [ ] Restart backend server (`npm start`)
- [ ] Test GET /clinics/1 - should return 200 (bukan 500)
- [ ] Check backend logs - should see detailed query logs
- [ ] Add sample gallery/highlights/facilities data
- [ ] Test clinic detail screen di mobile app
- [ ] Verify gallery images load correctly di UI
- [ ] Test dengan clinic yang tidak punya gallery - should show empty array

## Notes

- Gallery, highlights, dan facilities sekarang **optional** - jika data tidak ada, endpoint tetap return clinic data
- Sebelumnya, jika satu tabel missing, seluruh endpoint gagal 500
- Sekarang, setiap bagian robust dengan fallback value
- Migration 027 sudah define struktur tabel - pastikan sudah di-run
