# Complete Appointment Flow

Dokumen ini merinci seluruh perjalanan pasien dari mencari jadwal dokter gigi, melakukan booking, menyelesaikan pembayaran, hingga mengelola janji yang sudah dibuat. Semua informasi bersumber dari implementasi produksi pada folder `backend/src/routes` dan layanan terkait sehingga dapat langsung dijadikan referensi untuk pengembangan front-end maupun QA.

## 1. Aktor, Tampilan Default, dan Scope Hak Akses

| Aktor | Kemampuan Utama |
| --- | --- |
| Pasien (`patient`) | Melihat ketersediaan, membuat janji, melihat daftar sendiri, menjadwalkan ulang, membatalkan. |
| Dokter gigi (`dentist`) | Melihat jadwal pribadi, mengonfirmasi janji, menerima pembaruan status. |
| Staf klinik (`clinic_*`) | Melihat jadwal per klinik/cabang, membantu konfirmasi, memantau janji aktif. |

Helper `deriveDefaultView` menentukan tampilan default berdasarkan role sehingga parameter `view` otomatis berisi `patient`, `dentist`, atau `clinic` ketika memanggil listing janji. 【F:backend/src/routes/appointments.js†L186-L210】【F:backend/src/routes/appointments.js†L1059-L1089】

Staf klinik mendapatkan konteks cabang melalui `resolveClinicStaffContext` sebelum listing sehingga hanya data klinik terkait yang muncul. 【F:backend/src/routes/appointments.js†L200-L222】【F:backend/src/routes/appointments.js†L1084-L1184】

## 2. Struktur Data & Status Appointment

Serializer `serializeAppointment` memastikan respons API konsisten: identitas pasien/dokter, cabang klinik, rentang waktu, alasan, catatan, referensi chat/video, metadata, serta histori status. Nilai tanggal selalu diubah ke ISO string. 【F:backend/src/routes/appointments.js†L167-L224】

Konfigurasi pada `appointmentConfig` mengatur cutoff reschedule 24 jam, cutoff cancel 12 jam, serta persentase biaya pembatalan. 【F:backend/src/services/appointments/config.js†L1-L15】

Status yang menggerakkan flow pasien dan notifikasi:

- `scheduled` – status awal setelah booking berhasil. 【F:backend/src/routes/appointments.js†L324-L409】
- `confirmed` – di-set ketika pembayaran sukses atau dokter/staf menyetujui janji. 【F:backend/src/routes/appointments.js†L890-L973】【F:backend/src/services/payments/status.js†L18-L69】
- `rescheduled` – status perantara saat jadwal berpindah tapi belum dikonfirmasi ulang. 【F:backend/src/routes/appointments.js†L563-L679】【F:backend/src/routes/appointments.js†L889-L948】
- `cancelled` – akhir dari proses pembatalan oleh pasien atau akibat pembayaran gagal. 【F:backend/src/routes/appointments.js†L688-L818】【F:backend/src/services/payments/status.js†L30-L74】

Selain status inti, kolom `commStatus`, `chatRoomRef`, dan `videoRoomRef` disiapkan agar tim komunikasi bisa mengaktifkan chat/video secara otomatis ketika janji terkonfirmasi. 【F:backend/src/routes/appointments.js†L167-L224】【F:backend/src/services/payments/status.js†L40-L74】

## 3. Tahapan Pra-Booking: Menemukan Slot Dokter

1. **Validasi Parameter** – Endpoint `GET /api/appointments/availability` memerlukan `dentistId` dan tanggal (YYYY-MM-DD). Format diverifikasi lewat helper `ensureIsoDate`; jika kosong, API mengembalikan error kode khusus (`dentist_id_required`, `date_required`). 【F:backend/src/routes/appointments.js†L212-L266】
2. **Jam Operasional Klinik** – `getWorkingWindow` membaca konfigurasi jam kerja per hari (JSON) dari profil dokter. Bila klinik tutup di tanggal tersebut, respons tetap valid namun daftar slot kosong. 【F:backend/src/routes/appointments.js†L228-L303】
3. **Generasi Slot dan Cek Bentrok** – Slot dibuat per kelipatan `slotMinutes` (default 30 menit). Setiap slot difilter agar tidak overlap dengan janji berstatus aktif (`scheduled`, `confirmed`). 【F:backend/src/routes/appointments.js†L234-L303】
4. **Respons** – Payload berisi `dentistId`, tanggal, zona waktu default, durasi slot, dan daftar slot ISO start/end sehingga UI dapat langsung mengisi komponen kalender. 【F:backend/src/routes/appointments.js†L296-L303】

## 4. Booking Appointment: Dari Submit Hingga Respons

