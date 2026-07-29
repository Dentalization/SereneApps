# Panduan Menjalankan Pengujian Skripsi SereneApps

## Status dokumen

Dokumen ini menjelaskan lokasi kode pengujian, cara menjalankan setiap pengujian, lokasi hasil, dan hasil sementara yang sudah tersimpan di repository.

Pembuatan dokumen ini tidak menjalankan ulang pengujian dan tidak mengubah JSON, CSV, Markdown laporan, database, source code, maupun PDF skripsi yang sudah ada. Angka pada bagian hasil sementara hanya disalin dari evidence yang tersedia saat dokumen ini dibuat.

> **Peringatan:** beberapa command pengujian dapat membuat data benchmark, mengubah database, atau menimpa file hasil apabila benar-benar dijalankan. Untuk demonstrasi sidang, gunakan evidence yang sudah ada. Untuk eksperimen ulang, gunakan salinan repository dan database khusus pengujian.

## Pemetaan pengujian dengan skripsi

| Bagian skripsi | Pengujian | Lokasi utama |
|---|---|---|
| Tabel 4.2 | Latency enam API inti | `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/` |
| Tabel 4.3 | Beban awal 1, 10, 25, dan 50 VU | `Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/` |
| Tabel 4.4 | Beban lanjutan 100 dan 200 VU | `paper-evidence/load_tests/` |
| Tabel 4.5 | CDSS asinkron dasar, lima citra | `Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/` |
| Tabel 4.6 | CDSS lanjutan, 30 citra sintetis | `paper-evidence/cdss_latency/` |
| Tabel 4.7 | Unggah CDSS konkuren | `paper-evidence/cdss_concurrent/` |
| Tabel 4.8 | Testability modul | `Pengujian Latency, Tetability, dan Maintability/testability/` dan `paper-evidence/testability/` |
| Tabel 4.9–4.10 | Maintainability | `maintainability-results/` dan konfigurasi SonarCloud |

## 1. Persiapan lingkungan

### 1.1 Memeriksa alat pengujian

**Lokasi kode:** tidak ada kode aplikasi yang dijalankan pada tahap ini. Command hanya memeriksa versi alat pada terminal.

```bash
cd /Users/adrianhalim/SereneApps

node --version
npm --version
python3 --version
k6 version
docker --version
```

### 1.2 Menjalankan PostgreSQL

**Lokasi konfigurasi:** `backend/docker-compose.yml`.

```bash
cd /Users/adrianhalim/SereneApps/backend
docker compose up -d
```

Command berikut hanya digunakan ketika menyiapkan database pengujian baru. Keduanya mengubah database.

**Lokasi kode migrasi dan seed:** `backend/src/migrate.js` dan `backend/src/seed.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend
npm run migrate
npm run seed
```

### 1.3 Menjalankan backend API

**Lokasi kode server:** `backend/src/server.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend
npm start
```

Alamat backend yang digunakan oleh skrip pengujian adalah `http://127.0.0.1:4000` dengan prefix API `/v1`.

### 1.4 Menjalankan layanan CDSS

**Lokasi kode layanan:** `backend/python_service/main.py`.

```bash
cd /Users/adrianhalim/SereneApps/backend/python_service
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

Alamat layanan CDSS adalah `http://localhost:8000`.

## 2. Pengujian latency API inti

Target pengujian API inti adalah p95 kurang dari 2.000 ms dan error rate kurang dari 1%. Gunakan akun nonproduksi dan sesuaikan variabel kredensial sebelum menjalankan pengujian.

### 2.1 Login pengguna

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/01-login.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  scripts/01-login.k6.js
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/01-login-summary.json`.

**Hasil sementara:** rata-rata 74,26 ms; p95 81,82 ms; throughput 0,93 req/s; error rate 0,00%; memenuhi target.

### 2.2 Mengambil daftar appointment

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/02-fetch-appointments.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  scripts/02-fetch-appointments.k6.js
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/02-fetch-appointments-summary.json`.

**Hasil sementara pada tabel skripsi:** rata-rata 23,11 ms; p95 34,60 ms; throughput 0,96 req/s; error rate 0,00%; memenuhi target.

