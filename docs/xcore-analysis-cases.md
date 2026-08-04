# X-Core Analysis Cases

## Ringkasan arsitektur

`xcore_analysis_cases` adalah agregat analisis tingkat pasien. Item kasus menunjuk ke `imaging_studies` dan, bila tersedia, `imaging_series`; anotasi dan pengukuran tidak diduplikasi saat kasus diedit karena tetap memakai `study_annotations` dengan scope `study_id + series_uid + viewer_type`.

Saat pengguna menekan **Capture kasus**, viewer merender citra, window/level, anotasi, pengukuran, dan scale bar ke PNG. Backend menyimpan render secara content-addressed. Saat **Generate PDF semua citra** dijalankan, backend membaca kasus dan anotasi tersimpan, membuat snapshot item terurut, menyimpan snapshot relasional pada `xcore_analysis_report_items`, membuat PDF melalui PDFKit, lalu meregistrasikan versi di `xcore_analysis_reports`. Render lama tidak ditimpa sehingga PDF dan snapshot versi lama tetap immutable.

## Endpoint

- `GET /api/v1/x-core/analysis-cases`
- `POST /api/v1/x-core/analysis-cases`
- `GET /api/v1/x-core/analysis-cases/:caseId`
- `PUT /api/v1/x-core/analysis-cases/:caseId`
- `PUT /api/v1/x-core/analysis-cases/:caseId/items/:itemId/render`
- `POST /api/v1/x-core/analysis-cases/:caseId/reports`
- `GET /api/v1/x-core/analysis-cases/:caseId/reports/:reportId/pdf`

Semua endpoint membutuhkan bearer authentication. Mutasi dan pembacaan kasus dibatasi ke pembuat kasus. Setiap studi diverifikasi melalui policy akses X-Core yang sudah ada dan `patient_id` semua item harus sama dengan pasien kasus.

## Menjalankan

```bash
cd backend
npm run migrate
npm start
```

```bash
cd web
npm start
```

Di X-Core, pilih **Analysis Cases**, buat kasus, tambahkan radiografi pasien yang sama, isi metadata/temuan, dan simpan. Buka setiap item, selesaikan anotasi lalu tekan **Capture kasus**. Kembali ke kasus dan pilih **Generate PDF semua citra**.

## Verifikasi

```bash
cd backend
node --test tests/xcore-analysis-case.test.js
npx prisma validate --schema prisma/schema.prisma
node scripts/generate_xcore_analysis_example.js
```

```bash
cd web
npm test
npm run build
```

Contoh PDF memakai placeholder non-klinis dan disimpan di `backend/artifacts/xcore-analysis-two-pa-one-pano.pdf`.