1. **Hak Akses** – Hanya user berperan `patient` yang boleh memanggil `POST /api/appointments`. 【F:backend/src/routes/appointments.js†L305-L333】
2. **Validasi Field** – Server memastikan dokter dan waktu dipilih, format waktu valid, tidak booking di masa lalu, serta pasien tidak bisa mem-booking dirinya sendiri. 【F:backend/src/routes/appointments.js†L331-L357】
3. **Proteksi Double-Booking** – Menggunakan transaksi + `pg_advisory_xact_lock` per dokter untuk menahan race condition, lalu memeriksa overlap terhadap janji aktif. Jika ada, API mengembalikan `409 slot_taken`. 【F:backend/src/routes/appointments.js†L330-L372】【F:backend/src/routes/appointments.js†L411-L437】
4. **Pencatatan Riwayat** – Setelah `appointment` dibuat dengan status `scheduled`, sistem menambahkan entri histori `appointment_created` (patient sebagai pelaku). 【F:backend/src/routes/appointments.js†L372-L409】
5. **Payload Ringkasan Dokter** – Respons `201` menyertakan detail dokter (nama, gelar, spesialisasi, alamat klinik, biaya konsultasi) untuk mengisi layar konfirmasi/pembayaran tanpa panggilan tambahan. 【F:backend/src/routes/appointments.js†L379-L409】
6. **Event & Komunikasi** – Event `appointment_created` dikirim melalui `emitAppointmentEvent`, memungkinkan sistem notifikasi atau integrasi real-time bereaksi (misal push/email). 【F:backend/src/routes/appointments.js†L635-L679】

## 5. Integrasi Pembayaran & Aktivasi Komunikasi

Setelah booking, pasien membuat payment intent via endpoint `POST /api/payments`. Layanan pembayaran menyimpan relasi ke appointment dan menolak duplikasi intent aktif. 【F:backend/src/routes/payments.js†L88-L150】

Saat status pembayaran berubah:

1. **Sinkronisasi Status** – Fungsi `applyPaymentStatus` memetakan status `succeeded` → `confirmed`, `failed` → `payment_failed`, `cancelled` → `cancelled`, lalu mengubah record appointment pada transaksi yang sama. 【F:backend/src/services/payments/status.js†L18-L74】
2. **Aktivasi Chat/Video** – Ketika appointment menjadi `confirmed`, layanan komunikasi memastikan ruang chat & video tersedia, serta memperbarui `commStatus` menjadi `ready`. 【F:backend/src/services/payments/status.js†L40-L74】
3. **Ledger & Event** – Status final memicu pencatatan ke `paymentLedger` dan event `appointment_confirmed`/`appointment_payment_failed`/`appointment_cancelled` melalui `emitAppointmentEvent`. 【F:backend/src/services/payments/status.js†L75-L121】
4. **Notifikasi** – Fungsi `queueNotificationEvent` menyiapkan undangan chat agar pasien menerima instruksi komunikasi setelah pembayaran sukses. 【F:backend/src/services/payments/status.js†L52-L74】

## 6. Mengelola Appointment dari Sisi Pasien

1. **Daftar Appointment (Upcoming/Past/Cancelled)** – Endpoint `GET /api/appointments?view=patient` mendukung filter status (koma), rentang tanggal, pencarian teks, paginasi, dan opsi `includeHistory` untuk timeline mini. Respons juga memuat agregasi total dan jumlah per status guna membangun tab UI. 【F:backend/src/routes/appointments.js†L1059-L1244】
2. **Detail Appointment** – `GET /api/appointments/:id` memverifikasi hak akses (pasien pemilik, dokter terkait, atau staf klinik) lalu mengembalikan detail lengkap termasuk histori status, metadata pembatalan, dan referensi komunikasi. 【F:backend/src/routes/appointments.js†L812-L886】
3. **Reschedule** – `PATCH /api/appointments/:id/reschedule` mengecek cutoff (`rescheduleCutoffHours`), memastikan slot baru tidak bentrok, menyimpan `lastReschedule`, menambahkan histori `patient_reschedule`, serta menerbitkan event `appointment_rescheduled`. 【F:backend/src/routes/appointments.js†L527-L679】【F:backend/src/services/appointments/config.js†L1-L15】
4. **Cancel** – `PATCH /api/appointments/:id/cancel` menghitung jarak ke jadwal, menerapkan biaya pembatalan bila ada payment intent terakhir, memperbarui metadata `cancelledAt` dan `cancellationFee`, serta menambahkan histori `patient_cancelled` sebelum mengirim event `appointment_cancelled`. 【F:backend/src/routes/appointments.js†L688-L818】

## 7. Operasi Dokter & Klinik

- **Konfirmasi Manual** – Dokter atau staf memanggil `PATCH /api/appointments/:id/confirm`. Endpoint memeriksa kepemilikan (untuk dokter), memastikan status awal masih `scheduled`/`rescheduled`, lalu menyimpan status `confirmed` dan event notifikasi. 【F:backend/src/routes/appointments.js†L889-L973】
- **Daftar Dokter** – Parameter `view=dentist` membuat listing hanya menampilkan janji milik dokter tersebut. Respons sama dengan pasien namun difilter berdasarkan `dentistId`. 【F:backend/src/routes/appointments.js†L1071-L1135】
- **Daftar Klinik** – Parameter `view=clinic` menampilkan janji berdasarkan cabang yang sudah dipetakan oleh `resolveClinicStaffContext`, termasuk filter status, rentang waktu, dan pencarian teks. 【F:backend/src/routes/appointments.js†L1084-L1184】

