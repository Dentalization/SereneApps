# Hasil Eksperimen Karakterisasi Payload CDSS X-Core v0.2.1

> Tanggal evaluasi: Oktober 2026  
> Platform: Apple M3 (8-core CPU, 8 GB RAM, macOS Darwin 25.x)  
> Dataset: DICOM phantom sintetis terkalibrasi, N ∈ {25, 50, 100, 200, 401}  
> Sumber data: sweep.csv (30 run: 25 immediate + 5 legacy) dan concurrency.csv (9 run: L ∈ {1, 2, 4}, n = 3, N = 25)  
> Preflight: swap awal 0,0 MB, available memory 3.020,1 MB, AC, suhu normal (run pertama)

---

## 1. Taksonomi Hasil

| 1. Terukur dan stabil | 2. Terukur, perlu verifikasi | 3. Belum dapat disimpulkan |
|---|---|---|
| Idle RSS | N = 200 (outlier run 4) | L ≥ 8 |
| Volume prep N = 25, 50, 100 | N = 401 (provisional) | Multi-worker uvicorn |
| Delta RSS marjinal ≈ 290 MB per job (L ≤ 4, N = 25) | Intersep ~0,8 s (hipotesis import) | Perilaku open-model (belum diuji) |
| | Paralelisme threadpool (mekanisme belum terukur) | |

---

## 2. Kategori 1: Terukur dan Stabil

### 2.1 Baseline memori

- Idle RSS: 101,3 ± 0,2 MB (median 101,4; min 101,1; max 101,7). n = 30.

### 2.2 Skala N = 25, 50, 100

Run per tier n = 5, polling immediate. Swap growth per run = 0 MB untuk semua tier ini.

| Tier (N) | Ukuran upload (MB) | Volume prep (s) | Peak RSS median (MB) | Delta RSS mean ± SD (MB) |
|---|---|---|---|---|
| 25 | 15,0 | 0,91 ± 0,01 | 639,1 | 542,3 ± 14,5 |
| 50 | 30,1 | 1,04 ± 0,02 | 930,4 | 821,9 ± 22,0 |
| 100 | 60,1 | 1,28 ± 0,01 | 1.531,3 | 1.429,9 ± 0,3 |

Catatan:
- SD volume prep ≤ 0,02 s (≤ 20 ms) untuk ketiga tier.
- Swap growth per run = 0 MB. Namun sistem sudah memiliki 35,6 MB swap aktif sejak run ke-6 (N = 401, iterasi 1). Swap ini tetap ada sampai akhir sweep. Run N ≤ 100 yang dijalankan setelah run ke-6 memulai dengan swap 35,6 MB, dan tidak menambah swap.

### 2.3 Konkurensi pada N = 25 (n = 3 per level)

| L | Total duration rata-rata (s) | Peak RSS rata-rata (MB) | Delta RSS rata-rata (MB) | Max overlap | Swap growth (MB) |
|---|---|---|---|---|---|
| 1 | 1,04 | 658,1 | 556,7 | 1 / 1 | 0,0 |
| 2 | 1,20 | 947,8 | 846,4 | 2 / 2 | 0,0 |
| 4 | 1,31 | 1.529,3 | 1.427,9 | 4 / 4 | 0,0 |

Nilai di tabel adalah rata-rata dari tiga repetisi (nilai per-run dalam CSV).

Observasi:
- Pada L = 4, empat konversi tercatat mulai dalam rentang 2 ms (167116–167118 ms epoch) dan selesai dalam rentang 1 ms (168130–168131 ms). Masing-masing berjalan sekitar 1,01 s, sama dengan satu job. Keempat job benar-benar berjalan bersamaan.
- Delta marjinal per job: (947,8 − 658,1) = 289,7 MB untuk L 1→2, dan (1.529,3 − 947,8) / 2 = 290,8 MB per job untuk L 2→4.
- Throughput terukur pada L = 4: 4 job dalam 1,31 s, sekitar 3 job/s. Ini lebih tinggi daripada 1/volume prep (1,1 job/s).
- Batasan: hanya N = 25, n = 3 per level, dan L ≤ 4.

Mekanisme paralelisme (apakah thread torch/numpy/VTK berjalan paralel di 8 core, atau library melepas GIL) belum diukur. Lihat Kategori 2.

---

## 3. Kategori 2: Terukur, Perlu Verifikasi

### 3.1 N = 200: outlier pada run 4

