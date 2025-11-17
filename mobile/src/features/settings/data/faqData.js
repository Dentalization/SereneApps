export const faqCategories = [
  {
    id: 'getting-started',
    title: 'Panduan Penggunaan Serene',
    icon: 'bookmark-check',
    description: 'Langkah awal memakai aplikasi, aktivasi akun, dan navigasi utama.',
    articles: 8,
    faqs: [
      {
        question: 'Bagaimana cara aktivasi akun baru?',
        answer:
          'Buka tab Pengaturan > pilih Daftar. Isi data dasar, verifikasi OTP, lalu lengkapi profil pasien untuk mengaktifkan fitur penuh.',
      },
      {
        question: 'Di mana menemukan riwayat janji dan AI?',
        answer:
          'Masuk ke tab Dashboard, pilih kartu Riwayat Janji atau AI Diagnosis untuk melihat detail kunjungan dan hasil analisa.',
      },
      {
        question: 'Bisakah saya gunakan di banyak perangkat?',
        answer:
          'Ya. Masuk dengan akun Serene Anda di perangkat lain. Sinkronisasi otomatis melalui cloud patient vault kami.',
      },
    ],
  },
  {
    id: 'insurance',
    title: 'Sambungkan Asuransi',
    icon: 'shield-home',
    description: 'Kelola benefit BPJS atau asuransi swasta langsung dari aplikasi.',
    articles: 6,
    faqs: [
      {
        question: 'Bagaimana menambah kartu asuransi?',
        answer:
          'Masuk ke Profil > Asuransi & Alamat > pilih Tambah Asuransi. Isi nomor polis, provider, dan unggah kartu untuk verifikasi.',
      },
      {
        question: 'Berapa lama proses verifikasi?',
        answer:
          'Tim care memverifikasi dalam 1x24 jam. Status bisa dipantau di halaman Asuransi. Anda akan menerima notifikasi saat disetujui.',
      },
      {
        question: 'Apakah data asuransi aman?',
        answer:
          'Semua data terenkripsi AES-256 dan hanya dibagikan ke klinik mitra saat Anda mengizinkan saat booking.',
      },
    ],
  },
  {
    id: 'offline-booking',
    title: 'Buat Janji Offline',
    icon: 'calendar-edit',
    description: 'Panduan kunjungan langsung ke klinik favorit Anda.',
    articles: 5,
    faqs: [
      {
        question: 'Bagaimana memesan janji langsung di klinik?',
        answer:
          'Pilih klinik di tab Appointment > tekan “Visit Klinik”. Pilih tanggal & jam, lalu konfirmasi. Anda akan menerima QR check-in.',
      },
      {
        question: 'Bisakah saya membayar di tempat?',
        answer:
          'Ya. Pilih metode bayar “Bayar di Klinik” saat checkout. Namun untuk promo khusus, diperlukan pembayaran digital.',
      },
      {
        question: 'Bagaimana kebijakan pembatalan?',
        answer:
          'Pembatalan minimal 24 jam sebelum jadwal untuk menghindari biaya no-show. Lakukan via halaman Janji Anda.',
      },
    ],
  },
  {
    id: 'sereneai',
    title: 'SereneAI',
    icon: 'robot-happy',
    description: 'Segala hal terkait analisis foto gigi dan insight AI.',
    articles: 7,
    faqs: [
      {
        question: 'Apakah foto saya disimpan?',
        answer:
          'Foto hanya diproses selama 30 detik dan langsung dihapus. Kami menyimpan metadata hasil analisis untuk dokter.',
      },
      {
        question: 'Bisakah AI mendeteksi karies dini?',
        answer:
          'Ya, SereneAI dilatih dengan ribuan dataset klinis untuk mendeteksi karies, plak, dan inflamasi gusi secara dini.',
      },
      {
        question: 'Bagaimana jika hasil AI berbeda dengan dokter?',
        answer:
          'Gunakan hasil AI sebagai second opinion awal. Keputusan akhir tetap di tangan dokter gigi, dan kami sarankan konsultasi langsung.',
      },
    ],
  },
  {
    id: 'chat-dentist',
    title: 'Chat Dentist',
    icon: 'message-text-outline',
    description: 'Konsultasi singkat dengan dokter gigi melalui aplikasi.',
    articles: 4,
    faqs: [
      {
        question: 'Bagaimana memulai chat?',
        answer:
          'Buka tab Dashboard > kartu Chat Dentist > pilih dokter yang tersedia lalu mulai percakapan. Balasan dalam 10 menit.',
      },
      {
        question: 'Apakah chat berbayar?',
        answer:
          'Tersedia paket gratis (3 chat/bulan) untuk member. Di luar itu, biaya Rp49.000 per sesi, termasuk ringkasan konsultasi.',
      },
      {
        question: 'Bisakah berbagi foto hasil lab?',
        answer:
          'Ya, kirim foto atau PDF langsung di ruang chat. Dokter akan menilai sebelum memberikan rekomendasi.',
      },
    ],
  },
  {
    id: 'family-link',
    title: 'Family Link',
    icon: 'account-group',
    description: 'Kelola kesehatan gigi keluarga dalam satu akun.',
    articles: 3,
    faqs: [
      {
        question: 'Berapa banyak anggota keluarga?',
        answer:
          'Anda bisa menambahkan hingga 4 anggota tambahan untuk dipantau. Hubungi care@serene.id jika butuh lebih banyak slot.',
      },
      {
        question: 'Apa saja yang bisa dipantau?',
        answer:
          'Riwayat janji, rekomendasi dokter, dan hasil AI masing-masing anggota terlihat di dashboard keluarga Anda.',
      },
      {
        question: 'Bisakah saya batasi akses anak?',
        answer:
          'Ya, atur peran “viewer” saat menambahkan anggota untuk membatasi akses ke data sensitif.',
      },
    ],
  },
];

export const popularFaqs = [
  {
    question: 'Bagaimana cara menjadwalkan ulang janji?',
    answer:
      'Buka tab Appointment > pilih jadwal > tekan "Reschedule" minimal 6 jam sebelum waktu janji.',
  },
  {
    question: 'Apakah AI diagnosis menyimpan foto saya?',
    answer:
      'Tidak, kami hanya menyimpan metadata hasil analisis dan menghapus foto dalam 30 detik. Anda dapat menyimpan foto lokal sendiri.',
  },
  {
    question: 'Bagaimana menghubungkan akun keluarga?',
    answer:
      'Hubungi care@serene.id untuk aktivasi Family Link agar Anda bisa memantau 3 anggota keluarga sekaligus.',
  },
];
