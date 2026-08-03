# Pengujian Latency API Inti — Repeated Measurement (n=3)

Direktori ini menjalankan enam endpoint API inti SereneApps dengan pengukuran berulang: 10 VU selama 3 menit untuk setiap endpoint, diulang tiga kali. Hasil setiap run disimpan terpisah lalu dianalisis sebagai tiga observasi per endpoint; sampel request mentah tidak digabungkan.

| Endpoint yang diuji | Skrip k6 | Metode dan rute |
| --- | --- | --- |
| Login pengguna | `scripts/01-login.k6.js` | `POST /v1/auth/login` |
| Daftar appointment | `scripts/02-fetch-appointments.k6.js` | `GET /v1/appointments?view=patient&limit=50&order=desc` |
| Membuat appointment | `scripts/03-create-appointment.k6.js` | `POST /v1/appointments` |
| Detail konsultasi | `scripts/04-fetch-consultation-detail.k6.js` | `GET /v1/appointments/:id` |
| Pesan konsultasi | `scripts/05-send-chat-message.k6.js` | `POST /v1/communications/appointments/:id/chat/messages` |
| Unggah citra gigi | `scripts/06-upload-attachment.k6.js` | `POST /v1/communications/appointments/:id/attachments` |

## Prasyarat dan keamanan

Butuh `k6`, `python3`, `curl`, backend lokal yang sehat pada `BASE_URL/health`, serta citra fixture `fixtures/sample-dental.jpg`. Runner hanya menerima target lokal (`localhost`, `127.0.0.1`, atau `::1`) secara default. Untuk target lain, set `ALLOW_REMOTE_TARGET=1` secara eksplisit setelah ada persetujuan.

Salin `.env.example` untuk referensi lokal bila diperlukan, tetapi jangan pernah commit `.env`. Runner membaca kredensial hanya dari environment dan tidak mencetak maupun menyimpannya dalam manifest, log, CSV, Markdown, atau JSON. Summary k6 juga disanitasi agar `setup_data`, token, password, dan header otorisasi tidak menjadi artefak penelitian.

Apabila memakai `.env` lokal, gunakan `set -a; source .env; set +a` dari direktori ini agar variabel diekspor ke runner. File itu tetap diabaikan Git.

Variabel wajib (isi hanya pada shell/secret manager):

```bash
export PATIENT_EMAIL='...'
export PATIENT_PASSWORD='...'
export DENTIST_EMAIL='...'
export DENTIST_PASSWORD='...'
export DENTIST_PROFILE_ID='...'
```

Variabel konfigurasi dan default:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `RUNS` | `3` | Tetap n=3 untuk analisis skripsi. |
| `VUS` | `10` | Virtual user konstan tiap endpoint. |
| `DURATION` | `3m` | Durasi k6 per endpoint/run. |
| `COOLDOWN_SECONDS` | `600` | Jeda antar Run 1, 2, dan 3 untuk endpoint yang sama. |
| `BASE_URL` | `http://127.0.0.1:4000` | Origin backend lokal, tanpa path. |
| `API_PREFIX` | `/v1` | Prefix API. |
| `FORCE` | `0` | `0` tidak menimpa artefak apa pun; `1` mengizinkan penggantian hasil. |
| `DRY_RUN` | `0` | `1` hanya menampilkan 18 langkah, tanpa request atau menulis file. |

`TEST_EMAIL`, `TEST_PASSWORD`, dan `DENTIST_ID` tetap diterima sebagai alias kompatibilitas lama, tetapi variabel eksplisit di atas lebih disarankan.

## Dry run (wajib sebelum eksekusi)

Perintah berikut memverifikasi konfigurasi dan mencetak urutan 18 pengukuran, tetapi tidak menghubungi server dan tidak membuat hasil.

```bash
cd 'Pengujian Latency, Tetability, dan Maintability/latency/api_inti'
PATIENT_EMAIL='...' PATIENT_PASSWORD='...' \
DENTIST_EMAIL='...' DENTIST_PASSWORD='...' DENTIST_PROFILE_ID='...' \
DRY_RUN=1 ./run_repeated.sh
```

