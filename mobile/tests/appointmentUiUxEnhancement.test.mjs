import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.resolve(root, file), 'utf8');

test('clinic discovery supports skeletons, favorites, filter memory, and recent clinics', () => {
  const search = read('src/features/appointment/screens/ClinicSearchScreen.jsx');
  const detail = read('src/features/appointment/screens/ClinicDetailScreen.jsx');

  assert.match(search, /ClinicCardSkeleton/);
  assert.match(search, /clinicSearchFilter/);
  assert.match(search, /favoriteClinicIds/);
  assert.match(search, /recentlyViewedClinics/);
  assert.match(search, /Tersimpan/);
  assert.match(search, /Tidak ada hasil untuk filter ini/);
  assert.match(detail, /Jam Operasional/);
  assert.match(detail, /toggleFavorite/);
  assert.match(detail, /recentlyViewedClinics/);
});

test('booking flow includes availability heatmap, duration selection, selected bar, and optional health form nudge', () => {
  const slots = read('src/features/appointment/screens/BookingSlotScreen.jsx');
  const confirm = read('src/features/appointment/screens/BookingConfirmScreen.jsx');

  assert.match(slots, /slotCounts/);
  assert.match(slots, /Durasi konsultasi/);
  assert.match(slots, /Pilihan Anda/);
  assert.match(slots, /nearestAvailableDate/);
  assert.match(slots, /durationMinutes/);
  assert.match(confirm, /Formulir Kesehatan Pra-Sesi/);
  assert.match(confirm, /savePreSessionHealthForm/);
  assert.match(confirm, /booking_confirm_optional_nudge/);
  assert.match(confirm, /Konsultasi Video Online/);
});

test('appointment and teledentistry UX hardening surfaces are present', () => {
  const list = read('src/features/appointment/screens/AppointmentListScreen.jsx');
  const detail = read('src/features/appointment/screens/DetailAppointmentScreen.jsx');
  const payment = read('src/features/appointment/screens/PaymentScreen.jsx');
  const success = read('src/features/appointment/screens/BookingSuccessScreen.jsx');
  const tele = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');
  const review = read('src/features/appointment/screens/ReviewScreen.jsx');

  assert.match(list, /Diperbarui/);
  assert.match(list, /Mulai perjalanan perawatan gigi Anda/);
  assert.match(list, /attentionCount/);
  assert.match(detail, /Sesi dimulai dalam/);
  assert.match(detail, /Status Janji Temu/);
  assert.match(payment, /Waktu pembayaran habis/);
  assert.match(success, /confetti/);
  assert.match(tele, /Diagnostik Koneksi/);
  assert.match(tele, /Kualitas jaringan sangat rendah/);
  assert.match(review, /Komunikasi Dokter/);
  assert.match(review, /Tambah foto \(opsional\)/);
});
