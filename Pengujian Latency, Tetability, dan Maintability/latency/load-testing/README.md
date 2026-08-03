# SereneApps k6 repeated measurement

Folder ini menjalankan pengukuran latency yang sama sebanyak tiga kali untuk
setiap beban 1, 10, 50, 100, dan 200 VU. Lima file pada `scripts/` hanyalah
wrapper konfigurasi VU: semua HTTP call dan threshold tetap berasal dari
`Pengujian Latency, Tetability, dan Maintability/latency/beban_pengguna/scripts/load-by-vu.k6.js`.

## Menjalankan pengujian

Pastikan backend berada pada state awal yang konsisten dan k6 tersedia. Variabel
yang digunakan oleh skrip lama, seperti `BASE_URL`, `API_PREFIX`, dan `DURATION`,
tetap dapat diekspor sebelum menjalankan runner.

```bash
cd load-testing
./run_all.sh
```

Runner memverifikasi `BASE_URL/health` sebelum memulai. Secara default targetnya
adalah `http://127.0.0.1:4000/health`; backend harus lebih dahulu dijalankan,
misalnya `cd ../backend && npm start`. Untuk target lain, set `BASE_URL`; untuk
health endpoint khusus, set `HEALTH_URL`.

Runner membuat:

- `results/run_N/test_<vu>vu_runN.json`: ringkasan agregat dari k6, digunakan oleh analyzer;
- `results/run_N/test_<vu>vu_runN.csv`: event CSV dari k6 untuk audit;
- `results/run_log.txt`: timestamp dan output pelaksanaan;
- `summary/summary_table.csv` serta `summary/summary_report.md` setelah semua run sukses.

Default adalah tiga run dengan jeda 600 detik antar-run. Untuk memverifikasi
mekanisme tanpa menunggu, gunakan nilai override yang hanya sesuai untuk dry run:

```bash
TOTAL_RUNS=1 COOLDOWN_SECONDS=0 DURATION=15s ./run_all.sh
```

## Menganalisis ulang hasil

Runner memanggil analyzer otomatis setelah seluruh run berhasil. Ia juga dapat
dijalankan kembali tanpa mengulang pengujian:

```bash
python3 analyze.py
```

Analyzer menghitung mean, sample standard deviation (`ddof=1`), dan CV% dari
tiga run. CV disajikan sebagai statistik deskriptif tanpa klaim konsistensi.
Throughput diambil dari `http_reqs.rate`, bukan jumlah iterasi.
Laporan final tidak sukses jika ada file atau metrik yang hilang; gunakan
`--allow-incomplete` hanya untuk diagnosis.

Checkout ini belum memuat 15 raw JSON 1–200 VU yang diperlukan untuk
menghasilkan throughput historis. Karena itu, `summary/summary_report.md`
menandai throughput arsip sebagai belum tersedia; jangan menghitungnya dari
`iterations_count`. Pulihkan raw JSON tersebut lalu jalankan analyzer untuk
menghasilkan tabel throughput yang dapat digunakan di skripsi.

Run tanpa satu pun iterasi VU—contohnya karena backend mati atau `setup()` gagal
login—ditandai **Tidak valid**. Nilai 0 ms dari kondisi tersebut tidak pernah
boleh dicantumkan sebagai hasil latency.

Jika threshold k6 gagal pada suatu skenario, runner tetap menyelesaikan seluruh
pengukuran dan membuat laporan agar data kegagalan tersebut dapat dianalisis.
Setelah itu runner mengembalikan exit status non-zero sebagai penanda threshold
tidak terpenuhi.
