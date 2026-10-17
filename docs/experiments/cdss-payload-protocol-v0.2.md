# Protokol Eksperimen CDSS X-Core v0.2: Karakterisasi Beban dan Skalabilitas Pipeline

> **Dokumen Versi:** v0.2 (Revisi Pasca-Audit Empiris)  
> **Tanggal:** Oktober 2026  
> **Target Arsitektur:** Node.js Backend (`v22.12.0`) + FastAPI/Uvicorn (`0.129.0`) + MONAI (`1.5.2`) / PyTorch (`2.10.0`) / VTK (`9.x`)  
> **Target Platform:** Apple Silicon M3 (8 GB Unified Memory, macOS Darwin 25.x)  
> **Status:** Revisi Metodologis Berdasarkan Audit Empiris dan Validasi Faktual

---

## 1. Latar Belakang dan Justifikasi Revisi v0.2

Pada protokol v0.1 dan audit data empiris, diidentifikasi beberapa batasan metodologis yang harus diperbaiki:
1. **Keterlibatan Modul Dinamis pada Intersep Waktu:** Pemanggilan pustaka berat (`torch`, `monai`, `vtkmodules`) dilakukan secara malas (*lazy import*) di dalam blok pengukuran antara `volume_preparation_start` dan `volume_preparation_end`. Karena runner benchmark mengeksekusi proses Uvicorn baru (*fresh process*) pada setiap run, inisialisasi modul Python terjadi di setiap pengujian. Intersep waktu ~0,8 detik diperlakukan sebagai **hipotesis kerja keterlibatan overhead pemuatan modul dinamis**, bukan konstanta voxel murni.
2. **Keterbatasan Beban Closed-Loop Virtual Users (VU):** Model pengujian berbasis VU tertutup menahan laju request saat server melambat, mengaburkan perilaku antrean riil pada kondisi produksi.
3. **Koreksi Model Proyeksi Anggaran Konkurensi:** Runner awal mengeksekusi gate anggaran dengan rumus $\text{idle} + L \times \text{median}(\Delta\text{RSS})$, yang mengalikan basis runtime tetap (~230 MB). Di v0.2, model matematis dikoreksi menggunakan penambahan marjinal per job (~290 MB) yang terbukti secara empiris pada threadpool.
4. **Batas Keberlakuan Model Memori ($N \le 200$) dan Status $N=401$:** Konsumsi memori hanya berskala linear hingga $N=200$. Pada $N=401$, kurva memori mengalami deselerasi/saturasi (Peak RSS terukur 2.966 MB vs proyeksi linear 5.040 MB) serta memicu tekanan memori riil (RAM bebas anjlok ke 1.303–1.560 MB dan swap bertambah 35,6 MB). Tier $N=401$ secara tegas diklasifikasikan sebagai **provisional**.

---

## 2. Metodologi dan Spesifikasi Uji

### 2.1 Fase Warm-up dan Hipotesis Pemuatan Modul
- **Prosedur:** Sebelum iterasi pencatatan ($n=1 \dots 5$) dimulai, runner dapat menjalankan 1 kali *warm-up run* menggunakan dataset kecil ($N=10$).
- **Batasan Faktual:** Pada arsitektur di mana setiap run me-restart proses Uvicorn, *warm-up* hanya menghangatkan *page cache* file sistem operasi di level kernel, sedangkan waktu eksekusi pemuatan modul Python (`importlib`, inisialisasi PyTorch/VTK) tetap dieksekusi pada proses baru. Oleh karena itu, intersep ~0,8 detik tetap ada dan dicatat sebagai dugaan beban inisialisasi modul dinamis dalam lingkungan proses dingin (*cold process*).

### 2.2 Sumbu Beban Berbasis Arrival Rate (Open Model)
- Model pengujian beralih dari Virtual Users tertutup (*closed-loop VU*) ke **injeksi laju kedatangan terbuka (*open-model arrival rate*)**.
- Permintaan konversi disubmit dengan interval target $\lambda$ (jobs/detik) yang deterministik, terlepas dari status pekerjaan sebelumnya di dalam threadpool, guna mengevaluasi latensi antrean (*queue latency*) dan batas saturasi multi-core secara transparan.

### 2.3 Parameter Worker dan Konkurensi
- **Konfigurasi Uvicorn:** Single worker process (`uvicorn main:app --workers 1`).
- **Mekanisme Eksekusi Asinkron:** Endpoint `POST /convert/{study_id}` menerima upload, mengembalikan HTTP 200 dengan status `{"status": "converting"}`, dan mendelegasikan tugas sinkron `_ensure_vti_conversion_singleflight` ke FastAPI `BackgroundTasks`.
- **Threadpool:** Dieksekusi secara konkuren melalui internal threadpool Starlette/AnyIO.
- **Tingkat Konkurensi:** $L \in \{1, 2, 4\}$. Tingkat $L=8$ dilewati pada host 8 GB demi mencegah risiko *out-of-memory* (OOM) dan OS thrashing.

