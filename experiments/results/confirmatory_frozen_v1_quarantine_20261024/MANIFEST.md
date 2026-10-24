# Manifest: Confirmatory Frozen v1 Quarantine (2026-10-24)

**Dataset Type**: Quarantined Confirmatory Dataset (Frozen Harness v1 / v1.1)  
**Quarantine Date**: 24 Oktober 2026  
**Status**: **EXCLUDED FROM HARNESS-FROZEN-V2**  
**Approval**: Dr. Karim Protocol Option A (19 Oct 2026) & Amendment 01 (21 Oct 2026)  

---

## 1. Latar Belakang Karantina Dataset

Dataset ini dihasilkan selama eksekusi uji konfirmatori tahap awal (22–24 Oktober 2026) menggunakan tag `harness-frozen-v1` dan `harness-frozen-v1.1`.

Meskipun dataset ini memuat **11 run valid** pada kondisi beban ringan ($VU \le 100, N=25$ dan $VU=10, N=100$), eksekusi slot-slot selanjutnya mengalami anomali metodologis yang serupa dengan insiden 21 Oktober:
1. Pengujian dijalankan dengan flag `--skip-gate` saat host mempertahankan memori swap $>500\text{ MB}$ ($\sim 1.000\text{–}1.400\text{ MB}$).
2. Hal ini memicu penandaan `validation_only = True` secara otomatis pada seluruh run.
3. Karena run berstatus `validation_only = True` tidak dimasukkan ke dalam `master.csv`, harness mengonsumsi habis kuota 15 attempt per sel dan secara keliru menandai sel-sel berbeban ringan yang sukses (seperti `sync N25 VU10`, `celery N25 VU50`) dengan label `infeasible_phase1`.
4. Pelabelan batas kelayakan arsitektur akibat kegagalan parameter lingkungan host melanggar ketentuan metodologis Amendemen 01 protokol Dr. Karim.

---

## 2. Inventaris Arsip Karantina

- **`master.csv`**: 11 run valid ($n=1$ per sel pada 11 kondisi feasible).
- **`status.csv`**: Snapshot status 36 sel per 22 Oktober 2026 23:34 WIB.
- **`raw/`**: 254 direktori attempt k6 dan telemetri per percobaan.
- **`attempts_host_invalid_20261021/`**: 206 direktori kegagalan preflight gate host tanggal 21 Oktober 2026.
- **`execution.log`**: Log konsol eksekusi lengkap.
- **`descriptive_frozen_v1.csv` & `stats_frozen_v1.csv`**: Agregasi deskriptif dan inferensial awal.

---

## 3. Kebijakan Integritas untuk `harness-frozen-v2`

1. Seluruh file dalam folder karantina ini **TIDAK BOLEH DICAMPUR** (*zero mixing*) ke dalam dataset `harness-frozen-v2`.
2. Folder target `experiments/results/confirmatory_frozen_v2/` (atau direktori konfirmatori baru) dimulai dari keadaan bersih (*clean baseline*).
3. Status 36 sel di-reset murni menjadi `valid_count = 0`, `attempts = 0`, dan `cell_status = pending` sebelum Phase 1 dimulai kembali setelah konfirmasi bersama Dr. Karim.