### 2.3 Membuat appointment

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/03-create-appointment.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  -e DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
  scripts/03-create-appointment.k6.js
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/03-create-appointment-summary.json`.

**Hasil sementara pada tabel skripsi:** rata-rata 30,14 ms; p95 49,92 ms; throughput 0,96 req/s; error rate 0,00%; memenuhi target.

### 2.4 Mengambil detail konsultasi

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/04-fetch-consultation-detail.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  -e DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
  -e DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
  -e DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
  scripts/04-fetch-consultation-detail.k6.js
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/04-fetch-consultation-detail-summary.json`.

**Hasil sementara pada tabel skripsi:** rata-rata 8,50 ms; p95 14,21 ms; throughput 0,41 req/s; error rate 0,00%; memenuhi target.

### 2.5 Mengirim pesan konsultasi

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/05-send-chat-message.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  -e DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
  -e DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
  -e DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
  scripts/05-send-chat-message.k6.js
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/05-send-chat-message-summary.json`.

**Hasil sementara pada tabel skripsi:** rata-rata 926,81 ms; p95 1.168,21 ms; throughput 0,39 req/s; error rate 0,00%; memenuhi target.

### 2.6 Mengunggah citra gigi

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/scripts/06-upload-attachment.k6.js`.

```bash
cd '/Users/adrianhalim/SereneApps/Pengujian Latency, Tetability, dan Maintability/latency/api_inti'

k6 run \
  -e VUS=1 \
  -e DURATION=5s \
  -e BASE_URL=http://127.0.0.1:4000 \
  -e API_PREFIX=/v1 \
  -e PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
  -e PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
  -e DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
  -e DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
  -e DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
  scripts/06-upload-attachment.k6.js
```

**Lokasi fixture:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/fixtures/sample-dental.jpg`.

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/results/06-upload-attachment-summary.json`.

**Hasil sementara pada tabel skripsi:** rata-rata 716,15 ms; p95 1.105,41 ms; throughput 0,37 req/s; error rate 0,00%; memenuhi target.

### 2.7 Menjalankan seluruh API inti berurutan

**Lokasi kode runner:** `Pengujian Latency, Tetability, dan Maintability/latency/api_inti/run-latency-tests.js`.

```bash
cd /Users/adrianhalim/SereneApps

VUS=1 \
DURATION=5s \
BASE_URL=http://127.0.0.1:4000 \
API_PREFIX=/v1 \
PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
node 'Pengujian Latency, Tetability, dan Maintability/latency/api_inti/run-latency-tests.js'
```

Runner menghapus summary lama sebelum menulis hasil baru. Jangan menjalankan command ini pada evidence utama jika hasil lama harus dipertahankan.

## 3. Pengujian beban awal 1–50 VU

### 3.1 Menjalankan seluruh tingkat beban awal

**Lokasi kode runner:** `Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/run-load-by-vu.sh`.

**Lokasi kode skenario k6:** `Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js`.

```bash
cd /Users/adrianhalim/SereneApps

BASE_URL=http://127.0.0.1:4000 \
API_PREFIX=/v1 \
PATIENT_EMAIL='EMAIL_PASIEN_UJI' \
PATIENT_PASSWORD='PASSWORD_PASIEN_UJI' \
DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
DENTIST_PROFILE_ID='ID_PROFIL_DOKTER_UJI' \
bash 'Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/run-load-by-vu.sh'
```

Runner menjalankan empat tingkat beban:

