# Protokol Eksperimen CDSS X-Core v0.2.1: Karakterisasi Beban dan Skalabilitas Pipeline

> Versi: v0.2.1 (menggantikan v0.2)  
> Tanggal: Oktober 2026  
> Platform: Apple Silicon M3, 8 GB unified memory, macOS (Darwin 25.x)  
> Status: Protokol untuk fase pengukuran berikutnya. Bagian yang belum diisi ditandai [BELUM DIISI].

---

## 1. Latar Belakang dan Revisi dari v0.2

1. **Lazy import.** Modul `torch`, `monai`, dan `vtkmodules` diimpor di dalam blok `volume_preparation_start` sampai `volume_preparation_end` (`vti_converter.py:1621–1640`). Karena setiap run me-restart proses uvicorn, impor terjadi di setiap run. Intersep ~0,8 detik dicatat sebagai hipotesis, belum terbukti.
2. **Model closed-loop VU.** Model closed-loop VU menahan laju request saat server melambat, sehingga antrean tidak terlihat. Karena itu v0.2.1 mengusulkan model arrival rate terbuka, tetapi model ini belum diuji.
3. **Gate probe.** Runner v0.2 memakai rumus `idle + L × median(delta_sweep)`, yang mengulang biaya tetap library di setiap job. Rumus koreksi memakai marginal per job (sekitar 290 MB).
4. **Batas model memori.** Model linear hanya berlaku sampai N = 200. Pada N = 401 peak RSS terukur 2.965,8 MB, sedangkan model memprediksi sekitar 5.040 MB.

---

## 2. Metodologi

### 2.1 Warm-up

- Sebelum setiap rangkaian, jalankan satu warm-up dengan N = 10. Tujuannya hanya memanaskan page cache OS.
- Warm-up tidak menghilangkan biaya import per proses. Karena itu intersep ~0,8 s tetap tercatat sebagai hipotesis.
- Untuk memisahkan biaya import dari biaya per slice, pertanyaan 3.1 pada prompt 03e harus dijawab lebih dulu. Lihat bagian 6.

### 2.2 Sumbu beban arrival rate (open model): belum diuji

- Permintaan dikirim dengan interval deterministik sebesar 1/λ, terlepas dari status job sebelumnya.
- Nilai λ, durasi per tahap, dan jumlah request belum ditetapkan. Nilai ini harus diturunkan dari pilot, bukan dari asumsi.
  - λ grid: [BELUM DIISI, ditentukan dari pilot warm-service]
  - Durasi per tahap: [BELUM DIISI]
  - Jumlah request per tahap: [BELUM DIISI]
- Catatan: pada N = 25, satu job memakan sekitar 1 detik dan L = 4 terbukti berjalan paralel (lihat hasil v0.2.1). Karena itu λ maksimum tidak bisa diperkirakan dari 1/prep saja.

### 2.3 Worker dan konkurensi

- Konfigurasi: uvicorn dengan 1 worker proses (`--workers 1`).
- Endpoint `POST /convert/{study_id}` mengembalikan HTTP 200 dengan status `converting`, lalu menjalankan konversi lewat `BackgroundTasks` FastAPI pada threadpool Starlette/AnyIO.
- Tingkat konkurensi yang diuji: L ∈ {1, 2, 4}, n = 3 per level, pada N = 25.
- L = 8 tidak diuji. Alasannya dijelaskan di bagian 4.
- Versi VTK: **9.6.0** (terverifikasi di `backend/python_service/venv`).

### 2.4 Ukuran sampel dan validitas

- Sampel: n = 5 per tier N ∈ {25, 50, 100, 200, 401}.
- Urutan run diacak dengan seed tetap.
- Polling: segera (t = 0) lalu setiap 100 ms. Polling 500 ms hanya dipakai sebagai kontrol dan dicatat sebagai pembanding.
- Preflight gate dicek sebelum setiap run (lihat bagian 5). Gate ini tidak mengukur kondisi selama run. Karena itu peristiwa memori di tengah run harus dilaporkan terpisah.

---

## 3. Model Memori Empiris

### 3.1 Model untuk N ≤ 200

Peak RSS(N, L) = RSS_idle + Δ_base + α × N + (L − 1) × Δ_job

