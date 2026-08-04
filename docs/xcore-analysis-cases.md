# X-Core Analysis Cases

## Ringkasan arsitektur

`xcore_analysis_cases` tetap menjadi agregat analisis tingkat pasien. Item kasus menunjuk ke `imaging_studies` dan, bila tersedia, `imaging_series`. Anotasi serta pengukuran tidak disalin selama editing: keduanya tetap memakai `study_annotations` dengan scope `study_id + series_uid + viewer_type`.

Peningkatan report render menggunakan tabel `xcore_analysis_case_item_renders` sebagai riwayat immutable render per item:

- `CLEAN`: radiografi dan window/level tanpa overlay laporan.
- `ANNOTATED`: radiografi yang sama dengan anotasi, pengukuran, scale bar, dan marker bernomor.

Kolom lama `render_storage_path` dan `render_checksum` tetap dipertahankan sebagai pointer kompatibilitas ke render `ANNOTATED` terbaru. Render lama yang belum mempunyai metadata canonical ditampilkan sebagai `LEGACY` dan harus diperbarui sebelum report versi baru dibuat.

## Canonical report render

Viewer tidak lagi mengirim screenshot viewport untuk Analysis Case:

1. Viewer menyimpan anotasi/pengukuran yang masih pending.
2. Offscreen canvas ditentukan dari dimensi intrinsik radiografi atau dimensi fisik volume.
3. Mode render selalu `fit image`, mempertahankan aspect ratio, maksimum sisi 2400 piksel, dan tidak memperbesar sumber 2D beresolusi rendah.
4. `CLEAN` diambil sebelum overlay.
5. `ANNOTATED` menambahkan overlay existing dan marker berdasarkan `structured_findings[].annotation_id`.
6. Backend menghitung fingerprint dari item, temuan, dan anotasi tersimpan. Fingerprint ini menjadi sumber status `READY`, `STALE`, `MISSING`, `LEGACY`, atau `INVALID`.

Metadata render menyimpan dimensi sumber/render, viewer type, window center/width, invert, rotasi, slice index/axis, view mode, pixel spacing, waktu render, marker count, dan fingerprint backend.

## Marker dan temuan

`xcore_analysis_case_items.structured_findings` adalah array temuan yang tidak menduplikasi geometry anotasi. Setiap entry menyimpan:

- ID temuan UUID yang stabil.
- `marker_number`, unik di dalam satu radiografi.
- `annotation_id` sebagai lokasi marker.
- `measurement_id` opsional.
- regio, nomor gigi, judul, uraian, jenis anotasi, dan urutan.

Nomor dapat dimulai kembali dari `1` pada radiografi berikutnya. Backend menolak marker tanpa anotasi pasangan, annotation ID lintas scope, nomor duplikat, uraian kosong, dan marker count render yang tidak cocok.

## Validasi render

Backend mendecode PNG/JPEG dengan Sharp dan memeriksa:

- format aktual sesuai MIME;
- minimum 256×256, maksimum 40 megapiksel, maksimum 18 MB;
- ukuran file masuk akal;
- luminance mean, variance, entropy, fraksi hitam/putih, dan bounding box konten;
- area kosong viewport tidak mendominasi;
- scope case/item/study/series/viewer dan pemilik kasus sesuai.

Radiografi dominan gelap tetap diterima apabila mempunyai variance dan entropy yang menunjukkan struktur nyata. Error mempunyai kode spesifik seperti `render_dimensions_too_small`, `render_nearly_uniform`, `render_empty_area_dominant`, `render_scope_mismatch`, atau `render_marker_count_mismatch`.

## Endpoint

- `GET /api/v1/x-core/analysis-cases`
- `POST /api/v1/x-core/analysis-cases`
- `GET /api/v1/x-core/analysis-cases/:caseId`
- `PUT /api/v1/x-core/analysis-cases/:caseId`
- `PUT /api/v1/x-core/analysis-cases/:caseId/items/:itemId/render`
- `GET /api/v1/x-core/analysis-cases/:caseId/reports/preflight`
- `POST /api/v1/x-core/analysis-cases/:caseId/reports`
- `GET /api/v1/x-core/analysis-cases/:caseId/reports/:reportId/pdf`

