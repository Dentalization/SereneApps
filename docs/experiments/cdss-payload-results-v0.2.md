# Hasil Eksperimen Karakterisasi Payload CDSS X-Core v0.2

> **Tanggal Evaluasi:** Oktober 2026  
> **Platform Pengujian:** Apple M3 (8-core CPU, 8 GB RAM, macOS Darwin 25.x)  
> **Dataset:** DICOM Phantom Series Sintetis Terkalibrasi ($N \in \{25, 50, 100, 200, 401\}$)  
> **Konfigurasi Eksekusi:** Protokol Bersih (Preflight: Swap awal 0,0 MB, RAM tersedia 3.020,1 MB, AC Power)

---

## 1. Ringkasan Kategori Temuan

Hasil evaluasi dikelompokkan ke dalam tiga kategori taksonomi ketat berdasarkan tingkat stabilitas empiris:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      TAKSONOMI HASIL EVALUASI v0.2                    │
├─────────────────────────┬──────────────────────────┬───────────────────┤
│ 1. Terukur dan Stabil   │ 2. Terukur tapi Perlu     │ 3. Belum Dapat    │
│                         │    Verifikasi            │    Disimpulkan    │
├─────────────────────────┼──────────────────────────┼───────────────────┤
│ • Baseline Idle RSS     │ • Tier N=200 (Outlier)   │ • Konkurensi L > 4│
│ • Skala Prep N=25..100  │ • Tier N=401             │ • Arsitektur      │
│ • Konkurensi L=1, 2, 4  │   (Tekanan Memori & Swap)│   Multi-Worker    │
│ • Delta Marjinal 290 MB │ • Intersep Latensi 0,8 s │   Uvicorn         │
│                         │ • Hipotesis Pelepasan GIL│                   │
└─────────────────────────┴──────────────────────────┴───────────────────┘
```

---

## 2. Kategori 1: Terukur dan Stabil (Empirically Confirmed & Stable)

Metrik pada kategori ini menunjukkan varians rendah, bebas dari efek paging swap, dan dapat direproduksi secara konsisten.

### 2.1 Baseline Memory Footprint
- **Idle Baseline RSS:** $101,3 \pm 0,2$ MB (Median: 101,4 MB; Min: 101,1 MB; Max: 101,7 MB).
- Menunjukkan bahwa sebelum pemrosesan volume dimulai, runtime proses baru Python + Uvicorn + FastAPI memiliki konsumsi memori dasar yang sangat konstan.

### 2.2 Skalabilitas Beban Ringan dan Menengah Rendah ($N = 25, 50, 100$)
Pengujian $n=5$ per tier menunjukkan stabilitas tinggi dengan standar deviasi waktu di bawah 20 milidetik dan swap growth persis **0,0 MB**:

| Tier ($N$) | Ukuran Upload (MB) | Durasi Volume Prep (s) | Peak RSS Median (MB) | Delta RSS Mean ± SD (MB) | Swap Growth (MB) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **N=25** | 15,0 | $0,91 \pm 0,01$ | 639,1 | $542,3 \pm 14,5$ | $0,0 \pm 0,0$ |
| **N=50** | 30,1 | $1,04 \pm 0,02$ | 930,4 | $821,9 \pm 22,0$ | $0,0 \pm 0,0$ |
| **N=100** | 60,1 | $1,28 \pm 0,01$ | 1.531,3 | $1.429,9 \pm 0,3$ | $0,0 \pm 0,0$ |

### 2.3 Perilaku Konkurensi Pipeline Threadpool ($N=25, L \in \{1, 2, 4\}$)
Pengujian konkurensi pada beban $N=25$ menunjukkan pemrosesan paralel yang stabil:

| Concurrency ($L$) | Mean Total Latency (s) | Peak RSS (MB) | Delta RSS (MB) | Max Overlap | Swap Growth (MB) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **L=1** | $1,04 \pm 0,00$ | 658,2 | 556,7 | 1 / 1 | 0,0 |
| **L=2** | $1,20 \pm 0,08$ | 948,6 | 846,4 | 2 / 2 | 0,0 |
| **L=4** | $1,31 \pm 0,01$ | 1.530,2 | 1.427,9 | 4 / 4 | 0,0 |

- **Konkurensi Penuh:** Metrik `maxOverlappingConversions` mencatat **2/2** pada $L=2$ dan **4/4** pada $L=4$. Keempat pekerjaan konversi pada $L=4$ tercatat mulai dan selesai dalam milidetik yang sama (~1.014 ms).
- **Delta Marjinal per Job:** Selisih Peak RSS dari $L=1 \to L=2$ adalah $+290,4$ MB, dan dari $L=2 \to L=4$ adalah $+581,6$ MB ($\approx 290,8$ MB per job). Setiap thread kerja paralel hanya membutuhkan memori marjinal **$\sim 290$ MB**, bukan mereplikasi keseluruhan overhead proses.

---

## 3. Kategori 2: Terukur tapi Perlu Verifikasi (Provisional / Needs Verification)

Kategori ini mencakup data yang telah diperoleh secara empiris namun memiliki outlier, berada di bawah tekanan memori, atau berbasis hipotesis kerja.

### 3.1 Status Tier $N=200$ (Varians Tinggi / Outlier Run)
- **Data Terukur ($n=5$):**
  - Durasi Volume Prep Keseluruhan: **$2,02 \pm 0,62$ s** (SD tinggi, CV 30,7%).
  - Detail Iterasi: Empat iterasi berada di rentang sangat konsisten **$1,73–1,76$ s** ($1.747, 1.732, 1.756, 1.750$ ms). Namun, terdapat 1 outlier signifikan pada Iterasi 4 dengan durasi **$3,13$ s** ($3.133$ ms).
  - Rata-rata tanpa outlier: **$1,75 \pm 0,01$ s** (Median: $1,75$ s).
  - Peak RSS Median: $2.723,7$ MB ($\Delta\text{RSS } 2.584,9 \pm 83,8$ MB).
- **Catatan Verifikasi:** Karena adanya lonjakan latensi tunggal (+1,38 s pada iterasi 4), tier $N=200$ tidak dapat dikategorikan sebagai sepenuhnya stabil tanpa menyertakan catatan analisis outlier.

### 3.2 Status Tier $N=401$ (Tekanan Memori Fisik & Swap Paging)
- **Data Terukur ($n=5$):**
  - Durasi Volume Prep: $3,47 \pm 0,05$ s (sangat stabil di level komputasi CPU, CV < 2%).
  - Total Upload-to-Ready: $4,84 \pm 0,53$ s.
  - Peak RSS: Median $2.965,8$ MB (Mean $3.038,8 \pm 427,2$ MB; Rentang: $2.683,4 – 3.734,7$ MB).
  - Swap Terukur: Pada Run 6 (iterasi pertama $N=401$), terjadi **swap growth sebesar $35,6$ MB** yang kemudian tetap aktif di sistem hingga akhir pengujian sweep dan probe.
  - Penurunan RAM Bebas: Pada seluruh iterasi $N=401$, memori yang tersedia (*available memory*) anjlok ke rentang **$1.303 – 1.560$ MB**, jauh di bawah ambang batas kebersihan preflight ($3.000$ MB).
- **Catatan Verifikasi:** Terjadinya swap $35,6$ MB, jatuhnya RAM tersedia ke ~1,3 GB, dan variasi Peak RSS selebar 1.051 MB membuktikan bahwa beban $N=401$ beroperasi di bawah tekanan memori fisik pada Mac 8 GB. Data ini dilaporkan secara transparan sebagai **provisional**.

### 3.3 Intersep Latensi $\sim 0,8$ Detik (Hipotesis Inisialisasi Modul)
- **Audit Kode:** Modul `torch`, `monai`, dan `vtkmodules` diimpor di dalam fungsi pemrosesan (`monai_preprocess` dan `write_vti_vtk`) di antara tanda waktu `volume_preparation_start` dan `volume_preparation_end`.
- **Status Faktual:** Karena setiap pengujian me-restart Uvicorn, eksekusi pemuatan modul dinamis Python terjadi di setiap proses baru. Intersep ~0,8 s saat ini dicatat sebagai **hipotesis kerja beban inisialisasi modul pada proses dingin (*cold process*)**.

### 3.4 Dugaan Pelepasan GIL pada Operasi C++
- Pemrosesan paralel multi-thread (overlap 4/4) pada $L=4$ berjalan dengan durasi hampir identik dengan $L=1$.
- **Status Faktual:** Penjelasan bahwa "operasi komputasi matriks C++ (NumPy/VTK/PyTorch) melepaskan GIL" dicatat sebagai **dugaan teknis yang masuk akal (*working hypothesis*)**, namun belum diukur secara langsung melalui profiler kernel/GIL.

---

## 4. Kategori 3: Belum Dapat Disimpulkan (Inconclusive / Out of Scope)

1. **Konkurensi Tinggi ($L \ge 8$):** Tingkat $L=8$ dilewati secara terencana demi melindungi kestabilan memori Mac 8 GB (proyeksi $4.405$ MB via rumus eksekusi dan $2.669$ MB via rumus marjinal keduanya $> 2.500$ MB). Perilaku sistem pada $L \ge 8$ berada di luar cakupan data teruji.
2. **Arsitektur Multi-Worker Uvicorn:** Pengujian terbatas pada 1 worker Uvicorn dengan internal threadpool. Skalabilitas proses independen (`--workers 4`) belum dievaluasi.

---

## 5. Penghapusan Klaim yang Tidak Didukung Bukti (De-claiming)

1. **Klaim Serialisasi Kaku:** DIHAPUS. Terbukti terjadi eksekusi paralel multi-thread (overlap 4/4) pada threadpool.
2. **Klaim Hubungan "Linear Sempurna":** DIHAPUS. Skalabilitas memori saturatif di atas $N=200$, dan waktu dipengaruhi kombinasi algoritma sorting O(N log N) serta kompresi VTK.
3. **Klaim Kapasitas Statis Single-Worker ($1 / \text{prep}$):** DIHAPUS. Estimasi statis mengabaikan kemampuan pipeline memanfaatkan konkurensi threadpool.