- RSS_idle ≈ 101,3 MB
- Δ_base ≈ 230 MB
- α ≈ 12 MB per slice
- Δ_job ≈ 290 MB

Validasi terhadap data: N = 100 memberi 1.531 MB (terukur 1.531). N = 200 memberi 2.731 MB (terukur 2.724). Selisih di bawah 1%.

### 3.2 Batas model

- Untuk N = 401, model memprediksi 5.040 MB. Nilai terukur 2.965,8 MB (median) dan 3.038,8 MB (mean). Model tidak berlaku di N = 401.
- Penyebab deviasi belum diketahui. Dugaan: tekanan memori macOS (available memory turun ke 1.303–1.560 MB, di bawah gate 3.000 MB). Dugaan ini belum diuji.

### 3.3 Gate probe

Gate dihitung dengan dua rumus. Keduanya harus dicatat di setiap baris hasil.

- Rumus runner v0.2: idle + L × median(delta_sweep). Untuk L = 8: 101,4 + 8 × 538,0 = 4.405,4 MB.
- Rumus koreksi: (idle + median(delta_L1)) + (L − 1) × 290. Untuk L = 8: 639,4 + 7 × 290 = 2.669,4 MB.

Keduanya melebihi budget 2.500 MB, sehingga L = 8 dilewati. Runner v0.2 mengevaluasi rumus pertama. Mulai v0.2.1, runner harus mencatat kedua rumus.

---

## 4. Batas Konkurensi

- L = 8 tidak diuji. Dengan rumus koreksi, proyeksinya 2.669 MB, melebihi budget 2.500 MB. Ini adalah estimasi, bukan hasil pengukuran.
- Perilaku di atas L = 4 belum diketahui.
- Skalabilitas multi-worker (`--workers > 1`) belum diuji.

---

## 5. Gerbang Integritas Lingkungan (Preflight)

Run dianggap valid hanya jika gate berikut terpenuhi sebelum run dimulai:

- swap terpakai ≤ 500 MB
- available memory (free + inactive + speculative) ≥ 3.000 MB
- daya AC terpasang
- suhu normal
- ruang disk ≥ 5 GB

Setiap baris hasil wajib mencatat: gate_swap_max_mb, gate_avail_min_mb, gate_ac_required, swap_used_before_mb, avail_before_mb, on_ac_power, dan uvicorn_pid.

Tambahan v0.2.1: setiap baris juga mencatat `min_avail_during_run_mb` (available memory terendah selama run). Nilai ini dipakai untuk menandai run yang berada di bawah tekanan memori, walaupun gate lulus sebelum run.

---

## 6. Pertanyaan Terbuka Sebelum Implementasi A/B/C

1. Apakah import torch, MONAI, dan VTK berada di dalam interval volume prep? **YA, TERVERIFIKASI DI KODE**:
   - `backend/python_service/services/vti_converter.py:1621`: `volume_preparation_start`
   - `backend/python_service/services/vti_converter.py:1629`: memanggil `monai_preprocess` yang mengeksekusi `import torch` (baris 585) dan `from monai.transforms...` (baris 586–592).
   - `backend/python_service/services/vti_converter.py:1637`: memanggil `write_vti_vtk` yang mengeksekusi `import vtkmodules...` (baris 1069–1072).
   - `backend/python_service/services/vti_converter.py:1640`: `volume_preparation_end`.
   - *Tindakan pada fase berikutnya:* Pisahkan waktu import dari waktu konversi dengan mencatat keduanya sebagai kolom terpisah.
2. Apakah threadpool benar-benar memparalelkan konversi? Ukur CPU dan jumlah thread proses uvicorn selama probe L = 4.
3. Berapa λ maksimum yang bisa dilayani satu worker? Tentukan dari pilot, bukan dari 1/prep.
4. Apakah N = 401 perlu diulang di kondisi memori lebih longgar?

---

## 7. Keluaran yang Harus Dilaporkan

- Per tier N: upload duration, response-to-ready, volume prep, idle/peak/delta RSS, swap growth, dan min_avail_during_run_mb.
- Per level L: total duration, peak RSS total, delta RSS, maxOverlappingConversions.
- Setiap run yang berada di luar ambang (outlier, tekanan memori, dugaan import) harus dilaporkan dengan alasannya, bukan dibuang diam-diam.