## 8. Error Handling & Kode yang Perlu Ditangani UI

Endpoint mengembalikan struktur `error.code` konsisten, contoh: `invalid_date`, `slot_taken`, `invalid_payload`, `cancel_window_elapsed`, `cannot_cancel_status`. UI dapat memetakan kode ini ke pesan lokal. 【F:backend/src/routes/appointments.js†L236-L437】【F:backend/src/routes/appointments.js†L688-L818】

Saat payment intent gagal/sudah final, layanan mengembalikan error `PAYMENT_ALREADY_FINAL` atau `PAYMENT_INTENT_NOT_FOUND` dengan status HTTP sesuai agar UI dapat menampilkan state pembayaran. 【F:backend/src/services/payments/status.js†L76-L121】

## 9. Rangkuman Endpoint Utama

| Tujuan | Method & Endpoint | Keterangan |
| --- | --- | --- |
| Load slot dokter | `GET /api/appointments/availability` | Filter slot aktif dan jam kerja klinik. 【F:backend/src/routes/appointments.js†L212-L303】 |
| Buat janji | `POST /api/appointments` | Validasi payload, proteksi double-booking, histori awal. 【F:backend/src/routes/appointments.js†L305-L409】 |
| Daftar janji | `GET /api/appointments` | Mendukung view patient/dentist/clinic, agregasi tab. 【F:backend/src/routes/appointments.js†L1059-L1244】 |
| Detail janji | `GET /api/appointments/:id` | Hak akses lintas peran, histori lengkap. 【F:backend/src/routes/appointments.js†L812-L886】 |
| Reschedule | `PATCH /api/appointments/:id/reschedule` | Cutoff 24 jam, histori `patient_reschedule`, event real-time. 【F:backend/src/routes/appointments.js†L527-L679】 |
| Cancel | `PATCH /api/appointments/:id/cancel` | Cutoff 12 jam, biaya pembatalan, event `appointment_cancelled`. 【F:backend/src/routes/appointments.js†L688-L818】 |
| Konfirmasi dokter | `PATCH /api/appointments/:id/confirm` | Validasi kepemilikan, event `appointment_confirmed`. 【F:backend/src/routes/appointments.js†L889-L973】 |
| Payment intent | `POST /api/payments` | Cegah duplikasi, hubungkan appointment. 【F:backend/src/routes/payments.js†L88-L150】 |
| Update status bayar | `POST /api/payment-webhooks/midtrans` → `applyPaymentStatus` | Sinkronkan status appointment, aktifkan chat/video. 【F:backend/src/routes/payment-webhooks.js†L1-L102】【F:backend/src/services/payments/status.js†L18-L121】 |

## 10. Skenario End-to-End (E2E) untuk QA / Dokumentasi UI

1. **Booking Pertama kali**
   1. Pasien membuka daftar dokter dan memilih profil → panggil `GET /api/appointments/availability` untuk tanggal terpilih.
   2. Pilih slot, isi alasan/notes, kirim `POST /api/appointments` → UI menampilkan layar ringkasan dengan data dokter & status `scheduled`.
   3. Lanjut ke pembayaran (`POST /api/payments`) dan tunggu notifikasi sukses yang otomatis mengubah status menjadi `confirmed` sekaligus mengaktifkan chat/video room.

2. **Reschedule Appointment yang Sudah Dibayar**
   1. Pada tab Upcoming, panggil `GET /api/appointments?view=patient&includeHistory=true` untuk memunculkan tombol `Reschedule` jika status `confirmed`/`scheduled`.
   2. UI memuat slot baru (panggil kembali endpoint availability) lalu mengirim `PATCH /api/appointments/:id/reschedule` beserta alasan perubahan.
   3. Respons memuat status `rescheduled`; event `appointment_rescheduled` memberi tahu dokter/staf untuk menyetujui atau melakukan follow-up.

3. **Cancel dengan Pembayaran Aktif**
   1. Dari halaman detail (`GET /api/appointments/:id`), pasien memilih `Cancel`.
   2. Endpoint `PATCH /api/appointments/:id/cancel` memverifikasi cutoff 12 jam dan menghitung biaya pembatalan berdasarkan payment intent terakhir.
   3. UI menampilkan ringkasan biaya (jika ada) dan status `cancelled`. Event `appointment_cancelled` dapat digunakan untuk memicu refund otomatis.

4. **Konfirmasi Manual oleh Dokter**
   1. Dokter membuka `GET /api/appointments?view=dentist&status=scheduled`.
   2. Setelah memeriksa detail pasien (`GET /api/appointments/:id`), dokter memanggil `PATCH /api/appointments/:id/confirm`.
   3. Status berubah menjadi `confirmed` dan, jika chat/video belum aktif, dokter dapat memulai konsultasi melalui channel yang sama.

Skenario di atas mengikat seluruh endpoint utama dan memastikan UI menampilkan 3 tab daftar (Upcoming/Past/Cancelled), detail timeline, serta tindakan lanjutan (reschedule/cancel/confirm) dengan memanfaatkan kode error terstruktur.