| Skenario | VU | Durasi | Rata-rata sementara | p95 sementara | Error rate |
|---|---:|---:|---:|---:|---:|
| Baseline | 1 | 1 menit | 23,56 ms | 90,79 ms | 0,00% |
| Beban ringan | 10 | 3 menit | 45,03 ms | 155,44 ms | 0,00% |
| Beban sedang | 25 | 5 menit | 113,31 ms | 407,50 ms | 0,00% |
| Beban tinggi | 50 | 5 menit | 227,39 ms | 857,00 ms | 0,00% |

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/results/`.

## 4. Pengujian beban lanjutan 100 dan 200 VU

### 4.1 Menyiapkan data benchmark

**Lokasi kode seed:** `paper-evidence/scripts/seed-load-test-data.cjs`.

```bash
cd /Users/adrianhalim/SereneApps
node paper-evidence/scripts/seed-load-test-data.cjs
```

Command ini menghapus akun dengan pola `patient.load%@example.com`, kemudian membuat 200 pengguna, profil pasien, appointment terkonfirmasi, chat room, dan membership pengujian. Jalankan hanya pada database pengujian.

### 4.2 Menjalankan backend dengan mock layanan eksternal

**Lokasi kode pengaktifan benchmark mock:** `backend/src/server.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend
BENCHMARK_MOCK_EXTERNALS=true npm start
```

Mode ini mengaktifkan mock Twilio dan Midtrans untuk mengisolasi pengujian layanan inti.

### 4.3 Menjalankan 100 VU

**Lokasi kode test:** `paper-evidence/load_tests/core_api_high_vu.k6.js`.

**Lokasi runner:** `paper-evidence/scripts/run-k6-load-tests.cjs`.

```bash
cd /Users/adrianhalim/SereneApps

node paper-evidence/scripts/run-k6-load-tests.cjs \
  --vus 100 \
  --duration 5m
```

**Lokasi evidence:** `paper-evidence/load_tests/load_100vu_summary.json`.

**Hasil sementara tersimpan:** 62.396 request; rata-rata 232,67 ms; p95 1.362,12 ms; throughput 206,38 req/s; tidak ada request gagal pada artefak tersimpan.

### 4.4 Menjalankan 200 VU

**Lokasi kode test:** `paper-evidence/load_tests/core_api_high_vu.k6.js`.

**Lokasi runner:** `paper-evidence/scripts/run-k6-load-tests.cjs`.

```bash
cd /Users/adrianhalim/SereneApps

node paper-evidence/scripts/run-k6-load-tests.cjs \
  --vus 200 \
  --duration 5m
```

**Lokasi evidence:** `paper-evidence/load_tests/load_200vu_summary.json`.

**Hasil sementara tersimpan:** 57.108 request; rata-rata 809,65 ms; p95 4.000,42 ms; throughput 187,31 req/s; tidak ada request gagal pada artefak tersimpan; threshold latency tidak terpenuhi.

## 5. Pengujian CDSS asinkron

### 5.1 Pengujian dasar lima citra

**Lokasi kode test:** `Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js`.

**Lokasi fixture:** `Pengujian Latency, Tetability, dan Maintability/latency/fixtures/sample-dental.jpg`.

```bash
cd /Users/adrianhalim/SereneApps

BASE_URL=http://127.0.0.1:4000 \
API_PREFIX=/v1 \
DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
node 'Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/run-cdss-async-latency.js'
```

**Lokasi evidence:** `Pengujian Latency, Tetability, dan Maintability/latency/cdss_async/reports/`.

**Hasil sementara:** rata-rata initial response 20,97 ms; queue 99,09 ms; inference 408,07 ms; persistence 26,05 ms; end-to-end 554,19 ms.

Catatan metodologi: skrip dasar menggunakan nilai queue simulasi dan membagi durasi analisis menjadi estimasi inference dan persistence. Karena itu, pengujian ini diposisikan sebagai pengujian dasar.

### 5.2 Membuat 30 fixture sintetis

**Lokasi generator:** `paper-evidence/scripts/generate-synthetic-dental-fixtures.cjs`.

```bash
cd /Users/adrianhalim/SereneApps
node paper-evidence/scripts/generate-synthetic-dental-fixtures.cjs --count 30
```

**Lokasi keluaran fixture:** `paper-evidence/fixtures/synthetic_dental_images/`.

### 5.3 Pengujian lanjutan 30 citra

**Lokasi kode test:** `paper-evidence/scripts/xcore-cdss-benchmark.cjs`.

```bash
cd /Users/adrianhalim/SereneApps

API_BASE_URL=http://localhost:4000/v1 \
PYTHON_SERVICE_URL=http://localhost:8000 \
TEST_DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
TEST_DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
node paper-evidence/scripts/xcore-cdss-benchmark.cjs latency --runs 30
```

**Lokasi evidence:** `paper-evidence/cdss_latency/cdss_latency_results.csv` dan `paper-evidence/cdss_latency/cdss_latency_summary.md`.

**Hasil sementara:** 30 pengiriman; 30 berhasil; rata-rata end-to-end 562,85 ms; median 554,82 ms; standar deviasi 30,95 ms; p95 653,54 ms.

Hasil ini mengukur performa integrasi menggunakan citra sintetis, bukan akurasi atau validitas klinis CDSS.

### 5.4 Pengujian unggah konkuren

**Lokasi kode test:** `paper-evidence/scripts/xcore-cdss-benchmark.cjs` dengan mode `concurrent`.

```bash
cd /Users/adrianhalim/SereneApps

