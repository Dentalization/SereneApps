# Analisis Parsial Eksperimen Komparasi Arsitektur CDSS (A/B/C)
**Tanggal Analisis**: 18 Oktober 2026  
**Status Laporan**: **ANALISIS PARSIAL (PARTIAL ANALYSIS)**  
*(Status belum final karena hanya 13 dari 36 sel yang memenuhi syarat minimal $n \ge 5$ slot unik sesuai ketentuan Dr. Karim, 8 sel memiliki $n \in [2, 4]$, dan 15 sel belum memiliki data valid).*

---

## 1. Status Kelengkapan Data dan Coverage Matrix (36 Sel)

Sesuai protokol pengujian factorial $3 \times 3 \times 4$ (3 Arsitektur $\times$ 3 Ukuran Slice $N \in \{25, 100, 200\} \times 4$ Tingkat Konkurensi $VU \in \{10, 50, 100, 200\}$), setiap sel wajib memiliki minimal $n = 5$ slot replikasi independen yang valid.

Status eksekusi seluruh 36 sel disajikan pada tabel di bawah ini (menampilkan jumlah direktori valid dan jumlah slot unik):

| Arsitektur | Slice (N) | VU | Valid Directories | Unique Slots ($n$) | Total Percobaan | Gate Failed | k6 Failed | Other / Missing | Runs Dibutuhkan Menuju $n=5$ |
|---|---|---|---|---|---|---|---|---|---|
| sync | 25 | 10 | 6 | 5 | 12 | 2 | 0 | 4 | 0 (Memenuhi syarat) |
| background | 25 | 10 | 5 | 5 | 14 | 2 | 0 | 7 | 0 (Memenuhi syarat) |
| celery | 25 | 10 | 6 | 5 | 13 | 4 | 0 | 3 | 0 (Memenuhi syarat) |
| sync | 25 | 50 | 5 | 5 | 11 | 6 | 0 | 0 | 0 (Memenuhi syarat) |
| background | 25 | 50 | 5 | 5 | 9 | 4 | 0 | 0 | 0 (Memenuhi syarat) |
| celery | 25 | 50 | 5 | 5 | 9 | 4 | 0 | 0 | 0 (Memenuhi syarat) |
| sync | 25 | 100 | 4 | 4 | 12 | 6 | 2 | 0 | 1 |
| background | 25 | 100 | 5 | 5 | 10 | 4 | 1 | 0 | 0 (Memenuhi syarat) |
| celery | 25 | 100 | 5 | 5 | 10 | 5 | 0 | 0 | 0 (Memenuhi syarat) |
| sync | 25 | 200 | 4 | 4 | 14 | 8 | 2 | 0 | 1 |
| background | 25 | 200 | 2 | 2 | 13 | 4 | 7 | 0 | 3 |
| celery | 25 | 200 | 4 | 4 | 15 | 10 | 1 | 0 | 1 |
| sync | 100 | 10 | 5 | 5 | 10 | 5 | 0 | 0 | 0 (Memenuhi syarat) |
| background | 100 | 10 | 5 | 5 | 11 | 6 | 0 | 0 | 0 (Memenuhi syarat) |
| celery | 100 | 10 | 5 | 5 | 13 | 6 | 0 | 2 | 0 (Memenuhi syarat) |
| sync | 100 | 50 | 3 | 3 | 13 | 8 | 2 | 0 | 2 |
| background | 100 | 50 | 3 | 3 | 12 | 2 | 6 | 1 | 2 |
| celery | 100 | 50 | 3 | 3 | 17 | 11 | 2 | 1 | 2 |
| sync | 100 | 100 | 0 | 0 | 14 | 8 | 6 | 0 | 5 |
| background | 100 | 100 | 0 | 0 | 16 | 9 | 7 | 0 | 5 |
| celery | 100 | 100 | 0 | 0 | 16 | 9 | 7 | 0 | 5 |
| sync | 100 | 200 | 0 | 0 | 18 | 8 | 10 | 0 | 5 |
| background | 100 | 200 | 0 | 0 | 14 | 8 | 6 | 0 | 5 |
| celery | 100 | 200 | 0 | 0 | 13 | 4 | 9 | 0 | 5 |
| sync | 200 | 10 | 4 | 4 | 9 | 4 | 1 | 0 | 1 |
| background | 200 | 10 | 5 | 5 | 14 | 9 | 0 | 0 | 0 (Memenuhi syarat) |
| celery | 200 | 10 | 5 | 5 | 14 | 9 | 0 | 0 | 0 (Memenuhi syarat) |
| sync | 200 | 50 | 0 | 0 | 15 | 3 | 12 | 0 | 5 |
| background | 200 | 50 | 0 | 0 | 15 | 4 | 11 | 0 | 5 |
| celery | 200 | 50 | 0 | 0 | 16 | 4 | 12 | 0 | 5 |
| sync | 200 | 100 | 0 | 0 | 16 | 4 | 12 | 0 | 5 |
| background | 200 | 100 | 0 | 0 | 16 | 8 | 8 | 0 | 5 |
| celery | 200 | 100 | 0 | 0 | 21 | 7 | 12 | 2 | 5 |
| sync | 200 | 200 | 0 | 0 | 14 | 8 | 6 | 0 | 5 |
| background | 200 | 200 | 0 | 0 | 15 | 8 | 7 | 0 | 5 |
| celery | 200 | 200 | 0 | 0 | 15 | 8 | 6 | 1 | 5 |

