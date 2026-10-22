# Amendemen Protokol Pengujian Konfirmatori 02: Kebijakan Auto-Reboot Host & Resume State (22 Oktober 2026)

**Protokol Dasar**: Option A Frozen Harness (Persetujuan Dr. Karim, 19 Oktober 2026)  
**Amendemen Sebelumnya**: Amendemen 01 (21 Oktober 2026 - Isolasi `environment_invalid` dan Proteksi Budget 15 Percobaan)  
**Status Amendemen**: Resmi disahkan sebagai perbaikan operasional (*operational fix*)  
**Frozen Harness Tag**: `harness-frozen-v1.1`  
**Dataset Target**: `experiments/results/confirmatory_frozen_v1/`  
**Tanggal Pengesahan**: 22 Oktober 2026  

---

## 1. Latar Belakang & Rasional Metodologis

Pada eksekusi uji konfirmatori Slot 1 dan Slot 2 tanggal 22 Oktober 2026:
- **Slot 1 (Sync N=100 VU=10 rep=1)** berhasil diselesaikan secara valid (`run_20261022_185207_sync_N100_VU10_rep1`, e2e_p95=14,142 ms, Throughput=0.66 req/s).
- **Slot 2 (Background N=25 VU=200 rep=1)** mengalami lonjakan memori (*burst memory pressure*) saat menangani 200 virtual users konkuren, di mana peak swap mencapai ~6.730 MB dan RAM bebas turun di bawah 500 MB (kegagalan arsitektural sel).
- Pada percobaan ke-7, host mempertahankan swap kernel sisa sebesar 526–542 MB (melebihi ambang batas gate $\le 500$ MB). Sesuai Amendemen 01, percobaan tersebut diklasifikasikan sebagai `environment_invalid` dan tidak membakar kuota attempt sel.
- Namun, pada arsitektur memori macOS (Darwin XNU), halaman *kernel compressed swap* yang telah dialokasikan oleh OS tidak dapat dikembalikan secara instan ke 0 MB hanya melalui penghentian proses userspace (`reset_env.js`) atau perintah `purge` tanpa me-reboot mesin host.
- Akibatnya, eksekusi terhenti berulang kali dan menuntut reboot fisik manual secara terus-menerus oleh operator.

Demi menjaga kelancaran eksekusi tanpa kompromi pada validitas lingkungan uji, Amendemen 02 menetapkan prosedur **otomatisasi reboot host (*least-privilege automated reboot*) dan resume state terverifikasi** sebelum setiap percobaan dijalankan.

---

## 2. Ketentuan Operasional Amendemen 02

### Aturan 1: Kebijakan Auto-Reboot Sebelum Setiap Percobaan (`reboot_before_attempt`)
- Setiap percobaan (baik percobaan awal maupun percobaan ulang pasca kegagalan sel) dimulai dari kondisi fisik host yang benar-benar bersih (*clean host baseline*).
- Sebelum suatu percobaan dieksekusi, harness memeriksa apakah reboot host telah dilakukan untuk slot dan attempt tersebut.
- Parameter konfigurasi `reboot_policy.reboot_before_attempt` diatur secara default bernilai `true` dalam `experiments/config/experiment.json`.
- Nilai status `reboot_before_attempt` dicatat secara eksplisit pada setiap file `metadata.json`.

### Aturan 2: Penulisan State Resume & Validasi Hash Jadwal
- Sebelum memicu reboot, harness menuliskan status eksekusi aktif ke file:  
  `experiments/results/confirmatory_frozen_v1/resume_state.json`  
  yang mencakup:
  1. `slot_index`: Indeks slot jadwal pengujian (1-indexed).
  2. `attempt_count`: Jumlah attempt yang telah digunakan sel.
  3. `schedule_file_hash`: SHA-256 dari `experiments/config/schedule_phase1_v1.csv`.
  4. `phase`: Fase aktif (`phase1` atau `phase2`).
  5. `reboot_performed`: Boolean penanda bahwa reboot telah dieksekusi untuk attempt ini.
  6. `reboot_reason`: Alasan pemicu reboot (`pre_attempt` atau `environment_invalid`).
- Saat harness kembali menyala, harness memverifikasi bahwa hash jadwal tidak berubah dan membaca slot berikutnya berdasarkan data riil `master.csv`.

