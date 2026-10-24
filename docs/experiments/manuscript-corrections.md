# Errata dan Rekonsiliasi Naskah CDSS X-Core v3

> Tanggal: Oktober 2026  
> Tujuan: Menghapus klaim tanpa dasar, menghapus identifier pasien, dan menyelaraskan naskah dengan data bersih v0.2.1.  
> Catatan: Semua angka mengacu pada sweep.csv dan concurrency.csv. Dataset di naskah diberi label generik (dataset-P1, phantom-N401).

---

## 1. Angka 7,03 ± 1,96 s dan 1.587 MiB: dibatalkan

- Angka ini berasal dari run historis (`benchmark-runs.csv:17–21`, run ID `xcore_single_complete_cbct_repeated_benchmark_1781387626964`) pada studi CBCT 401 slice. Studi tersebut diberi label generik dataset-P1 dan identitas aslinya tidak dicantumkan.
- Run tersebut berjalan dengan baterai, swap 5.490–7.711 MB, dan tanpa preflight gate. Data tidak memenuhi standar reprodusibilitas.
- Angka ini tidak boleh dipakai sebagai angka resmi, baik di naskah maupun di dokumen lain.
- Angka resmi untuk N = 401 (provisional): volume prep 3,47 ± 0,05 s; upload-to-ready 4,84 ± 0,53 s; peak RSS median 2.965,8 MB.

---

## 2. Tabel Koreksi Klaim

| Klaim lama | Status | Koreksi | Sumber Terverifikasi |
|---|---|---|---|
| "Breakdown 5 gambar dental" | DIHAPUS | Tidak ada pemecahan 5 gambar. Pipeline memproses kumpulan slice DICOM (N ∈ {25, 50, 100, 200, 401}) menjadi satu volume .vti. | `backend/python_service/services/vti_converter.py:1625–1637` |
| Latensi 562,85 ms (0,56 s) | DIKOREKSI | Angka ini berasal dari 30 gambar PNG 2D sintetis (~112 KB). Hanya mengukur penyerapan awal, bukan rekonstruksi 3D. | `paper-evidence/FINAL_REPORT.md:77`; `paper-evidence/paper_ready_tables.md:13`; `paper-evidence/fixtures/synthetic_dental_images/` |
| Polling dengan sleep 500 ms | DIHAPUS | Artefak skrip lama. Pipeline mendukung polling segera dengan interval 100 ms. Uji kontrol N = 25: selisih legacy vs immediate 9 ms, dan selisih ini bergantung pada posisi readiness terhadap grid 500 ms. | `scripts/experiments/cdss-payload/run-sweep.mjs:161–180` |
| Endpoint "upload dental image" | DIKOREKSI | Endpoint X-Core yang sebenarnya: POST /v1/x-core/upload (gateway Node.js) yang meneruskan ke POST /convert/{study_id} (Python). Baris "upload dental image" pada benchmark lama mengukur endpoint chat-attachment, bukan X-Core. | `backend/src/routes/xcore.routes.js`; `backend/python_service/main.py:1636` |
| Endpoint /v1/score, /inference, /dental-analysis | DIHAPUS | Tidak ada endpoint tersebut. Status diambil dari GET /status/{study_id}. | `backend/python_service/main.py:1571` |
| HTTP 202 Accepted | DIKOREKSI | HTTP 200 OK dengan {"status": "converting"}. | `backend/python_service/main.py:1670–1675` |
| Message broker (RabbitMQ/Celery) | DIHAPUS | Tidak ada broker. Pemrosesan asinkron memakai BackgroundTasks FastAPI. | `backend/python_service/main.py:1658` |

---

## 3. Revisi Teks Naskah

### A. Abstrak

Teks lama (dihapus):
> "The baseline CDSS initial response averaged 20.97 ms, while an extended 30-image test produced a mean end-to-end processing time of 562.85 ms (p95 = 653.54 ms)."

