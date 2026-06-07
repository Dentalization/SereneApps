# Hasil Pengujian Latency API Inti

- Base URL: http://127.0.0.1:4000
- API Prefix: /v1
- VUs: 10
- Duration: 3m
- Patient: adrianhhhalim@gmail.com
- Dentist: dentist10.clinic2@dentists.com
- Dentist Profile ID: 365
- Sample image: ./sample-dental.jpg
## Tabel 4.4 Hasil Pengujian Latency API Inti

| No | Fitur | Avg. Response Time | p95 | Throughput | Error Rate | Status Target < 2 Detik |
|---:|---|---:|---:|---:|---:|---|
| 1 | Login pengguna | 73.29 ms | 95.07 ms | 4.34 req/s | 0.00% | Memenuhi |
| 2 | Ambil daftar appointment | 5.96 ms | 8.16 ms | 4.34 req/s | 0.00% | Memenuhi |
| 3 | Buat appointment | 8.88 ms | 16.03 ms | 4.34 req/s | 0.00% | Memenuhi |
| 4 | Ambil detail konsultasi | 2.69 ms | 4.16 ms | 4.34 req/s | 0.00% | Memenuhi |
| 5 | Kirim pesan konsultasi | 619.46 ms | 1150.16 ms | 4.34 req/s | 0.00% | Memenuhi |
| 6 | Unggah citra gigi | 542.62 ms | 1142.29 ms | 4.34 req/s | 0.00% | Memenuhi |
