export const id = {
  common: {
    actions: {
      retry: 'Coba Lagi',
      close: 'Tutup',
      continue: 'Lanjut',
      open: 'Buka',
    },
  },
  mobile: {
    booking: {
      availabilityUnknown: 'Ketersediaan belum dapat dipastikan. Ketuk untuk mencoba memuat jadwal.',
    },
    payment: {
      title: 'Pembayaran',
      preparing: 'Menyiapkan gerbang pembayaran...',
      openPayment: 'Buka Halaman Pembayaran',
      retryPayment: 'Coba buat transaksi baru',
      expiredTitle: 'Pembayaran Kedaluwarsa',
      pendingTitle: 'Menunggu Pembayaran',
    },
    teledentistry: {
      network: {
        diagnostics: 'Diagnostik Koneksi',
        lowQualityTitle: 'Koneksi tidak stabil',
        autoAudioOnly: 'Kualitas jaringan sangat rendah. Video dimatikan untuk menjaga audio.',
        autoAudioOnlyDescription: 'Video dimatikan sementara agar suara tetap stabil.',
        retryVideo: 'Coba hidupkan video lagi',
      },
      preCall: {
        title: 'Pemeriksaan Sebelum Panggilan',
        camera: 'Kamera',
        microphone: 'Mikrofon',
        connection: 'Koneksi',
        battery: 'Baterai',
        unavailable: 'Tidak tersedia',
        ready: 'Siap bergabung',
        joinAudioOnly: 'Bergabung audio saja',
      },
      chat: {
        sendFailed: 'Pesan gagal dikirim. Teks tetap disimpan agar dapat dicoba lagi.',
        retrySend: 'Coba kirim ulang',
      },
    },
    review: {
      photoMetadataOnly: 'Foto ulasan belum diunggah ke server pada versi ini.',
    },
  },
};

export default id;