### Aturan 3: Metode Reboot Hak Akses Terkecil (*Least-Privilege Sudoers*)
- Restart otomatis host macOS dilakukan menggunakan aturan hak akses terkecil (*least-privilege principle*) pada file drop-in:  
  `/etc/sudoers.d/harness_reboot` (permission `0440`):
  ```text
  adrianhalim ALL=(ALL) NOPASSWD: /sbin/shutdown -r *
  ```
- Perintah ini **HANYA** mengizinkan `/sbin/shutdown -r` tanpa password dan **TIDAK** membuka hak akses sudo yang lebih luas atau perintah berbahaya lainnya.

### Aturan 4: Otomatisasi Resume Melalui LaunchAgent macOS
- Sebelum memicu reboot, harness mendaftarkan LaunchAgent sesi pengguna di:  
  `~/Library/LaunchAgents/com.sereneapps.harness.plist`
- LaunchAgent ini secara otomatis memanggil kembali harness segera setelah pengguna login kembali ke macOS:  
  `caffeinate -dims backend/python_service/venv/bin/python -u experiments/run_experiment.py --confirmatory --resume`  
  dengan log diarahkan secara kontinu ke `experiments/results/confirmatory_frozen_v1/execution.log`.
- Segera setelah harness berjalan pasca-login atau saat pengujian selesai, LaunchAgent di-unregister/dihapus agar tidak berjalan di luar konteks eksperimen.

### Aturan 5: Pembatasan Kegagalan Bounded (Maksimal 1 Reboot, Tanpa Infinite Loop)
- Pasca reboot dan resume, harness menguji ulang kondisi *preflight hardware gate*.
- Jika *preflight gate* **tetap gagal** setelah 1 kali reboot (misalnya pengisi daya MagSafe/AC terlepas atau ruang disk menipis), harness:
  1. Mencatat status `environment_invalid`.
  2. Menghapus LaunchAgent.
  3. Menghentikan eksekusi (*HALT*) dengan **exit code 2**.
  4. Menampilkan instruksi intervensi operator yang jelas.
- Harness **DILARANG KERAS** melakukan reboot berulang kali tanpa henti (*infinite reboot loop*).

### Aturan 6: Transparansi Pelaporan Reset pada Metadata
- Menghapus teks ambigu `"sudo purge skipped"` dari `reset_actions`.
- Menambahkan field boolean eksplisit pada setiap `metadata.json`:
  ```json
  "purge_effective": false,
  "swap_drained_by_reset": false,
  "reboot_before_attempt": true
  ```
  sehingga tidak menimbulkan kesan keliru bahwa pembersihan swap terjadi melalui userspace purge.

### Aturan 7: Master CSV sebagai Sumber Kebenaran Tunggal (*Single Source of Truth*)
- Jalur resume (`--resume`) membaca `master.csv` untuk menentukan slot yang telah selesai (`status == "success"` dan `validation_only == False`).
- Setiap slot yang sudah tercatat valid dalam `master.csv` dilewati (*skipped*) secara deterministik, tanpa bergantung pada counter sementara.

---

## 3. Batasan Protokol yang Tidak Berubah

Sesuai arahan pengesahan:
1. **Ambang Batas Gate Tetap**: Max swap used $\le 500.0$ MB, Min free RAM $\ge 3.000.0$ MB, AC Power wajib tersambung, Disk free $\ge 5.0$ GB.
2. **Anggaran 15 Attempt per Sel Tetap**: Maksimal 15 attempt untuk mencapai 5 run valid per sel (atau probe feasibilitas pada Phase 2).
3. **Logika Validasi Beban Tetap**: Deteksi k6 error, failure rate, swap burst limit (8.192 MB), dan RAM minimum (500 MB) tetap berlaku penuh.
4. **Data Mentah Utuh**: Tidak ada data mentah yang dihapus atau dimodifikasi.

---

## 4. Provenance & Frozen Integrity Tag

- **Versi Tag Baru**: `harness-frozen-v1.1`
- **Tautan Git Commit**: `ab6ede2a5dc1a63b23d1795be3322cbd06b29c70`
- **File Manifest Frozen**: `experiments/config/harness_frozen_v1.json`
- **Harness Script SHA256**: `399b312caa916907dc22b646d8065202046b085a1d36b7fd41180b6c8360a7d9`
- **Config SHA256**: `a34a747cde03d46f8cfc7ce2e94c38296e3456a8aeca39a0ace67d198d1ccde5`
