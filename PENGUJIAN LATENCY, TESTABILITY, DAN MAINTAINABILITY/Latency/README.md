# Pengujian Latency API Inti

Script utama: `core_api_latency.js`

Run default 10 VU selama 3 menit:

```bash
cd "/Users/adrianhalim/SereneApps/PENGUJIAN LATENCY, TESTABILITY, DAN MAINTAINABILITY/Latency"
k6 run core_api_latency.js
```

Default lokal:

- `BASE_URL=http://127.0.0.1:4000`
- `API_PREFIX=/v1`
- `PATIENT_EMAIL=adrianhhhalim@gmail.com`
- `DENTIST_EMAIL=dentist10.clinic2@dentists.com`
- `DENTIST_PROFILE_ID=365`
- `TEST_PASSWORD=password123`
- `VUS=10`
- `DURATION=3m`

Override contoh:

```bash
BASE_URL=http://127.0.0.1:4000 \
API_PREFIX=/v1 \
VUS=10 \
DURATION=3m \
SUMMARY_PREFIX=hasil_latency_api_inti \
k6 run core_api_latency.js
```

Output otomatis:

- `hasil_latency_api_inti.md` berisi tabel siap pakai untuk Tabel 4.4.
- `hasil_latency_api_inti.json` berisi raw k6 summary.

Catatan endpoint:

- Login: `POST /v1/auth/login`
- Daftar appointment: `GET /v1/appointments?view=patient`
- Buat appointment: `POST /v1/appointments`
- Detail konsultasi: `GET /v1/appointments/:id`
- Kirim pesan: `POST /v1/communications/appointments/:id/chat/messages`
- Unggah citra: `POST /v1/communications/appointments/:id/chat/attachments`

`setup()` otomatis membuat appointment fixture dan mengonfirmasinya dengan akun dentist agar endpoint pesan dan upload bisa diuji dengan status appointment yang valid.