**Ringkasan Status Cakupan**:
- **Sel dengan $n \ge 5$ slot unik**: 13 sel (36.1% dari total 36 sel).
- **Sel dengan $n \in [2, 4]$ slot unik**: 8 sel (22.2% dari total 36 sel). Data disajikan murni secara deskriptif/eksploratif.
- **Sel dengan $n = 0$ (tanpa run valid)**: 15 sel (41.7% dari total 36 sel).
- **Total Validated Runs**: 94 direktori run valid (mewakili 92 kombinasi unik sel-replikasi).
- **Tingkat Kelayakan Naskah**: **Belum layak untuk naskah lengkap**. Sesuai arahan Dr. Karim, penulisan naskah lengkap menunggu pengujian seluruh 36 sel lengkap $n \ge 5$.

### Penanganan Replikasi Duplikat (Duplicate Valid Replications)
Dari 94 direktori run valid, ditemukan 2 slot kombinasi `(arch, n_slices, vus, repetition)` yang masing-masing memiliki dua eksekusi valid pada disk:
1. `('sync', 25, 10, rep 1)`:
   - `run_20261016_235731`: commit `e00528d`, sha `9976e286...`, e2e p95 5,309 ms.
   - `run_20261017_002526`: commit `4347740`, sha `9976e286...`, e2e p95 4,622 ms.
2. `('celery', 25, 10, rep 3)`:
   - `run_20261017_000019`: commit `e00528d`, sha `9976e286...`, e2e p95 4,601 ms.
   - `run_20261017_002547`: commit `4347740`, sha `9976e286...`, e2e p95 4,428 ms.

