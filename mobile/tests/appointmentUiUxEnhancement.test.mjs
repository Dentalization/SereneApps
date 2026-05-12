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
  assert.match(review, /photoMetadataOnly/);
});

test('pr104 hardening covers repeated network events, chat failures, payment retry, and slot unknown states', () => {
  const videoHook = read('src/hooks/useTwilioVideoClient.js');
  const chatHook = read('src/hooks/useChat.js');
  const tele = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');
  const payment = read('src/features/appointment/screens/PaymentScreen.jsx');
  const slots = read('src/features/appointment/screens/BookingSlotScreen.jsx');

  assert.match(videoHook, /networkQualityEvent/);
  assert.match(videoHook, /sequence: prev\.sequence \+ 1/);
  assert.match(tele, /networkQualityEvent\?\.sequence/);
  assert.match(tele, /setLowQualityCard/);
  assert.match(tele, /PreCallSystemCheckSheet/);
  assert.match(tele, /preCallSystemCheck/);
  assert.match(chatHook, /throw error/);
  assert.match(chatHook, /return saved/);
  assert.match(tele, /setPendingTextRetry/);
  assert.match(payment, /canRetryPayment/);
  assert.match(payment, /\['expired', 'failed', 'deny', 'cancel', 'error'\]/);
  assert.match(slots, /return \[date, null\]/);
  assert.match(slots, /isUnknown/);
  assert.match(slots, /Ketersediaan belum dapat dipastikan/);
});

test('review photos are feature-flagged metadata-only and mobile i18n foundation exists', () => {
  const features = read('src/config/features.js');
  const review = read('src/features/appointment/screens/ReviewScreen.jsx');
  const i18n = read('src/i18n/index.js');
  const hook = read('src/hooks/useI18n.js');

  assert.match(features, /reviewPhotoUpload: false/);
  assert.match(review, /FEATURES\.reviewPhotoUpload/);
  assert.doesNotMatch(review, /uri: photo\.uri/);
  assert.match(i18n, /fallbackText/);
  assert.match(hook, /useSelector/);
  assert.match(hook, /state\.settings\?\.language/);
});

test('final teledentistry polish prevents i18n and call retry regressions', () => {
  const i18nHook = read('src/hooks/useI18n.js');
  const i18nRuntime = read('src/i18n/index.js');
  const tele = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');

  assert.match(i18nHook, /state\.settings\?\.language/);
  assert.match(i18nHook, /normalizedLanguage/);

  assert.doesNotMatch(i18nRuntime, /fallbackText \?\? key/);
  assert.match(i18nRuntime, /fallbackText \?\? ''/);

  const completeAcceptCallIndex = tele.indexOf('const completeAcceptCall');
  const connectIndex = tele.indexOf('await connect', completeAcceptCallIndex);
  const emitAcceptedIndex = tele.indexOf('emitVideoCallResponse', completeAcceptCallIndex);
  assert.ok(connectIndex > completeAcceptCallIndex);
  assert.ok(emitAcceptedIndex > connectIndex);

  assert.match(tele, /const handleRetryText/);
  assert.match(tele, /pendingTextRetry\.text/);
  assert.match(tele, /onPress=\{handleRetryText\}/);
});