Payload render versi 2:

```json
{
  "renders": {
    "CLEAN": { "data_url": "data:image/png;base64,...", "metadata": { "report_render_version": 2 } },
    "ANNOTATED": { "data_url": "data:image/png;base64,...", "metadata": { "report_render_version": 2, "marker_count": 1 } }
  }
}
```

Endpoint lama dengan `render_data_url` masih diterima, tetapi hasilnya ditandai legacy dan tidak lolos preflight laporan baru.

Semua endpoint membutuhkan bearer authentication. Mutasi dan pembacaan kasus dibatasi ke pembuat kasus. Item harus benar-benar anggota kasus, studi/series diverifikasi melalui policy akses X-Core existing, dan pasien seluruh item harus konsisten.

## PDF dan immutability

PDFKit backend tetap menjadi satu-satunya generator Analysis Case. PDF memakai satu render `ANNOTATED` aktual per radiografi:

- pembuka portrait berisi identitas yang tersedia, konteks klinis, status, versi, dan ringkasan citra;
- periapikal portrait dengan citra besar;
- panoramik landscape full-width;
- bitewing/sefalometrik/other memilih orientasi dari aspect ratio;
- slice quad memakai landscape composite;
- marker pada citra dipasangkan dengan daftar temuan bernomor;
- pengukuran dideduplikasi berdasarkan ID;
- header, footer, dan `Halaman X dari Y` ditambahkan ke seluruh halaman;
- label memakai Bahasa Indonesia dan key teknis tidak dirender sebagai label pengguna.

Preflight menolak render missing, legacy, stale, atau invalid. Generate memakai PostgreSQL advisory transaction lock agar dua proses tidak mendaftarkan version number yang sama. Setiap report menyimpan snapshot header, snapshot item relasional, structured findings, annotation/measurement snapshot, metadata render, storage path, dan checksum. Perubahan berikutnya tidak menulis ulang versi lama.

## Alur pengguna

1. Simpan item dan temuan terstruktur di workspace.
2. Pilih anotasi lokasi untuk setiap marker.
3. Buka viewer melalui **Perbarui Gambar Laporan**.
4. Selesaikan anotasi/pengukuran lalu simpan canonical render.
5. Pastikan semua item berstatus **Siap untuk laporan**.
6. Pilih **Buat PDF laporan**. UI menjalankan preflight dan menunjukkan item yang perlu diperbarui.

## Migration dan menjalankan aplikasi

Migration tambahan: `backend/migrations/061_enhance_xcore_report_render.sql`.

```bash
cd backend
npm run migrate
npm start
```

```bash
cd web
npm start
```

## Verifikasi

```bash
cd backend
node --test tests/xcore-analysis-case.test.js tests/xcore-analysis-pdf-visual.test.js
npx prisma validate --schema prisma/schema.prisma
node scripts/generate_xcore_analysis_example.js
pdfinfo artifacts/xcore-analysis-two-pa-one-pano.pdf
```

```bash
cd web
npm test
npm run build
```

Artifact QA non-klinis:

- PDF: `backend/artifacts/xcore-analysis-two-pa-one-pano.pdf`
- PNG hasil pemeriksaan terbaru: `backend/artifacts/xcore-analysis-report-final-v2-pages/`
- Golden baseline: `backend/tests/fixtures/xcore-report-golden.json`

Sumber citra adalah aset pengujian repository `web/public/assets/imagesTesting/test4.png` tanpa identitas yang tampak. Dua crop vertikal dipakai hanya untuk menguji layout periapikal dan diberi label fixture QA non-klinis; crop tersebut bukan contoh interpretasi klinis dan tidak boleh dipresentasikan sebagai data produksi.