**Aturan Keputusan Seleksi Berbasis Provenance (Provenance-Based Selection Rule)**:
- Kedua pasang run memiliki `script_sha256` yang identik (`9976e28640a2ae838ef8a0e7350d35e7e604141c8957606a0547cf6208e6fa16`).
- **Aturan Primer**: Dipilih run yang dieksekusi di bawah commit `4347740326a991a0a3e681d7f61d7686f15f3dbd` (commit baseline re-pilot yang telah menyertakan pembaruan konfigurasi dan provenance final).
- **Uji Sensitivitas**: Seluruh 6 run valid juga dianalisis dalam bentuk *pooled* ($n=6$). Hasil uji Kruskal-Wallis ($p = 0.3107$) dan Dunn-Holm ($p \ge 0.38$) menunjukkan kesimpulan statistik 100% identik dan tidak terpengaruh oleh pilihan run.
- Seluruh detail audit duplikasi dicatat dalam [`experiments/results/duplicate_validated_reps_20261018.csv`](file:///Users/adrianhalim/SereneApps/experiments/results/duplicate_validated_reps_20261018.csv).

---

## 2. Statistik Deskriptif untuk Sel dengan $n \ge 2$

Tabel berikut mencantumkan metrik performansi dan sumber daya hanya untuk sel operasional ($n \ge 2$). Seluruh angka disajikan dalam format: **Median [Min – Max]**.

| Arsitektur | N | VU | Slot ($n$) | Direktori | Latensi e2e p95 (ms) | Throughput (req/s) | Failure Rate | Peak Uvicorn RSS (MB) | Peak Celery RSS (MB) | Peak Total Stack RSS (MB) | Rata-rata CPU (%) | Swap Growth (MB) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **sync** | 25 | 10 | 5 | 6 | 4,609.5 [2,369.0 – 5,309.0] | 1.79 [1.41 – 3.33] | 0.0000 [0.0000 – 0.0000] | 1,632.5 [1,525.3 – 1,687.6] | 0.0 [0.0 – 0.0] | 2,114.5 [1,746.7 – 2,168.9] | 42.4% [20.9% – 59.4%] | -8.0 [-48.0 – 0.0] |
| **background** | 25 | 10 | 5 | 5 | 2,741.0 [2,647.0 – 4,915.0] | 2.95 [1.35 – 3.02] | 0.0000 [0.0000 – 0.0000] | 1,647.4 [1,341.8 – 1,656.4] | 0.0 [0.0 – 0.0] | 2,130.7 [1,490.9 – 2,139.6] | 46.0% [20.1% – 59.0%] | 0.0 [0.0 – 0.0] |
| **celery** | 25 | 10 | 5 | 6 | 4,641.0 [4,428.0 – 7,271.0] | 1.87 [0.92 – 1.94] | 0.0000 [0.0000 – 0.0000] | 141.3 [132.6 – 144.2] | 1,665.4 [1,359.7 – 1,668.7] | 2,261.5 [1,691.8 – 2,293.8] | 27.7% [11.9% – 56.2%] | 0.0 [-11.4 – 0.0] |
| **sync** | 25 | 50 | 5 | 5 | 6,558.0 [5,489.0 – 7,328.0] | 5.44 [4.10 – 6.30] | 0.0000 [0.0000 – 0.0000] | 1,516.6 [1,368.4 – 1,572.5] | 0.0 [0.0 – 0.0] | 1,661.9 [1,563.6 – 1,709.3] | 38.8% [25.7% – 52.2%] | -8.0 [-40.0 – -8.0] |
| **background** | 25 | 50 | 5 | 5 | 8,388.0 [6,544.0 – 9,883.0] | 4.42 [3.69 – 5.43] | 0.0000 [0.0000 – 0.0000] | 1,508.7 [1,497.5 – 1,563.7] | 0.0 [0.0 – 0.0] | 1,636.5 [1,603.4 – 1,675.3] | 51.0% [43.8% – 73.1%] | -8.0 [-24.0 – 0.0] |
| **celery** | 25 | 50 | 5 | 5 | 12,895.0 [11,898.0 – 15,278.0] | 2.55 [2.43 – 3.48] | 0.0000 [0.0000 – 0.0000] | 151.5 [131.7 – 192.6] | 1,589.2 [1,300.8 – 1,612.2] | 1,763.4 [1,390.8 – 1,907.8] | 39.0% [28.0% – 70.7%] | -24.0 [-40.0 – 179.8] |
| **sync** | 25 | 100 | 4 | 4 | 13,266.0 [12,445.0 – 14,917.0] | 6.10 [5.41 – 6.44] | 0.0000 [0.0000 – 0.0000] | 1,266.4 [1,241.6 – 1,314.7] | 0.0 [0.0 – 0.0] | 1,355.8 [1,337.3 – 1,449.1] | 44.5% [43.3% – 53.8%] | 1,680.2 [1,559.1 – 1,854.8] |
| **background** | 25 | 100 | 5 | 5 | 22,030.0 [14,251.0 – 31,981.0] | 4.02 [2.59 – 5.51] | 0.0000 [0.0000 – 0.0200] | 1,245.2 [1,112.8 – 1,371.1] | 0.0 [0.0 – 0.0] | 1,430.0 [1,230.5 – 1,447.5] | 61.0% [39.6% – 64.2%] | 1,595.0 [891.0 – 1,810.4] |
| **celery** | 25 | 100 | 5 | 5 | 25,371.0 [20,326.0 – 27,006.0] | 3.42 [3.25 – 3.90] | 0.0000 [0.0000 – 0.0000] | 149.5 [138.6 – 166.2] | 1,477.3 [1,264.6 – 1,497.8] | 1,655.6 [1,426.4 – 1,711.5] | 46.5% [25.5% – 58.9%] | 1,833.6 [940.4 – 1,983.8] |
| **sync** | 25 | 200 | 4 | 4 | 43,486.0 [32,288.0 – 66,798.0] | 3.18 [2.35 – 4.35] | 0.0125 [0.0000 – 0.0250] | 1,173.1 [1,039.2 – 1,229.1] | 0.0 [0.0 – 0.0] | 1,308.8 [1,168.1 – 1,344.8] | 45.4% [32.7% – 52.8%] | 6,019.0 [5,378.5 – 6,308.4] |
| **background** | 25 | 200 | 2 | 2 | 36,068.0 [31,991.0 – 40,145.0] | 3.93 [3.86 – 4.01] | 0.0125 [0.0000 – 0.0250] | 1,117.2 [1,001.8 – 1,232.6] | 0.0 [0.0 – 0.0] | 1,209.7 [1,125.8 – 1,293.7] | 37.8% [35.7% – 39.9%] | 6,015.3 [6,013.5 – 6,017.1] |
| **celery** | 25 | 200 | 4 | 4 | 39,913.0 [38,716.0 – 42,455.0] | 3.20 [3.13 – 3.28] | 0.0025 [0.0000 – 0.0100] | 132.6 [127.7 – 166.9] | 1,210.5 [1,178.5 – 1,241.1] | 1,387.3 [1,364.8 – 1,411.2] | 38.2% [34.2% – 48.4%] | 5,696.5 [5,395.4 – 6,482.8] |
| **sync** | 100 | 10 | 5 | 5 | 11,738.0 [8,127.0 – 14,268.0] | 0.77 [0.61 – 1.07] | 0.0000 [0.0000 – 0.0000] | 2,554.9 [2,322.1 – 2,852.9] | 0.0 [0.0 – 0.0] | 2,605.3 [2,394.9 – 2,925.1] | 55.6% [31.0% – 60.2%] | 1,211.6 [840.1 – 1,628.2] |
| **background** | 100 | 10 | 5 | 5 | 9,238.0 [8,651.0 – 13,740.0] | 0.96 [0.66 – 1.02] | 0.0000 [0.0000 – 0.0000] | 2,377.7 [2,097.6 – 3,071.1] | 0.0 [0.0 – 0.0] | 2,474.6 [2,159.6 – 3,181.4] | 50.4% [39.3% – 59.1%] | 1,314.8 [911.9 – 2,028.8] |
| **celery** | 100 | 10 | 5 | 5 | 10,951.0 [9,102.0 – 14,000.0] | 0.71 [0.62 – 0.99] | 0.0000 [0.0000 – 0.0000] | 137.9 [136.8 – 139.3] | 2,369.8 [2,038.0 – 2,786.3] | 2,509.5 [2,140.6 – 2,951.8] | 53.5% [32.1% – 63.3%] | 1,201.8 [1,113.6 – 1,905.9] |
| **sync** | 100 | 50 | 3 | 3 | 50,600.0 [40,339.0 – 52,362.0] | 0.81 [0.73 – 0.86] | 0.0000 [0.0000 – 0.0000] | 2,525.8 [2,331.1 – 3,280.5] | 0.0 [0.0 – 0.0] | 2,569.6 [2,383.9 – 3,318.9] | 40.6% [30.7% – 40.7%] | 8,011.1 [7,904.4 – 8,268.9] |
| **background** | 100 | 50 | 3 | 3 | 60,997.0 [45,641.0 – 79,366.0] | 0.24 [0.23 – 0.54] | 0.0400 [0.0000 – 0.0600] | 2,794.3 [2,368.2 – 3,026.6] | 0.0 [0.0 – 0.0] | 2,842.3 [2,401.2 – 3,068.7] | 18.1% [13.3% – 38.0%] | 7,949.6 [6,840.9 – 9,275.8] |
| **celery** | 100 | 50 | 3 | 3 | 62,914.0 [51,330.0 – 97,556.0] | 0.63 [0.40 – 0.69] | 0.0000 [0.0000 – 0.0000] | 107.0 [107.0 – 111.4] | 2,776.8 [1,803.2 – 3,058.2] | 2,856.9 [1,868.5 – 3,126.6] | 43.6% [36.9% – 48.6%] | 8,102.0 [7,726.3 – 8,957.2] |
| **sync** | 200 | 10 | 4 | 4 | 28,990.0 [21,877.0 – 35,598.0] | 0.32 [0.26 – 0.41] | 0.0000 [0.0000 – 0.0000] | 3,154.1 [2,964.8 – 3,797.6] | 0.0 [0.0 – 0.0] | 3,216.2 [3,058.8 – 3,856.0] | 56.3% [39.6% – 65.0%] | 4,812.9 [3,424.8 – 4,990.2] |
| **background** | 200 | 10 | 5 | 5 | 23,127.0 [19,857.0 – 53,735.0] | 0.38 [0.17 – 0.46] | 0.0000 [0.0000 – 0.0000] | 3,652.7 [3,101.0 – 3,956.4] | 0.0 [0.0 – 0.0] | 3,703.6 [3,176.1 – 4,008.4] | 53.1% [40.8% – 67.6%] | 4,316.0 [4,253.2 – 5,470.4] |
| **celery** | 200 | 10 | 5 | 5 | 25,716.0 [21,589.0 – 33,698.0] | 0.33 [0.28 – 0.43] | 0.0000 [0.0000 – 0.0000] | 130.9 [120.1 – 136.1] | 3,938.7 [2,796.3 – 4,236.1] | 4,013.2 [2,876.3 – 4,302.0] | 47.4% [31.1% – 56.8%] | 4,483.6 [3,720.6 – 4,827.8] |

---

## 3. Analisis Inferensial Terbatas (Dunn-Holm Protocol)

Uji signifikansi non-parametrik (Kruskal-Wallis $H$, dilanjutkan post-hoc pairwise **Dunn dengan koreksi Holm-Bonferroni** via `scikit_posthocs.posthoc_dunn`, Cliff's delta effect size, dan *bootstrap 95% CI* dengan $B=5,000$ dan *fresh RNG* `np.random.default_rng(20261013)` per pasangan) **hanya dijalankan pada kondisi di mana ketiga arsitektur memiliki $n \ge 5$ slot unik**.

Dari 12 kombinasi $(N, VU)$, hanya 3 kondisi yang memenuhi syarat:
1. $N=25, VU=10$ (Sync $n=5$, Background $n=5$, Celery $n=5$ pada matriks slot unik)
2. $N=25, VU=50$ (Sync $n=5$, Background $n=5$, Celery $n=5$)
3. $N=100, VU=10$ (Sync $n=5$, Background $n=5$, Celery $n=5$)

Semua sel lainnya diberi label: **"not computed: n < 5"**.

### Rangkuman Uji Hipotesis Latensi e2e p95 (Protokol Dunn-Holm)

| Kondisi Factorial | Ukuran Sampel ($n$) | Kruskal-Wallis ($H, p$) | Hasil Pairwise Dunn-Holm ($p_{\text{dunn}}$, Cliff's $\delta$, 95% CI) | Kesimpulan Latensi |
|---|---|---|---|---|
| **$N=25, VU=10$** | Sync $n=5$<br>Background $n=5$<br>Celery $n=5$ | $H = 2.7699$<br>$p = 0.2503$ | - Sync vs Background: $p_{\text{dunn}} = 0.8596$, $\delta = -0.04$ [-0.76, 1.00], Median diff: 1,856 ms [-1,990, 1,973]<br>- Sync vs Celery: $p_{\text{dunn}} = 0.3843$, $\delta = -0.40$ [-1.00, 0.36], Median diff: -84 ms [-2,674, 169]<br>- Background vs Celery: $p_{\text{dunn}} = 0.3843$, $\delta = -0.68$ [-1.00, -0.04], Median diff: -1,940 ms [-4,530, 234] | **Tidak Signifikan ($p \ge 0.05$)**.<br>Tidak ada arsitektur yang dapat dinyatakan sebagai pemenang pada beban ringan ini. |
| **$N=25, VU=50$** | Sync $n=5$<br>Background $n=5$<br>Celery $n=5$ | $H = 10.5000$<br>$p = 0.0052$ | - Sync vs Celery: **$p_{\text{dunn}} = 0.0044$**, $\delta = -1.00$ [-1.00, -1.00] (**Signifikan [complete separation]**), Median diff: -6,337 ms [-8,720, -4,797]<br>- Background vs Celery: $p_{\text{dunn}} = 0.0678$, $\delta = -1.00$ [-1.00, -1.00] (**Tidak Signifikan [complete separation]**), Median diff: -4,507 ms [-7,095, -2,723]<br>- Sync vs Background: $p_{\text{dunn}} = 0.2888$, $\delta = -0.60$ [-1.00, 0.12], Median diff: -1,830 ms [-3,686, 243] | **Signifikan ($p < 0.05$) pada Sync vs Celery**.<br>Sync memiliki latensi p95 yang signifikan lebih rendah dibanding Celery. Background vs Celery secara unadjusted tampak berbeda, namun setelah koreksi Holm ($p=0.0678$) berada di atas ambang signifikansi $\alpha=0.05$. Nilai $\delta = -1.00$ dengan CI [-1, -1] mencerminkan pemisahan lengkap (*complete separation*). |
| **$N=100, VU=10$** | Sync $n=5$<br>Background $n=5$<br>Celery $n=5$ | $H = 0.6200$<br>$p = 0.7334$ | - Sync vs Background: $p_{\text{dunn}} = 1.0000$, $\delta = 0.20$ [-0.52, 1.00], Median diff: 2,500 ms [-2,714, 5,049]<br>- Sync vs Celery: $p_{\text{dunn}} = 1.0000$, $\delta = 0.20$ [-0.60, 1.00], Median diff: 787 ms [-2,974, 4,598]<br>- Background vs Celery: $p_{\text{dunn}} = 1.0000$, $\delta = -0.28$ [-0.92, 0.60], Median diff: -1,713 ms [-4,762, 3,710] | **Tidak Signifikan ($p \ge 0.05$)**.<br>Tidak ada perbedaan performansi latensi yang signifikan secara statistik di antara ketiga arsitektur. |
| **$N=25, VU=100$** | Sync $n=4$, BG $n=5$, Cel $n=5$ | *not computed: n < 5* | *not computed: n < 5* | **Perubahan dari Laporan Terdahulu**: Versi terdahulu melaporkan perbandingan ini ($H=7.426, p=0.024$; Sync vs Celery $p=0.029$). Namun karena Sync hanya memiliki $n=4$ slot (1 run gagal k6 exit -9), sel ini belum memenuhi syarat $n \ge 5$ dari Dr. Karim dan **ditarik dari klaim konfirmatori**. |
| **$N=25, VU=200$** | Sync $n=4$, BG $n=2$, Cel $n=4$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n < 5$) |
| **$N=100, VU=50$** | Sync $n=3$, BG $n=3$, Cel $n=3$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n < 5$) |
| **$N=100, VU=100$** | Sync $n=0$, BG $n=0$, Cel $n=0$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n = 0$) |
| **$N=100, VU=200$** | Sync $n=0$, BG $n=0$, Cel $n=0$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n = 0$) |
| **$N=200, VU=10$** | Sync $n=4$, BG $n=5$, Cel $n=5$ | *not computed: n < 5* | *not computed: n < 5* | **Tidak diuji secara formal** ($n_{\text{sync}}=4 < 5$). Nilai uji eksploratif $p = 0.744$ tidak signifikan dan dilarang dijadikan klaim temuan. |
| **$N=200, VU=50$** | Sync $n=0$, BG $n=0$, Cel $n=0$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n = 0$) |
| **$N=200, VU=100$** | Sync $n=0$, BG $n=0$, Cel $n=0$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n = 0$) |
| **$N=200, VU=200$** | Sync $n=0$, BG $n=0$, Cel $n=0$ | *not computed: n < 5* | *not computed: n < 5* | Tidak diuji ($n = 0$) |