### 2.4 Ukuran Sampel dan Kriteria Validitas
- **Sampel per Tier:** $n \ge 5$ pengujian independen per ukuran payload $N \in \{25, 50, 100, 200, 401\}$.
- **Urutan Acak:** Pengacakan urutan run menggunakan pseudo-random seed deterministik guna meredam bias urutan caching OS.
- **Polling Rate:** Polling status instan ($t=0$ dan interval 100 ms) untuk menghilangkan penalti latensi polling lama (500 ms).

---

## 3. Model Memori Empiris (Empirical Memory Model)

### 3.1 Model Skalabilitas Linear Terbatas ($N \le 200$)
Berdasarkan telemetri memori terpadu macOS, konsumsi memori pipeline CDSS untuk beban bertingkat memiliki batas keberlakuan eksklusif pada **$N \le 200$**:

$$\text{Peak RSS}(N, L) = \text{RSS}_{\text{idle}} + \Delta_{\text{base}} + (\alpha \times N) + (L - 1) \times \Delta_{\text{concurrent\_job}} \quad \text{untuk } N \le 200$$

Dimana:
1. **$\text{RSS}_{\text{idle}}$:** $\approx 101,3 \pm 0,2$ MB (baseline proses Uvicorn dalam kondisi diam).
2. **$\Delta_{\text{base}}$:** $\approx 230$ MB (alokasi tetap untuk runtime Python, konteks PyTorch, dan buffer inisial).
3. **$\alpha$ (Koefisien per slice):** $\approx 12$ MB per slice DICOM ($N \le 200$).
4. **$\Delta_{\text{concurrent\_job}}$:** $\approx 290$ MB (penambahan memori marjinal per concurrent thread pada threadpool).

> **Peringatan Batas Model:**  
> Rumus linear di atas **tidak berlaku untuk $N=401$**. Jika diterapkan pada $N=401$, rumus memproyeksikan memori $\approx 5.040$ MB ($230 + 12 \times 401$). Faktanya, Peak RSS terukur pada $N=401$ adalah **2.965,8 MB (Mean 3.038,8 MB)** karena terjadi deselerasi/saturasi alokasi buffer dan manajemen memori terpadu macOS di bawah tekanan memori fisik.

### 3.2 Rekonsiliasi Rumus Gate Anggaran Probe Konkurensi ($L=8$)
Untuk menentukan kelayakan konkurensi $L$ pada batas anggaran keselamatan ($\text{Budget} = 2.500$ MB):

1. **Rumus Aktual yang Dieksekusi Runner (`run-concurrency-probe.mjs`):**
   $$\text{Projected}(L) = \text{RSS}_{\text{idle}} + L \times \text{median}(\Delta\text{RSS}_{\text{sweep}})$$
   - Pada $L=8$: $101,4 + 8 \times 538,0 = \mathbf{4.405,4\text{ MB}} > 2.500\text{ MB} \to$ **SKIPPED (EXCEEDS BUDGET)**.

2. **Rumus Koreksi Berdasarkan Marjinal Per-Job:**
   $$\text{Projected}(L) = (\text{RSS}_{\text{idle}} + \text{median}(\Delta\text{RSS}_{L=1})) + (L - 1) \times 290\text{ MB}$$
   - Pada $L=8$: $639,4 + 7 \times 290 = \mathbf{2.669,4\text{ MB}} > 2.500\text{ MB} \to$ **SKIPPED (EXCEEDS BUDGET)**.

*Kesimpulan:* Kedua formula secara konsisten melampaui batas aman $2.500$ MB sehingga keputusan melewatkan $L=8$ sepenuhnya tepat secara rekayasa, namun runner eksekusi secara faktual mengevaluasi rumus pertama.

---

## 4. Gerbang Integritas Lingkungan (Preflight Cleanliness Gate)

Pengujian benchmark dinyatakan valid apabila memenuhi gerbang kebersihan OS:
- `MAX_SWAP_USED_MB`: $\le 500$ MB saat inisiasi.
- `MIN_AVAILABLE_MEM_MB`: $\ge 3.000$ MB saat inisiasi.
- `REQUIRE_AC_POWER`: `true` (Wajib charger terpasang).
- `REQUIRE_NORMAL_THERMAL`: `true` (Suhu normal, tanpa pembatasan termal).
- `DISK_GUARD_MIN_FREE_GB`: $\ge 5.0$ GB ruang disk kosong.