Teks revisi:
> "For 3D dental CBCT imaging, the upload endpoint returns HTTP 200 after the study is received, with a measured upload duration of 0.09 ± 0.04 s for a 15 MB payload (N = 25 slices) and 1.12 ± 0.52 s for a 241 MB payload (N = 401 slices, provisional). Volumetric reconstruction then runs in the background, with a Python volume preparation time of 0.91 ± 0.01 s (N = 25) to 3.47 ± 0.05 s (N = 401, provisional) and total upload-to-ready time of 1.07 ± 0.03 s to 4.84 ± 0.53 s on a single 8 GB Apple M3 host. Under concurrency (N = 25, L ≤ 4), four overlapping conversions completed in 1.31 ± 0.01 s on average, compared with 1.04 s for a single job."

Catatan: angka 41,69 ms dari benchmark lama tidak dipakai lagi, karena mengukur endpoint lain.

### B. Seksi 3.3 dan Tabel 3

Ganti penyajian 5 gambar dan 30 gambar sintetis dengan tabel berikut (data sweep.csv):

| Tier (N) | Ukuran (MB) | Upload (s) | Volume prep (s) | Upload-to-ready (s) | Peak RSS median (MB) | Status |
|---|---|---|---|---|---|---|
| 25 | 15,0 | 0,09 ± 0,04 | 0,91 ± 0,01 | 1,07 ± 0,03 | 639,1 | Stabil |
| 50 | 30,1 | 0,16 ± 0,08 | 1,04 ± 0,02 | 1,27 ± 0,09 | 930,4 | Stabil |
| 100 | 60,1 | 0,26 ± 0,16 | 1,28 ± 0,01 | 1,66 ± 0,18 | 1.531,3 | Stabil |
| 200 | 120,3 | 0,50 ± 0,34 | 2,02 ± 0,62 (1,75 ± 0,01 tanpa run 4)* | 2,69 ± 0,93 | 2.723,7 | Outlier pada run 4* |
| 401 | 241,1 | 1,12 ± 0,52 | 3,47 ± 0,05 | 4,84 ± 0,53 | 2.965,8 | Provisional (available memory 1,3–1,6 GB) |

*Run 4 pada N = 200 mencatat volume prep 3,13 s, sedangkan empat run lainnya 1,73–1,76 s. Run ini dilaporkan, bukan dibuang.

### C. Seksi 4.2 (Diskusi)

Ganti pembahasan lama dengan:
> "Data menunjukkan waktu volume prep meningkat dari 0,91 s (N = 25) menjadi 3,47 s (N = 401, provisional), dan peak RSS mencapai sekitar 2.900 MiB (2.966 MB) pada tier tertinggi. Model memori linear berlaku sampai N = 200. Pada N = 401, available memory turun ke 1,3–1,6 GB dan hasilnya provisional. Dengan volume prep sebesar ini, eksekusi sinkron diperkirakan akan menahan respons klien selama beberapa detik. Hipotesis ini akan diuji pada perbandingan arsitektur A, B, dan C, dan belum dibuktikan oleh data ini."

Catatan: kata "pelanggaran SLA" dihapus. Tidak ada SLA yang diukur dalam data ini, dan arsitektur sinkron belum diuji.

---

## 4. Istilah yang Harus Dikonsistenkan di Seluruh Dokumen

- "Hipotesis" untuk: intersep ~0,8 s, mekanisme GIL, dan dugaan penyebab outlier run 4.
- "Provisional" untuk: N = 401.
- "Terukur" untuk: angka yang langsung dari sweep.csv atau concurrency.csv.
- Satuan: gunakan MB untuk semua memori (1 GiB = 1.024 MB). Jangan campur GB dan MB dalam satu kalimat.

---

## 5. Status Pekerjaan

- Sudah dikerjakan: revisi abstrak, tabel data, diskusi, dan penghapusan identifier pasien.
- Sudah diverifikasi: referensi `file:line` terhadap repositori (`vti_converter.py:1625–1637`, `FINAL_REPORT.md:77`, `paper_ready_tables.md:13`, `run-sweep.mjs:161–180`, `xcore.routes.js`, `main.py:1571, 1636, 1658, 1670–1675`).
- Sudah diverifikasi: versi VTK adalah **9.6.0** (`backend/python_service/venv`).
- Belum dikerjakan: revisi bagian metode dan seksi 2.3.3 pada manuskrip lengkap.