---

## 4. Evaluasi Konsumsi Memori: Pemisahan Proses Web vs Total Stack

Klaim terkait konsumsi memori harus dipisahkan secara tegas antara **proses web (Uvicorn)** dan **total stack keseluruhan**:

### A. Memori Proses Web (Uvicorn RSS)
- **Celery menunjukkan isolasi memori pada proses web**: Proses Uvicorn pada Arsitektur C (Celery) tetap sangat ramping di seluruh payload dan konkurensi, dengan median berkisar antara **107.0 MB hingga 151.5 MB** (misalnya pada $N=200, VU=10$, median Uvicorn RSS Celery hanya **130.9 MB**).
- Sebaliknya, pada Arsitektur A (Sync) dan B (BackgroundTasks), proses Uvicorn membengkak karena rekonstruksi 3D CT-scan dan serialisasi array NumPy terjadi langsung di dalam proses web:
  - Pada $N=100, VU=10$: Uvicorn Sync mencapai **2,554.9 MB**, Background **2,377.7 MB**.
  - Pada $N=200, VU=10$: Uvicorn Sync mencapai **3,154.1 MB**, Background **3,652.7 MB**.

### B. Total Memori Stack (Total Stack RSS)
- **Total stack Celery TIDAK lebih rendah, melainkan lebih tinggi pada payload besar**:
  - Pada $N=200, VU=10$, total memori stack Celery (Uvicorn + Celery Worker + Redis) memiliki median **4,013.2 MB** [2,876.3 – 4,302.0 MB], di mana worker Celery sendiri mengonsumsi median **3,938.7 MB**.
  - Angka ini **lebih tinggi** daripada Arsitektur A (Sync: median **3,216.2 MB** [3,058.8 – 3,856.0 MB]) dan Arsitektur B (Background: median **3,703.6 MB** [3,176.1 – 4,008.4 MB]).
