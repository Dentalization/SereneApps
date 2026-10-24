# Amendemen Protokol Pengujian Konfirmatori (21 Oktober 2026)

**Protokol Dasar**: Option A Frozen Harness (Persetujuan Dr. Karim, 19 Oktober 2026)  
**Status Amendemen**: Resmi disahkan sebelum pengumpulan run valid pertama  
**Dataset Target**: `experiments/results/confirmatory_frozen_v1/`  
**Tanggal Pengesahan**: 21 Oktober 2026  

---

## 1. Latar Belakang & Rasional Metodologis

Pada uji coba awal eksekusi konfirmatori tanggal 21 Oktober 2026 pukul 21:43–23:33 WIB, tercatat 206 percobaan mengalami kegagalan berturut-turut pada tahap *preflight hardware gate*. 

Audit forensik menunjukkan bahwa 100% kegagalan tersebut disebabkan secara murni oleh **kondisi lingkungan host pengujian**, yaitu:
1. Daya listrik eksternal terputus (laptop beroperasi dengan daya baterai / *AC wall power disconnected*).
2. Memori swap host terisi ~5.000 MB (ambang batas gate: $\le 500$ MB).
3. RAM fisik tersedia berkisar 1.280–2.030 MB (ambang batas gate: $\ge 3.000$ MB).

Tidak ada satu pun proses uji beban (k6) yang sempat dieksekusi. Namun, aturan teknis awal yang menganggap *"gate_failed mengonsumsi kuota 15 attempt per sel"* telah menyebabkan 13 sel tereliminasi dan diberi label keliru `infeasible_phase1`. Pemberian label tersebut secara ilmiah cacat (*invalid*) karena kegagalan operasional host dijadikan dasar klaim batas ketidaklayakan arsitektur.

Oleh karena itu, demi menjaga integritas data dan validitas kesimpulan sains, amendemen protokol ini diberlakukan secara mengikat sebelum run valid pertama dimulai.

---

## 2. Ketentuan Amendemen Resmi

### Aturan 1: Klasifikasi `environment_invalid`
- Setiap percobaan yang gagal lolos *preflight gate* akibat parameter lingkungan fisik host (daya AC terputus, swap host gagal turun, atau RAM fisik kurang dari 3.000 MB) diklasifikasikan sebagai **`environment_invalid`** (bukan kegagalan eksperimen sel).
- Seluruh direktori kegagalan host awal (206 direktori) dipindahkan dan diarsipkan ke:  
  `experiments/results/confirmatory_frozen_v1/attempts_host_invalid_20261021/`  
  Direktori ini **tidak dihapus** untuk transparansi audit, namun **dikeluarkan secara mutlak** dari perhitungan anggaran maupun analisis konfirmatori.

### Aturan 2: Rekalibrasi Anggaran 15 Percobaan per Sel
- Anggaran 15 percobaan per sel (*attempt budget*) **HANYA** menghitung percobaan yang:
  1. Telah memenuhi kriteria gate lingkungan fisik secara sah (*host hardware gate passed*).
  2. Berhasil memulai pembangkitan beban k6.
  3. Gagal akibat faktor arsitektur backend atau kelebihan beban (misal: exit code k6 $\neq 0$, koneksi drop, request timeout, uvicorn/celery worker crash, atau kegagalan konversi).
- Percobaan `environment_invalid` **TIDAK DIHITUNG** ke dalam anggaran 15 percobaan dan **TIDAK BOLEH** digunakan untuk menandai sel sebagai `infeasible_phase1` maupun `infeasible_phase2`.

### Aturan 3: Mekanisme Terminasi Bounded & Intervensi Operator
- Jika host gagal memenuhi kriteria gate setelah satu siklus tunggu pemulihan (*bounded recovery timeout*), harness **WAJIB BERHENTI (HALT)** dan meminta intervensi operator fisik.
- Harness **DILARANG KERAS** melakukan perulangan (*infinite polling/looping*) yang membakar kuota percobaan saat host berada dalam kondisi fisik tidak memenuhi syarat.

### Aturan 4: Pencatatan dalam Laporan Ilmiah / Naskah
- Perubahan prosedur ini dicatat secara eksplisit dalam bab metodologi laporan / naskah publikasi sebagai:
  > *"Penyempurnaan prosedur kontrol lingkungan host (host environment validity control) yang memisahkan anomali daya/swap host dari batas kelayakan arsitektur perangkat lunak, ditetapkan sebelum pengumpulan data konfirmatori valid pertama dimulai."*

---

## 3. Status Dataset Konfirmatori Pasca-Amendemen
- `experiments/results/confirmatory_frozen_v1/master.csv`: 0 baris data valid (murni dimulai dari awal).
- `experiments/results/confirmatory_frozen_v1/status.csv`: Seluruh 36 sel di-reset menjadi `valid_count = 0`, `attempts = 0`, `status = pending`.
- Pelaksanaan pengujian ulang hanya dilakukan setelah host di-reboot dengan daya AC tersambung, swap $< 500$ MB, dan RAM bebas $> 3.000$ MB.