API_BASE_URL=http://localhost:4000/v1 \
PYTHON_SERVICE_URL=http://localhost:8000 \
TEST_DENTIST_EMAIL='EMAIL_DOKTER_UJI' \
TEST_DENTIST_PASSWORD='PASSWORD_DOKTER_UJI' \
node paper-evidence/scripts/xcore-cdss-benchmark.cjs concurrent \
  --concurrency 2,5,10
```

**Lokasi evidence:** `paper-evidence/cdss_concurrent/cdss_concurrent_results.csv` dan `paper-evidence/cdss_concurrent/cdss_concurrent_summary.md`.

**Hasil sementara:** 2 konkuren menghasilkan 2/2 berhasil; 5 konkuren menghasilkan 5/5 berhasil; 10 konkuren menghasilkan 9/10 berhasil dan satu kegagalan.

## 6. Pengujian testability

### 6.1 Backend autentikasi

**Lokasi kode test:** `backend/tests/auth.access.test.js`, `backend/tests/otp.service.test.js`, dan `backend/tests/otp.routes.test.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend

node --test \
  --experimental-test-coverage \
  '--test-coverage-exclude=tests/**' \
  --test-concurrency=1 \
  tests/auth.access.test.js \
  tests/otp.service.test.js \
  tests/otp.routes.test.js
```

**Hasil sementara:** 13 test; 13 passed; 0 failed; 0 skipped; line coverage 45,51%.

### 6.2 Backend appointment

**Lokasi kode test:** `backend/tests/appointments.week2.test.js`, `backend/tests/patient_journey.test.js`, dan `backend/tests/treatmentPlans.continuity.test.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend

node --test \
  --experimental-test-coverage \
  '--test-coverage-exclude=tests/**' \
  --test-concurrency=1 \
  tests/appointments.week2.test.js \
  tests/patient_journey.test.js \
  tests/treatmentPlans.continuity.test.js
```

**Hasil sementara:** 5 test; 5 passed; 0 failed; 0 skipped; line coverage 78,90%.

### 6.3 Backend konsultasi dan chat

**Lokasi kode test:** seluruh file `backend/tests/communications*.test.js`.

```bash
cd /Users/adrianhalim/SereneApps/backend

env TWILIO_MOCK_MODE=false \
node --test \
  --experimental-test-coverage \
  '--test-coverage-exclude=tests/**' \
  --test-concurrency=1 \
  tests/communications*.test.js
```

**Lokasi evidence:** `paper-evidence/testability/backend_chat_node_test_output.txt`.

**Hasil sementara:** 36 test; 36 passed; 0 failed; 0 skipped; line coverage 20,47%.

### 6.4 Backend integrasi CDSS

**Lokasi kode test:** sembilan file berikut.

- `backend/tests/deepDentalProxy.test.js`
- `backend/tests/verifiedCaseWorkspace.export.test.js`
- `backend/tests/verifiedCaseWorkspace.hardening.test.js`
- `backend/tests/verifiedCaseWorkspace.migration.test.js`
- `backend/tests/verifiedCaseWorkspace.postgres.test.js`
- `backend/tests/verifiedCaseWorkspace.productionGuard.test.js`
- `backend/tests/verifiedCaseWorkspace.routes.test.js`
- `backend/tests/verifiedCaseWorkspace.service.test.js`
- `backend/tests/xcore.annotation.validation.test.js`

```bash
cd /Users/adrianhalim/SereneApps/backend