## Menjalankan pengujian

Setelah backend lokal siap dan dry run sudah benar, jalankan:

```bash
cd 'Pengujian Latency, Tetability, dan Maintability/latency/api_inti'
PATIENT_EMAIL='...' PATIENT_PASSWORD='...' \
DENTIST_EMAIL='...' DENTIST_PASSWORD='...' DENTIST_PROFILE_ID='...' \
RUNS=3 VUS=10 DURATION=3m COOLDOWN_SECONDS=600 \
./run_repeated.sh
```

Total waktu nominal sekitar 174 menit: 18 pengukuran × 3 menit (54 menit) ditambah 12 cooldown × 10 menit. Cooldown dilakukan antara Run 1–2 dan 2–3 untuk endpoint yang sama; waktu setup/preflight dan analisis berada di luar estimasi ini.

Hasil disimpan tanpa menimpa file yang sudah ada:

```text
results/repeated/
  manifest.csv
  run_log.txt
  run_1/ ... enam JSON
  run_2/ ... enam JSON
  run_3/ ... enam JSON
summary/
  runs_table.csv
  summary_table.csv
  summary_report.md
```

Jika proses terputus, jalankan perintah yang sama untuk melanjutkan: JSON yang valid akan dilewati. JSON tidak valid menyebabkan runner berhenti untuk file tersebut; gunakan `FORCE=1` hanya bila memang hendak mengganti file tersebut. Kegagalan threshold p95 dicatat sebagai `threshold_failed` dan tetap dianalisis; script exception, JSON rusak, atau run tanpa iterasi ditandai tidak lengkap.

## Analisis dan interpretasi

Untuk membangun ulang tabel dari JSON yang sudah ada:

```bash
python3 analyze_repeated.py \
  --results-dir results/repeated \
  --summary-dir summary \
  --manifest results/repeated/manifest.csv \
  --vus 10 --duration 3m
```

Analyzer menghasilkan:

- `summary/runs_table.csv`: metrik endpoint target per run: custom `Trend` untuk avg/p95, custom `Counter` untuk jumlah/throughput, dan custom `Rate` untuk error. Metrik HTTP global tidak dipakai untuk angka endpoint karena dapat mencakup login/setup/warm-up.
- `summary/summary_table.csv`: mean, sample SD (`ddof=1`), dan CV untuk avg response time, p95, throughput, serta error rate.
- `summary/summary_report.md`: tabel Markdown siap ditinjau sebelum dipindahkan ke tabel skripsi.

CV dihitung dengan `SD / mean × 100%`; bila mean = 0, nilainya `N/A`. CV digunakan sebagai statistik deskriptif dan tidak menjadi dasar klaim konsistensi pengukuran. Target p95 penelitian adalah < 2000 ms dan diberi status memenuhi hanya bila ketiga run endpoint berada di bawah target; target ini bukan sertifikasi atau standar eksternal. Jika satu saja artefak hilang/tidak valid, statistik endpoint tersebut dibiarkan kosong dan laporan bertuliskan **Data tidak lengkap**, bukan nol.

## Konsistensi data uji

Endpoint pembuat appointment, pengirim pesan, dan unggah citra membuat data uji baru yang dibedakan oleh seed waktu/run/VU/iterasi pada skrip yang sudah ada; runner tidak menghapus data pengguna. Sebelum memulai satu rangkaian n=3, gunakan akun uji khusus, pastikan profil dokter dan cabang klinik yang sama tersedia, lalu pastikan tidak ada pekerjaan latar belakang atau pengguna lain yang memakai akun itu. Jika kondisi awal database perlu dikembalikan, lakukan sendiri melalui prosedur lingkungan lokal yang disetujui sebelum memulai rangkaian—runner tidak mereset database dan tidak mengklaim bahwa baseline identik secara otomatis.

JSON satu-run lama di `results/` dipertahankan sebagai riwayat, tetapi bukan hasil 10 VU selama tiga menit dengan tiga pengulangan. Jangan mencampurkannya dengan artefak baru di `results/repeated/` atau tabel n=3.
