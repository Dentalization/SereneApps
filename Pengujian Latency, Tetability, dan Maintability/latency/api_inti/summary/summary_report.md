# Hasil Pengujian API Inti — Repeated Measurement

Konfigurasi nominal: 10 VU, 3m per endpoint, tiga run per endpoint.
Avg/p95 memakai custom `Trend`, throughput memakai custom `Counter.rate`, dan error rate memakai custom `Rate` untuk endpoint pada setiap baris. Metrik HTTP global tidak digunakan untuk angka endpoint target karena dapat mencakup setup/warm-up.
SD adalah sample standard deviation (`ddof=1`). CV dihitung sebagai SD/mean × 100%; CV ditampilkan `N/A` ketika mean = 0. CV disajikan secara deskriptif dan tidak digunakan untuk membuat klaim konsistensi pengukuran.

Target penelitian untuk p95 adalah < 2000 ms dan hanya ditandai memenuhi bila ketiga run endpoint tersebut berada di bawah target. Target ini bukan sertifikasi atau standar eksternal.

## Ringkasan untuk BAB IV

| Endpoint | Rata-rata respons, mean ± SD (ms) | CV (%) | p95, mean ± SD (ms) | CV (%) | Throughput, mean ± SD (req/s) | Error rate (%) | Target p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login pengguna | 90.01 ± 0.39 | 0.44 | 97.98 ± 3.35 | 3.41 | 9.15 ± 0.01 | 0.00 | Memenuhi (3/3 run) |
| Daftar appointment | 19.24 ± 1.49 | 7.75 | 30.47 ± 1.43 | 4.70 | 9.80 ± 0.01 | 0.00 | Memenuhi (3/3 run) |
| Membuat appointment | 30.14 ± 1.20 | 3.98 | 50.18 ± 7.16 | 14.26 | 9.68 ± 0.01 | 0.00 | Memenuhi (3/3 run) |
| Detail konsultasi | 22.58 ± 4.04 | 17.90 | 27.72 ± 3.09 | 11.16 | 9.75 ± 0.04 | 0.00 | Memenuhi (3/3 run) |
| Pesan konsultasi | 31.00 ± 4.49 | 14.50 | 48.65 ± 6.39 | 13.13 | 9.66 ± 0.04 | 0.00 | Memenuhi (3/3 run) |
| Unggah citra gigi | 41.69 ± 5.23 | 12.54 | 73.18 ± 38.35 | 52.41 | 9.57 ± 0.04 | 0.00 | Memenuhi (3/3 run) |

## Rata-rata Response Time Endpoint Target (custom Trend, avg, ms)

| Endpoint | Run 1 | Run 2 | Run 3 | Mean (ms) | SD (ms) | CV (%) | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login pengguna | 90.37 | 90.07 | 89.59 | 90.01 | 0.39 | 0.44 | Lengkap (n=3) |
| Daftar appointment | 20.23 | 17.53 | 19.97 | 19.24 | 1.49 | 7.75 | Lengkap (n=3) |
| Membuat appointment | 31.40 | 30.02 | 29.01 | 30.14 | 1.20 | 3.98 | Lengkap (n=3) |
| Detail konsultasi | 20.05 | 20.44 | 27.24 | 22.58 | 4.04 | 17.90 | Lengkap (n=3) |
| Pesan konsultasi | 33.47 | 25.81 | 33.72 | 31.00 | 4.49 | 14.50 | Lengkap (n=3) |
| Unggah citra gigi | 38.18 | 47.70 | 39.19 | 41.69 | 5.23 | 12.54 | Lengkap (n=3) |

## p95 Response Time Endpoint Target (custom Trend, ms)

| Endpoint | Run 1 | Run 2 | Run 3 | Mean p95 (ms) | SD (ms) | CV (%) | Target < 2000 ms | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login pengguna | 101.83 | 96.38 | 95.74 | 97.98 | 3.35 | 3.41 | Memenuhi (3/3 run) | Lengkap (n=3) |
| Daftar appointment | 30.52 | 29.01 | 31.87 | 30.47 | 1.43 | 4.70 | Memenuhi (3/3 run) | Lengkap (n=3) |
| Membuat appointment | 58.01 | 43.98 | 48.54 | 50.18 | 7.16 | 14.26 | Memenuhi (3/3 run) | Lengkap (n=3) |
| Detail konsultasi | 26.13 | 25.74 | 31.28 | 27.72 | 3.09 | 11.16 | Memenuhi (3/3 run) | Lengkap (n=3) |
| Pesan konsultasi | 46.84 | 55.74 | 43.36 | 48.65 | 6.39 | 13.13 | Memenuhi (3/3 run) | Lengkap (n=3) |
| Unggah citra gigi | 48.90 | 117.40 | 53.25 | 73.18 | 38.35 | 52.41 | Memenuhi (3/3 run) | Lengkap (n=3) |

## Throughput Endpoint Target (custom Counter, req/s)

| Endpoint | Run 1 | Run 2 | Run 3 | Mean (req/s) | SD | CV (%) | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login pengguna | 9.16 | 9.13 | 9.16 | 9.15 | 0.01 | 0.16 | Lengkap (n=3) |
| Daftar appointment | 9.79 | 9.82 | 9.79 | 9.80 | 0.01 | 0.15 | Lengkap (n=3) |
| Membuat appointment | 9.67 | 9.68 | 9.69 | 9.68 | 0.01 | 0.09 | Lengkap (n=3) |
| Detail konsultasi | 9.77 | 9.78 | 9.71 | 9.75 | 0.04 | 0.41 | Lengkap (n=3) |
| Pesan konsultasi | 9.63 | 9.71 | 9.64 | 9.66 | 0.04 | 0.46 | Lengkap (n=3) |
| Unggah citra gigi | 9.61 | 9.52 | 9.57 | 9.57 | 0.04 | 0.46 | Lengkap (n=3) |

## Error Rate Endpoint Target (custom Rate, %)

| Endpoint | Run 1 | Run 2 | Run 3 | Mean (%) | SD | CV (%) | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login pengguna | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |
| Daftar appointment | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |
| Membuat appointment | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |
| Detail konsultasi | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |
| Pesan konsultasi | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |
| Unggah citra gigi | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | N/A | Lengkap (n=3) |

## Catatan kelengkapan

Statistik endpoint hanya dihitung bila tepat tiga artefak run yang valid tersedia. Nilai kosong berarti artefak hilang/tidak valid, bukan nol. Lihat `runs_table.csv` untuk status k6, timestamp, dan alasan validasi per run.