node --test \
  --experimental-test-coverage \
  '--test-coverage-exclude=tests/**' \
  --test-concurrency=1 \
  tests/deepDentalProxy.test.js \
  tests/verifiedCaseWorkspace.export.test.js \
  tests/verifiedCaseWorkspace.hardening.test.js \
  tests/verifiedCaseWorkspace.migration.test.js \
  tests/verifiedCaseWorkspace.postgres.test.js \
  tests/verifiedCaseWorkspace.productionGuard.test.js \
  tests/verifiedCaseWorkspace.routes.test.js \
  tests/verifiedCaseWorkspace.service.test.js \
  tests/xcore.annotation.validation.test.js
```

**Hasil sementara:** 34 test; 33 passed; 0 failed; 1 skipped; line coverage 68,52%.

### 6.5 Aplikasi web

**Lokasi kode test:** seluruh file `web/tests/*.test.mjs`.

```bash
cd /Users/adrianhalim/SereneApps/web

node --test \
  --experimental-test-coverage \
  '--test-coverage-exclude=tests/**' \
  tests/*.test.mjs
```

**Hasil sementara:** 78 test; 78 passed; 0 failed; 0 skipped; line coverage 54,58%.

### 6.6 Aplikasi mobile

**Lokasi kode test:** seluruh file pada `mobile/__tests__/`, termasuk `mobile/__tests__/mobile-services.test.js`.

```bash
cd /Users/adrianhalim/SereneApps/mobile
npm test -- --coverage --runInBand
```

Jika hasil JSON diperlukan, gunakan command berikut. Command ini akan menulis file keluaran yang disebutkan.

**Lokasi kode test:** tetap pada `mobile/__tests__/`.

```bash
cd /Users/adrianhalim/SereneApps/mobile

npm test -- \
  --coverage \
  --runInBand \
  --json \
  --outputFile ../paper-evidence/testability/mobile_jest_results.json
```

**Hasil sementara:** 23 test; 23 passed; 0 failed; 0 skipped; line coverage 2,44%.

### 6.7 Ringkasan testability sementara

| Komponen | Total | Passed | Failed | Skipped | Line coverage |
|---|---:|---:|---:|---:|---:|
| Backend autentikasi | 13 | 13 | 0 | 0 | 45,51% |
| Backend appointment | 5 | 5 | 0 | 0 | 78,90% |
| Backend konsultasi/chat | 36 | 36 | 0 | 0 | 20,47% |
| Backend integrasi CDSS | 34 | 33 | 0 | 1 | 68,52% |
| Aplikasi web | 78 | 78 | 0 | 0 | 54,58% |
| Aplikasi mobile | 23 | 23 | 0 | 0 | 2,44% |
| Total | 189 | 188 | 0 | 1 | Tidak digabungkan |

Pass rate sementara adalah `188 / 189 × 100% = 99,47%`. Pass rate tinggi tidak berarti seluruh kode sudah tercakup karena coverage setiap komponen berbeda.

## 7. Pengujian maintainability

### 7.1 ESLint backend, web, dan mobile

**Lokasi runner:** `scripts/maintainability/run-eslint-reports.sh`.

**Lokasi konfigurasi:** `backend/eslint.config.cjs`, `web/eslint.config.cjs`, dan `mobile/eslint.config.cjs`.

```bash
cd /Users/adrianhalim/SereneApps
npm run maintainability:eslint
```

**Lokasi evidence:** `maintainability-results/eslint-backend.json`, `maintainability-results/eslint-web.json`, `maintainability-results/eslint-mobile.json`, dan `maintainability-results/eslint-summary.json`.

**Hasil sementara:** backend 0 error dan 162 warning; web 62 error dan 1.921 warning; mobile 0 error dan 1.017 warning.

### 7.2 Radon layanan CDSS

**Lokasi runner:** `scripts/maintainability/run-radon-reports.sh`.

**Lokasi source yang dianalisis:** `backend/python_service/` dengan pengecualian test, cache, dan virtual environment.

```bash
cd /Users/adrianhalim/SereneApps
npm run maintainability:radon
```

**Lokasi evidence:** `maintainability-results/radon-cdss-cc.json`, `maintainability-results/radon-cdss-mi.json`, `maintainability-results/radon-cdss-raw.json`, dan `maintainability-results/radon-cdss-summary.json`.

**Hasil sementara:** rata-rata cyclomatic complexity 7,75; complexity maksimum 48 atau peringkat F; rata-rata maintainability index 17,78.

### 7.3 Validasi konfigurasi maintainability

**Lokasi validator:** `scripts/maintainability/validate-maintainability-setup.js`.

```bash
cd /Users/adrianhalim/SereneApps
npm run maintainability:validate
```

Validator memeriksa konfigurasi Sonar, workflow, script package, konfigurasi ESLint, dan memastikan token Sonar tidak ditulis langsung pada file yang diperiksa.

### 7.4 SonarCloud

**Lokasi konfigurasi:** `sonar-project.properties`.

**Lokasi workflow:** `.github/workflows/sonarqube-maintainability.yml`.

Pemindaian dapat dijalankan secara manual dari GitHub Actions. Jika GitHub CLI sudah terautentikasi, workflow dapat dipicu dengan command berikut.

```bash
cd /Users/adrianhalim/SereneApps
gh workflow run sonarqube-maintainability.yml
```

Repository memerlukan secret `SONAR_TOKEN`. Token tidak boleh dimasukkan ke source code atau disimpan pada dokumen ini.

**Lokasi evidence tersimpan:** `Pengujian Latency, Tetability, dan Maintability/maintainability/maintainability-results/sonar-measures.json` dan `sonar-summary.json`.

**Hasil sementara:** 39.998 ncloc; 1.390 code smell; complexity 8.627; cognitive complexity 5.542; duplicated lines density 7,9%; technical debt 9.592 menit; maintainability rating 1,0 atau A.

## 8. Ringkasan hasil sementara

| Area | Hasil sementara dari evidence yang tersedia |
|---|---|
| API inti | Seluruh enam fitur pada tabel skripsi memiliki p95 di bawah 2.000 ms dan error rate 0,00% |
| Beban awal | p95 meningkat dari 90,79 ms pada 1 VU menjadi 857,00 ms pada 50 VU |
| Beban 100 VU | p95 1.362,12 ms dan throughput 206,38 req/s |
| Beban 200 VU | p95 4.000,42 ms dan throughput 187,31 req/s; threshold latency tidak terpenuhi |
| CDSS 30 citra | 30/30 berhasil; rata-rata end-to-end 562,85 ms; p95 653,54 ms |
| CDSS konkuren | 2/2 dan 5/5 berhasil; 9/10 berhasil pada skenario 10 konkuren |
| Testability | 189 test; 188 passed; 0 failed; 1 skipped; pass rate 99,47% |
| ESLint | Backend 0/162; web 62/1.921; mobile 0/1.017 untuk error/warning |
| Radon | Rata-rata CC 7,75; maksimum 48/F; rata-rata MI 17,78 |
| SonarCloud | Rating A pada scope inti, dengan 1.390 code smell dan duplikasi 7,9% |

## 9. Batas interpretasi hasil

1. Hasil menggambarkan lingkungan lokal Apple M3 dengan memori 8 GB, bukan lingkungan produksi.
2. Pengujian beban awal dan lanjutan memiliki kondisi berbeda sehingga tidak diperlakukan sebagai satu eksperimen terkontrol.
3. Pengujian CDSS menggunakan citra sintetis dan tidak mengukur akurasi diagnosis klinis.
4. Nilai pass rate testability harus dibaca bersama code coverage yang belum merata.
5. SonarCloud menggunakan `sonar.inclusions`, sehingga rating yang dihasilkan berlaku pada scope inti penelitian.
6. Menjalankan ulang pengujian dapat menghasilkan angka berbeda karena kondisi layanan, data, database, sumber daya komputer, dan dependensi saat eksekusi.

## 10. Urutan demonstrasi yang disarankan

Jika penguji meminta demonstrasi tanpa melakukan load test berat, gunakan urutan berikut:

1. Tunjukkan lokasi skrip pengujian.
2. Jelaskan command yang digunakan tanpa langsung menjalankannya.
3. Tunjukkan raw evidence JSON, CSV, atau coverage yang sudah tersimpan.
4. Tunjukkan tabel hasil pada PDF skripsi.
5. Jelaskan target, hasil, dan keterbatasan interpretasinya.

Pengujian 100/200 VU dan CDSS konkuren tidak disarankan untuk dijalankan spontan saat sidang karena memerlukan database uji, kondisi layanan yang tepat, waktu beberapa menit, dan dapat membebani perangkat lokal.
