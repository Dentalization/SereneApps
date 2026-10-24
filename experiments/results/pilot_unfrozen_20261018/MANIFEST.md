# Manifest: Pilot Unfrozen Dataset (2026-10-18)

**Dataset Type**: Descriptive Pilot Dataset Only  
**Exclusion Policy**: **EXCLUDED FROM CONFIRMATORY ANALYSIS**  
**Approval**: Dr. Karim Protocol (19 Oct 2026)  
**Total Run Directories**: 94 validated runs  
**Total Disk Footprint**: 210.03 MB  

---

## 1. Tujuan dan Ruang Lingkup Dataset Pilot
Folder ini mengarsipkan seluruh 94 direktori run tervalidasi yang dihasilkan selama fase pilot awal (13–18 Oktober 2026). Sesuai arahan pembimbing (Dr. Karim), dataset ini:
1. Digunakan semata-mata untuk analisis eksploratif dan deskriptif awal.
2. Dikeluarkan secara mutlak dari analisis konfirmatori (*confirmatory hypothesis testing*).
3. Tidak boleh dicampur (*zero mixing*) dengan dataset konfirmatori berharness beku (`confirmatory_frozen_v1`).

---

## 2. Alasan Metodologis Pemisahan
Audit teknis pada 18 Oktober 2026 membuktikan adanya evolusi script harness selama eksekusi 94 run tersebut (tercatat 4 variasi `script_sha256` akibat perbaikan telemetri, bug skip completion, dan recovery timeout). Oleh karena itu, syarat *identical code execution* antar-arsitektur tidak terpenuhi secara seragam pada dataset ini. 

Pengujian konfirmatori formal hanya dijalankan pada dataset baru yang dieksekusi di bawah harness beku (`harness-frozen-v1`).
