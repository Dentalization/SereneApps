const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

describe('mobile appointment and teledentistry source regressions', () => {
  test('keeps pre-session health form optional', () => {
    const source = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');
    const hook = read('src/hooks/useChat.js');

    expect(source).toMatch(/getPreSessionHealthForm/);
    expect(source).toMatch(/savePreSessionHealthForm/);
    expect(source).not.toMatch(/preSessionReady/);
    expect(source).toMatch(/selectConversation\(appointmentId\.toString\(\)\)/);
    expect(source).toMatch(/Form kesehatan opsional/);
    expect(source).toMatch(/Boleh dilewati/);
    expect(source).toMatch(/Lewati dulu/);
    expect(source).toMatch(/renderPreSessionHealthForm/);
    expect(source).not.toMatch(/Isi form kesehatan pra-sesi sebelum bergabung ke video call/);
    expect(hook).toMatch(/sendAttachmentMessage[\s\S]*setReconnectError[\s\S]*throw error/);
  });

  test('publishes and renders Twilio typing indicators', () => {
    const hook = read('src/hooks/useChat.js');
    const screen = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');

    expect(hook).toMatch(/typingStarted/);
    expect(hook).toMatch(/typingEnded/);
    expect(hook).toMatch(/conversation\.typing\(\)/);
    expect(hook).toMatch(/typingParticipants/);
    expect(screen).toMatch(/Dokter sedang mengetik/);
    expect(screen).toMatch(/sendTypingIndicator/);
  });

  test('supports push registration, swipe actions, and smart rebooking', () => {
    const source = read('src/features/appointment/screens/AppointmentListScreen.jsx');
    const pushService = read('src/services/pushNotificationService.js');

    expect(source).toMatch(/registerAppointmentReminderPushToken/);
    expect(source).toMatch(/Swipeable/);
    expect(source).toMatch(/Pesan Lagi/);
    expect(source).toMatch(/rebookingFromAppointmentId/);
    expect(pushService).toMatch(/provider:\s*'expo'/);
    expect(pushService).toMatch(/PatientTeledentistry/);
  });

  test('keeps clinic discovery and booking UX hardening present', () => {
    const search = read('src/features/appointment/screens/ClinicSearchScreen.jsx');
    const detail = read('src/features/appointment/screens/ClinicDetailScreen.jsx');
    const slots = read('src/features/appointment/screens/BookingSlotScreen.jsx');
    const confirm = read('src/features/appointment/screens/BookingConfirmScreen.jsx');

    expect(search).toMatch(/ClinicCardSkeleton/);
    expect(search).toMatch(/clinicSearchFilter/);
    expect(search).toMatch(/favoriteClinicIds/);
    expect(search).toMatch(/recentlyViewedClinics/);
    expect(search).toMatch(/Tidak ada hasil untuk filter ini/);
    expect(detail).toMatch(/Jam Operasional/);
    expect(detail).toMatch(/toggleFavorite/);
    expect(slots).toMatch(/slotCounts/);
    expect(slots).toMatch(/Durasi konsultasi/);
    expect(slots).toMatch(/Pilihan Anda/);
    expect(slots).toMatch(/nearestAvailableDate/);
    expect(confirm).toMatch(/Formulir Kesehatan Pra-Sesi/);
    expect(confirm).toMatch(/savePreSessionHealthForm/);
    expect(confirm).toMatch(/booking_confirm_optional_nudge/);
  });

  test('keeps final teledentistry retry and i18n safeguards present', () => {
    const features = read('src/config/features.js');
    const review = read('src/features/appointment/screens/ReviewScreen.jsx');
    const i18nRuntime = read('src/i18n/index.js');
    const i18nHook = read('src/hooks/useI18n.js');
    const tele = read('src/features/appointment/screens/PatientTeledentistryScreen.jsx');

    expect(features).toMatch(/reviewPhotoUpload: false/);
    expect(review).toMatch(/FEATURES\.reviewPhotoUpload/);
    expect(review).not.toMatch(/uri: photo\.uri/);
    expect(i18nRuntime).toMatch(/fallbackText/);
    expect(i18nRuntime).not.toMatch(/fallbackText \?\? key/);
    expect(i18nRuntime).toMatch(/fallbackText \?\? ''/);
    expect(i18nHook).toMatch(/state\.settings\?\.language/);
    expect(i18nHook).toMatch(/normalizedLanguage/);
    expect(tele).toMatch(/const handleRetryText/);
    expect(tele).toMatch(/pendingTextRetry\.text/);
    expect(tele).toMatch(/onPress=\{handleRetryText\}/);
  });
});
