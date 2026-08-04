# Hasil Pengujian Load Testing — Repeated Measurement

> Setiap skenario diuji sebanyak 3 kali. SD adalah sample standard deviation (ddof=1); CV = SD/mean × 100%.

> CV dilaporkan sebagai statistik deskriptif dan tidak digunakan untuk membuat klaim konsistensi pengukuran.
> Run tanpa iterasi VU (misalnya `setup()` gagal) ditandai **Tidak valid** dan tidak boleh digunakan sebagai data latency.

## Rata-rata Response Time (`http_req_duration`, avg, ms)

| Skenario | Run 1 | Run 2 | Run 3 | Mean (ms) | SD (ms) | CV (%) | Status eksekusi |
|---|---|---|---|---|---|---|---|
| 1 VU | 23.07 | 23.71 | 25.05 | 23.95 | 1.01 | 4.2% | Valid |
| 10 VU | 33.49 | 35.80 | 34.50 | 34.60 | 1.16 | 3.3% | Valid |
| 50 VU | 176.77 | 180.72 | 173.24 | 176.91 | 3.74 | 2.1% | Valid |
| 100 VU | 366.98 | 353.20 | 340.67 | 353.62 | 13.16 | 3.7% | Valid |
| 200 VU | 779.80 | 856.38 | 902.59 | 846.26 | 62.01 | 7.3% | Valid |

## p95 Response Time (`http_req_duration`, ms)

| Skenario | Run 1 | Run 2 | Run 3 | Mean p95 (ms) | SD (ms) | CV (%) | Target < 2000 ms |
|---|---|---|---|---|---|---|---|
| 1 VU | 90.06 | 90.03 | 92.06 | 90.72 | 1.17 | 1.3% | Memenuhi |
| 10 VU | 135.58 | 143.65 | 136.28 | 138.50 | 4.47 | 3.2% | Memenuhi |
| 50 VU | 723.28 | 728.36 | 703.07 | 718.24 | 13.38 | 1.9% | Memenuhi |
| 100 VU | 1500.38 | 1464.38 | 1406.60 | 1457.12 | 47.31 | 3.2% | Memenuhi |
| 200 VU | 3264.69 | 3627.14 | 3797.56 | 3563.13 | 272.14 | 7.6% | Melebihi |

## Throughput (`http_reqs.rate`, req/s)

| Skenario | Run 1 | Run 2 | Run 3 | Mean (req/s) | SD | CV (%) | Status eksekusi |
|---|---|---|---|---|---|---|---|
| 1 VU | 4.52 | 4.51 | 4.48 | 4.50 | 0.02 | 0.5% | Valid |
| 10 VU | 42.66 | 42.32 | 42.54 | 42.51 | 0.17 | 0.4% | Valid |
| 50 VU | 132.35 | 131.01 | 133.61 | 132.32 | 1.30 | 1.0% | Valid |
| 100 VU | 175.88 | 180.33 | 184.46 | 180.22 | 4.29 | 2.4% | Valid |
| 200 VU | 203.60 | 188.72 | 180.85 | 191.06 | 11.56 | 6.0% | Valid |

## Error Rate (`http_req_failed`)

| Skenario | Run 1 | Run 2 | Run 3 | Mean Rate | SD | CV (%) | Status eksekusi |
|---|---|---|---|---|---|---|
| 1 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 10 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 50 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 100 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |
| 200 VU | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | N/A | Valid |

---
Catatan: CV tidak didefinisikan ketika mean = 0; nilainya ditampilkan sebagai N/A. Hasil tidak valid harus diulang.