- **Kesimpulan Memori**: Arsitektur Celery berhasil mengisolasi beban kerja rekonstruksi dari proses penerimaan HTTP (mencegah degradasi web server), namun **total kebutuhan memori sistem (footprint) Celery secara keseluruhan justru lebih besar** akibat adanya overhead proses worker terpisah, broker Redis, dan duplikasi buffer selama IPC/serialisasi pesan.

---

## 5. Audit dan Analisis Sensitivitas Swap Growth

### Definisi dan Perhitungan Swap Growth
Metrik `swap_growth_mb` dihitung pada telemetri `MetricsSampler` di [`experiments/run_experiment.py`](file:///Users/adrianhalim/SereneApps/experiments/run_experiment.py#L665):
$$\text{swap\_growth\_mb} = \text{swap\_used\_mb}_{\text{final}} - \text{swap\_used\_mb}_{\text{initial}}$$
- **Definisi**: Selisih bersih (net change) memori swap fisik yang terpakai pada sistem operasi (macOS) antara sampel telemetri periodik pertama (saat uji beban k6 dimulai) dan sampel terakhir (saat uji beban selesai).
- **Satuan**: Megabytes (MB).
- **Kondisi Awal**: Pada sel ringan ($N=25, VU=10$ dan $VU=50$), sistem sudah memulai pengujian dengan swap sebesar 250–500 MB yang terpakai dari proses latar belakang OS macOS. Pernyataan yang tepat secara teknis adalah **swap tidak bertambah selama run berlangsung (growth $\le 0$)**, bukan beroperasi murni tanpa swap.
- **Dinamika Swap macOS**: Swap memori pada macOS dialokasikan secara dinamis oleh kernel (`dynamic_pager`) dan tidak memiliki batas atas statis (tercatat `swap_final` mencapai hingga 8,654.4 MB pada run Sync $N=100, VU=50$).

### Rentang Swap Growth Terverifikasi (Verifikasi dari Data Audit CSV)
Berdasarkan data mentah di [`experiments/results/swap_growth_audit_20261018.csv`](file:///Users/adrianhalim/SereneApps/experiments/results/swap_growth_audit_20261018.csv), rentang kenaikan swap bersih selama pengujian adalah:
- **$N=25, VU=10$ & $VU=50$**: $-48.0$ hingga $0.0$ MB (swap tidak bertambah).
- **$N=25, VU=100$**: **891.0 hingga 1,983.8 MB (0.9 – 2.0 GB)**.
- **$N=25, VU=200$**: **5,378.5 hingga 6,482.8 MB (5.4 – 6.5 GB)**.
- **$N=100$ (seluruh run valid)**: **840.1 hingga 9,275.8 MB (0.8 – 9.3 GB)**.
- **$N=200$ (seluruh run valid)**: **3,424.8 hingga 5,470.4 MB (3.4 – 5.5 GB)**.

Dari 94 run valid, sebanyak **62 run (66.0%)** mengalami pertambahan swap $> 500$ MB, sementara **32 run (34.0%)** memiliki pertambahan swap $\le 500$ MB. Terdapat **korelasi positif yang kuat antara ukuran payload/konkurensi dengan besaran pertambahan swap**, namun data ini belum membuktikan hubungan kausal langsung bahwa pertambahan swap merupakan satu-satunya penyebab kenaikan latensi.

### Analisis Sensitivitas (Eksklusi Run dengan Swap Growth > 500 MB)
Ketika seluruh run yang mengalami lonjakan swap $> 500$ MB dieksklusi:
1. **$N=25, VU=10$ & $VU=50$**: Seluruh 15 run memiliki swap growth $\le 0$ MB (nol run dieksklusi). Karena himpunan data sensitivitas persis sama dengan himpunan penuh, analisis ini **tidak menguji apa pun (tests nothing)** untuk kedua sel ini, dan CIs yang dihasilkan 100% identik.
2. **$N=100, VU=10$**: Seluruh 15 run (Sync, Background, Celery) mengalami kenaikan swap $\sim 1.2$ GB ($> 500$ MB). Akibatnya, pada filter sensitivitas ini, sampel tersisa adalah $n=0$ untuk ketiga arsitektur. **Uji inferensial tidak dapat dihitung** (*not computed: n < 5*).
- **Implikasi**: Hal ini mengonfirmasi bahwa komparasi performansi pada payload $N \ge 100$ di perangkat Mac 8 GB selalu berjalan beriringan dengan ekspansi swap kernel macOS.

---

## 6. Hipotesis Kegagalan Beban Tinggi (Bukan Fakta Terukur)

Bagian ini memuat dugaan teknis atas fenomena kegagalan k6 pada beban tinggi ($N=100, VU \ge 100$ dan $N=200, VU \ge 50$):

> [!WARNING]
> ### Hypotheses (not measured)
> 1. **Dugaan Pemutusan Proses oleh OS (OOM / Jetsam / Resource Exhaustion)**:  
>    Pada percobaan $N=100, VU \ge 100$ dan $N=200, VU \ge 50$, proses `k6` kerap berhenti mendadak dengan sinyal terminasi (misal exit code -9). Diduga kuat sistem operasi macOS menghentikan proses load generator atau service worker akibat saturasi alokasi unified memory fisik (8 GB host), di mana swap memory melonjak drastis hingga melampaui batas aman. Namun, ketiadaan telemetri kernel-level direct jetsam event logging menjadikan ini **sebagai hipotesis yang belum terukur secara langsung**, bukan fakta definitif.
> 2. **Dugaan Socket Exhaustion dan Timeout**:  
>    Pada konkurensi tinggi ($VU \ge 100$), kombinasi pembengkakan antrean transfer multipart HTTP dan durasi inferensi CT-scan slice tinggi ($N=200$) diduga memicu TCP backpressure atau socket connection resets pada loopback adapter lokal.

---

## 7. Batasan Data dan Lingkungan Eksperimen (Limitations)

Laporan parsial ini tunduk pada batasan eksperimental berikut:
1. **Single Physical Host**: Seluruh komponen pengujian (Uvicorn, Redis, Celery Worker, PostgreSQL, dan load generator k6) dijalankan pada satu unit perangkat fisik lokal yang sama (Apple MacBook Pro M3, 8 GB Unified Memory).
2. **Resource Contention Antara SUT dan Load Generator**: Karena `k6` berjalan di mesin yang sama dengan System Under Test (SUT), lonjakan alokasi memori k6 dan Node.js/Python berkompetisi memperebutkan 8 GB RAM fisik yang sama.
3. **Kegagalan Preflight Gate dan Swap Drainage**: Banyaknya percobaan yang gagal pada preflight gate (tercatat swap > 500 MB atau memory < 3000 MB) menunjukkan keterbatasan pendinginan swap pada sistem operasi macOS setelah menangani beban volumetrik besar, yang memperpanjang siklus recovery.
4. **Ketidaklengkapan Sel Factorial ($n < 5$)**: 15 sel memiliki $n=0$ dan 8 sel memiliki $n \in [2, 4]$. Hasil pengujian saat ini tidak dapat digeneralisasi untuk keseluruhan domain operasional CDSS tanpa penambahan data valid.

---

## 8. Rekomendasi Langkah Kerja Berikutnya
1. **Menjaga Integritas Data**: Memastikan kode harness tidak melompati sel gagal (`gate_failed` dan `k6_failed` tetap berstatus belum selesai).
2. **Keputusan Desain Eksperimen Beban Ekstrem ($N=200, VU \ge 50$)**: Menyerahkan kepada pembimbing (Dr. Karim) dan operator apakah sel beban ekstrem yang melampaui kapasitas perangkat 8 GB perlu dimodifikasi protokol pengujiannya (misal isolasi mesin k6 terpisah via LAN) atau dilaporkan sebagai batas saturasi perangkat keras.
