# Hasil Pengujian Load Testing — Repeated Measurement

> Setiap skenario diuji sebanyak 3 kali. SD adalah sample standard deviation (ddof=1); CV = SD/mean × 100%.

> CV dilaporkan sebagai statistik deskriptif dan tidak digunakan untuk membuat klaim konsistensi pengukuran.
> Run tanpa iterasi VU (misalnya `setup()` gagal) ditandai **Tidak valid** dan tidak boleh digunakan sebagai data latency.

## Rata-rata Response Time (`http_req_duration`, avg, ms)

| Skenario | Run 1 | Run 2 | Run 3 | Mean (ms) | SD (ms) | CV (%) | Status eksekusi |
|---|---|---|---|---|---|---|---|
| 1 VU | 23.81 | 23.45 | 22.90 | 23.39 | 0.46 | 1.9% | Valid |
| 10 VU | 35.79 | 33.79 | 34.04 | 34.54 | 1.09 | 3.1% | Valid |
| 50 VU | 179.02 | 170.21 | 171.76 | 173.67 | 4.71 | 2.7% | Valid |
| 100 VU | 360.23 | 349.62 | 349.66 | 353.17 | 6.11 | 1.7% | Valid |
| 200 VU | 861.14 | 753.29 | 702.26 | 772.23 | 81.12 | 10.5% | Valid |

## p95 Response Time (`http_req_duration`, ms)

| Skenario | Run 1 | Run 2 | Run 3 | Mean p95 (ms) | SD (ms) | CV (%) | Target < 2000 ms |
|---|---|---|---|---|---|---|---|
| 1 VU | 91.98 | 89.50 | 89.74 | 90.41 | 1.37 | 1.5% | Memenuhi |
| 10 VU | 139.29 | 134.45 | 135.74 | 136.49 | 2.51 | 1.8% | Memenuhi |
| 50 VU | 725.73 | 698.53 | 705.26 | 709.84 | 14.17 | 2.0% | Memenuhi |
| 100 VU | 1487.13 | 1454.94 | 1453.75 | 1465.28 | 18.94 | 1.3% | Memenuhi |
| 200 VU | 3601.29 | 3133.45 | 2935.31 | 3223.35 | 341.97 | 10.6% | Melebihi |

## Error Rate (`http_req_failed`)

| Skenario | Run 1 | Run 2 | Run 3 | Mean Rate | SD | CV (%) | Status eksekusi |
|---|---|---|---|---|---|---|
| 1 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 10 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 50 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 100 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 200 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |

## Throughput (`http_reqs.rate`, req/s)

Throughput tidak ditampilkan pada arsip ini karena 15 raw JSON k6 yang menjadi sumber `http_reqs.rate` tidak tersedia di checkout. Nilai tidak boleh diturunkan dari `iterations_count`. Setelah raw JSON dipulihkan, jalankan `python3 analyze.py` untuk menghasilkan tabel throughput per run, mean, dan SD dari metrik k6 yang sebenarnya.

---
Catatan: CV tidak didefinisikan ketika mean = 0; nilainya ditampilkan sebagai N/A. Hasil tidak valid harus diulang.