| Statistik | Nilai |
|---|---|
| Volume prep, 5 run | 2,02 ± 0,62 s (median 1,75 s) |
| Volume prep, 4 run tanpa run 4 | 1,75 ± 0,01 s |
| Run 4 | 3,13 s (upload 0,93 s; response-to-ready 3,36 s) |
| Peak RSS median | 2.723,7 MB |
| Peak RSS run 4 | 2.536,3 MB (terendah dari lima run) |
| Available memory sebelum run 4 | 3.009,3 MB (paling rendah dari semua run sweep, dekat gate) |

Dugaan penyebab run 4: gangguan latar belakang saat run. Dugaan ini belum diuji. Run 4 tetap dilaporkan.

### 3.2 N = 401: provisional, di bawah tekanan memori

| Statistik | Nilai |
|---|---|
| Volume prep | 3,47 ± 0,05 s (CV 1,4%) |
| Upload-to-ready total | 4,84 ± 0,53 s |
| Peak RSS | median 2.965,8 MB; mean 3.038,8 MB; rentang 2.683,4–3.734,7 MB |
| Swap growth | 0 MB pada 4 run; 35,6 MB pada run 6 (iterasi 1) |
| Available memory selama run | 1.303–1.560 MB (di bawah gate 3.000 MB pada semua run N = 401) |

Gate hanya dicek sebelum run, jadi run N = 401 dimulai dalam kondisi lulus, tetapi available memory turun di bawah 1,6 GB selama run.

Volume prep N = 401 stabil (SD 0,05 s), meskipun peak RSS berbeda hingga 1.051 MB antar run. Ini menunjukkan variasi RSS tidak sepenuhnya terkait dengan waktu komputasi. Tetapi hubungan keduanya belum diuji.

Keputusan: N = 401 dilaporkan sebagai provisional. Pengulangan di kondisi memori lebih longgar diperlukan sebelum angka N = 401 dipakai sebagai angka resmi.

### 3.3 Intersep volume prep ~0,8 s

- Dugaan: biaya import torch, MONAI, dan VTK di dalam interval volume prep, karena setiap run me-restart uvicorn.
- Bukti: regresi volume prep terhadap N menghasilkan intersep sekitar 0,8 s (kemiringan sekitar 5 ms per slice untuk N ≤ 100 dan sekitar 7 ms per slice untuk N ≤ 401).
- Status: hipotesis. Terverifikasi bahwa kode import berada di dalam interval `volume_preparation_start` sampai `volume_preparation_end` (`vti_converter.py:1621–1640`), namun pemisahan waktu import dari waktu konversi belum dicatat sebagai kolom terpisah.
- Warm-up tidak menghilangkan biaya ini, karena warm-up hanya memanaskan cache file OS.

### 3.4 Mekanisme paralelisme

- Data: empat job berjalan bersamaan dengan durasi hampir sama seperti satu job.
- Dugaan: operasi C++ di NumPy, VTK, dan PyTorch melepas GIL, sehingga thread berjalan paralel di beberapa core.
- Status: belum diukur. Diperlukan pemantauan CPU per thread selama probe.

---

## 4. Kategori 3: Belum Dapat Disimpulkan

1. Konkurensi L ≥ 8. Dengan rumus koreksi, proyeksi 2.669 MB, di atas budget 2.500 MB. Ini estimasi, bukan hasil. Perilaku di atas L = 4 belum diketahui.
2. Multi-worker uvicorn (`--workers > 1`) belum diuji.
3. Perilaku open-model (arrival rate) belum diuji.
4. Perbandingan terhadap arsitektur sinkron dan BackgroundTasks belum diukur di data ini. Arsitektur A, B, dan C akan diuji pada fase berikutnya.

---

## 5. Klaim yang Dihapus

1. Serialisasi kaku: dihapus. Data menunjukkan eksekusi paralel (overlap 4/4).
2. Linear sempurna: dihapus. Model linear hanya berlaku sampai N = 200. Di atas N = 200, peak RSS median tidak mengikuti model (lihat bagian 3.2).
3. Kapasitas single-worker 1/prep: dihapus. Data concurrency menunjukkan throughput yang lebih tinggi daripada 1/prep.

---

## 6. Catatan Metodologis

- Setiap angka di dokumen ini berasal dari sweep.csv atau concurrency.csv. Tidak ada angka dari run lama, run kontaminasi, atau data sintetis.
- Setiap baris data dicatat dengan gate yang dipakai dan kondisi preflight.
- Tidak ada run yang dibuang dari analisis. Outlier (N = 200 run 4) dan run tekanan memori (N = 401) dilaporkan dengan keterangannya.
