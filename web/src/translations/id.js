export default {
  admin: {
    // Navigation labels
    nav: {
      dashboard: 'Dashboard',
      clinicManagement: 'Manajemen Klinik',
      clinicDirectory: 'Direktori Klinik',
      clinicVerification: 'Verifikasi Klinik',
      ownerAccounts: 'Akun Owner',
      
      dentistManagement: 'Manajemen Dokter Gigi',
      dentistDirectory: 'Direktori Dokter Gigi',
      verificationQueue: 'Antrean Verifikasi',
      professionalNetwork: 'Jaringan Profesional',
      
      revenueBilling: 'Pendapatan & Tagihan',
      revenueDashboard: 'Dashboard Pendapatan',
      paymentProcessing: 'Pemrosesan Pembayaran',
      subscriptionManagement: 'Manajemen Langganan',
      
      aiPlatform: 'Platform AI',
      aiUsageAnalytics: 'Analitik Penggunaan AI',
      modelManagement: 'Manajemen Model',
      aiBilling: 'Tagihan AI',
      
      supportHelpdesk: 'Dukungan & Helpdesk',
      ticketManagement: 'Manajemen Tiket',
      knowledgeBase: 'Basis Pengetahuan',
      communicationCenter: 'Pusat Komunikasi',
      
      analytics: 'Analitik & Laporan',
      businessIntelligence: 'Business Intelligence',
      performanceMetrics: 'Metrik Kinerja',
      financialReports: 'Laporan Keuangan',
      
      systemAdministration: 'Administrasi Sistem',
      userManagement: 'Manajemen Pengguna',
      systemConfiguration: 'Konfigurasi Sistem',
      monitoring: 'Monitoring & Peringatan',
      
      complianceSecurity: 'Kepatuhan & Keamanan',
      dataPrivacy: 'Privasi Data',
      securityCenter: 'Pusat Keamanan',
      regulatoryCompliance: 'Kepatuhan Regulasi',
      
      partnerships: 'Kemitraan',
      partnerDirectory: 'Direktori Mitra',
      apiManagement: 'Manajemen API',
      integrations: 'Integrasi',
      
      contentManagement: 'Manajemen Konten',
      marketingContent: 'Konten Pemasaran',
      educationalResources: 'Sumber Edukasi',
      resourceLibrary: 'Perpustakaan Sumber Daya'
    },
    
    // User interface
    ui: {
      search: 'Cari admin...',
      darkMode: 'Mode Gelap',
      lightMode: 'Mode Terang',
      logout: 'Keluar',
      profile: 'Profil'
    },
    
    // Sidebar interface
    sidebar: {
      searchPlaceholder: 'Cari admin...',
      profile: 'Pengaturan Profil',
      preferences: 'Preferensi',
      logout: 'Keluar'
    },
    
    // Profile settings
    profile: {
      title: 'Pengaturan Profil',
      subtitle: 'Kelola pengaturan akun admin Anda',
      name: 'Nama Lengkap',
      email: 'Alamat Email',
      phone: 'Nomor Telepon',
      bio: 'Bio',
      avatar: 'Foto Profil',
      avatarHint: 'Klik untuk upload foto profil baru',
      currentPassword: 'Password Saat Ini',
      newPassword: 'Password Baru',
      confirmPassword: 'Konfirmasi Password Baru',
      personalInfo: 'Informasi Pribadi',
      security: 'Pengaturan Keamanan',
      notifications: 'Preferensi Notifikasi',
      save: 'Simpan Perubahan',
      cancel: 'Batal',
      saving: 'Menyimpan...',
      uploadingAvatar: 'Mengupload...',
      success: 'Profil berhasil diperbarui!',
      uploadSuccess: 'Avatar berhasil diupload!',
      error: 'Gagal memperbarui profil. Silakan coba lagi.',
      uploadError: 'Gagal mengupload avatar. Silakan coba lagi.',
      fileSizeError: 'Ukuran file harus kurang dari 5MB',
      fileTypeError: 'Silakan pilih file gambar',
      passwordMismatch: 'Password tidak cocok',
      passwordTooShort: 'Password harus minimal 6 karakter',
      personalInfoDesc: 'Perbarui detail pribadi dan informasi kontak Anda',
      securityDesc: 'Ubah password Anda untuk menjaga keamanan akun',
      passwordHint: 'Biarkan field password kosong jika Anda tidak ingin mengubah password',
      namePlaceholder: 'Masukkan nama lengkap',
      emailPlaceholder: 'Masukkan email Anda',
      phonePlaceholder: 'Masukkan nomor telepon',
      bioPlaceholder: 'Ceritakan tentang diri Anda...',
      currentPasswordPlaceholder: 'Masukkan password saat ini',
      newPasswordPlaceholder: 'Masukkan password baru',
      confirmPasswordPlaceholder: 'Konfirmasi password baru',
      defaultName: 'Pengguna Admin',
      defaultEmail: 'admin@sereneai.com'
    },
    
    pages: {
      dashboard: {
        title: 'Dashboard Admin',
        subtitle: 'Ringkasan Eksekutif & Overview Platform'
      },
      clinics: {
        title: 'Manajemen Klinik',
        subtitle: 'Direktori Klinik, Verifikasi & Onboarding'
      },
      dentists: {
        title: 'Verifikasi Dokter Gigi',
        subtitle: 'Network Profesional & Verifikasi Kredensial'
      },
      revenue: {
        title: 'Pendapatan & Billing',
        subtitle: 'Pemrosesan Pembayaran & Analitik Keuangan'
      },
      aiPlatform: {
        title: 'Platform AI',
        subtitle: 'Monitoring Penggunaan AI & Manajemen Model'
      },
      support: {
        title: 'Support & Helpdesk',
        subtitle: 'Customer Support & Manajemen Success'
      },
      analytics: {
        title: 'Analitik & Laporan',
        subtitle: 'Business Intelligence & Data Insight'
      },
      system: {
        title: 'Administrasi Sistem',
        subtitle: 'Manajemen User & Konfigurasi Platform'
      },
      compliance: {
        title: 'Kepatuhan & Keamanan',
        subtitle: 'Privasi Data & Kepatuhan Regulasi'
      },
      partnerships: {
        title: 'Kemitraan & API',
        subtitle: 'Partner Integrasi & Manajemen API'
      },
      content: {
        title: 'Manajemen Konten',
        subtitle: 'Sumber Daya Marketing & Edukasi'
      },
      profile: {
        title: 'Pengaturan Profil',
        subtitle: 'Kelola pengaturan akun admin Anda'
      },
      preferences: {
        title: 'Preferensi',
        subtitle: 'Kustomisasi pengalaman admin Anda'
      }
    }
  },
  clinic: {
    sidebar: {
      dashboard: 'Dashboard',
      schedule: 'Jadwal & Antrian',
      teledentistry: 'Teledentistry',
      patients: 'Pasien & Rekam Medis',
      billing: 'Billing & Asuransi',
      inventory: 'Inventori & Sterilisasi',
      reports: 'Laporan & KPI',
      staff: 'Manajemen Staff',
      branches: 'Manajemen Cabang',
      settings: 'Pengaturan',
      descriptions: {
        dashboard: 'Ringkasan & Aksi Cepat',
        schedule: 'Manajemen Jadwal & Antrian',
        teledentistry: 'Sesi live & ringkasan',
        patients: 'Registrasi & Rekam Medis',
        billing: 'Tagihan & Klaim Asuransi',
        inventory: 'Manajemen Stok & Peralatan',
        reports: 'Analitik & Performa',
        staff: 'Manajemen Staff & Peran',
        branches: 'Operasi Multi-Cabang & Pendapatan',
        settings: 'Konfigurasi & Admin'
      }
    },
    staff: {
      badge: 'Tim Klinik',
      title: 'Manajemen Staff',
      subtitle: 'Kelola tim klinik, peran, dan hak akses mereka',
      totalStaff: 'total staff',
      loading: 'Memuat data staff...',
      actions: {
        addStaff: 'Tambah Staff',
        addDentist: 'Tambah Dokter',
        invite: 'Undang Staff',
        refresh: 'Muat Ulang',
        retry: 'Coba lagi',
        closeNotification: 'Tutup notifikasi'
      },
      summary: {
        total: 'Total Staff',
        active: 'Staff Aktif',
        efficiency: 'Tingkat Efisiensi',
        utilization: 'Tingkat Pemanfaatan',
        satisfaction: 'Skor Kepuasan',
        revenue_per_staff: 'Pendapatan per Staff',
        capacity: 'Penggunaan Kapasitas',
        productivity: 'Rata-rata Tugas/Hari',
        attendance: 'Tingkat Kehadiran',
        performance: 'Skor Performa',
        lastActivity: 'Aktif Hari Ini'
      },
      searchPlaceholder: 'Cari nama, email, posisi, atau peran...',
      filters: {
        role: {
          label: 'Peran',
          all: 'Semua Peran'
        },
        status: {
          label: 'Status',
          all: 'Semua Status',
          active: 'Aktif',
          inactive: 'Tidak Aktif',
          invited: 'Diundang'
        }
      },
      tabs: {
        list: 'Daftar Staff',
        stats: 'Statistik'
      },
      stats: {
        total: 'Total Staff',
        activeToday: 'Aktif Hari Ini',
        departments: 'Departemen',
        roleTypes: 'Jenis Role',
        newThisMonth: 'Bergabung Bulan Ini'
      },
      directory: {
        headers: {
          staff: 'Staff',
          contact: 'Kontak',
          role: 'Peran',
          branch: 'Cabang',
          status: 'Status',
          actions: 'Aksi'
        },
        empty: {
          title: 'Belum ada staff',
          description: 'Undang anggota tim pertama Anda untuk berkolaborasi di portal klinik.'
        },
        actions: {
          view: 'Lihat Profil',
          edit: 'Edit Peran',
          changeBranch: 'Ubah Cabang',
          remove: 'Hapus'
        }
      },
      statusBadge: {
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        invited: 'Diundang'
      },
      roleLabels: {
        owner: 'Pemilik',
        manager: 'Manajer',
        front_office: 'Front Office',
        nurse: 'Perawat',
        cashier: 'Kasir',
        admin: 'Admin',
        dentist: 'Dokter Gigi',
        staff: 'Staff'
      },
      roles: {
        title: 'Ringkasan Peran',
        description: 'Peran menentukan apa saja yang bisa diakses setiap anggota tim di portal klinik.',
        details: {
          owner: 'Akses penuh ke seluruh modul klinik, billing, dan pengaturan keamanan.',
          manager: 'Kelola operasional, penjadwalan, billing, dan penugasan tim.',
          front_office: 'Menangani janji temu, check-in pasien, dan komunikasi.',
          nurse: 'Mendampingi dokter, mengelola inventory, dan catatan pasien.',
          cashier: 'Memproses pembayaran, mengelola invoice, dan laporan keuangan.'
        }
      },
      errors: {
        title: 'Tidak dapat memuat data staff',
        partialTitle: 'Beberapa data mungkin belum terbaru. Muat ulang untuk mencoba kembali.',
        loadFailed: 'Gagal memuat data staff.',
        branchChangeFailed: 'Gagal mengubah penugasan cabang staff.',
        profileUpdateFailed: 'Gagal memperbarui profil staff.',
        roleUpdateFailed: 'Gagal memperbarui peran staff.',
        removeFailed: 'Gagal menghapus staff.'
      },
      notifications: {
        inviteSuccess: 'Undangan berhasil dikirim kepada {{name}}.',
        updateSuccess: 'Peran untuk {{name}} berhasil diperbarui.',
        removeSuccess: '{{name}} telah dihapus dari daftar staff klinik.',
        profileUpdateSuccess: 'Profil untuk {{name}} berhasil diperbarui.',
        profileUpdateLog: 'Profil diperbarui untuk {{name}} • {{time}}',
        roleUpdateLog: 'Peran diubah menjadi {{role}} untuk {{name}} • {{time}}',
        branchChanged: 'Staff berhasil ditugaskan ke {{branchName}}.',
        devFallback: 'Menampilkan data staff contoh. Jalankan API klinik untuk memuat data asli.'
      },
      modals: {
        common: {
          close: 'Tutup'
        },
        invite: {
          badge: 'Undang Staff',
          title: 'Kirim Undangan Staff',
          description: 'Undang anggota tim baru untuk bergabung di portal klinik. Mereka akan menerima email dengan langkah berikutnya.',
          fields: {
            name: 'Nama Lengkap',
            email: 'Alamat Email',
            password: 'Password',
            role: 'Pilih Peran',
            position: 'Posisi (opsional)',
            department: 'Departemen (opsional)',
            branch: 'Pilih Cabang'
          },
          placeholders: {
            name: 'mis. Dr. Sarah Lestari',
            email: 'nama@klinikanda.com',
            password: 'Masukkan password sementara',
            position: 'Posisi di klinik (opsional)',
            department: 'Departemen atau unit (opsional)',
            branch: 'Pilih lokasi cabang'
          },
          hints: {
            password: 'Minimal 6 karakter. Staff dapat mengubah password setelah login pertama.',
            branch: 'Staff akan ditugaskan ke cabang yang dipilih'
          },
          actions: {
            submit: 'Kirim Undangan',
            sending: 'Mengirim...',
            cancel: 'Batal'
          }
        },
        edit: {
          badge: 'Perbarui Peran',
          title: 'Atur akses staff',
          subtitle: 'Pilih peran atau status terbaru untuk {{name}}.',
          currentAssignment: 'Penugasan Saat Ini',
          fields: {
            role: 'Peran',
            status: 'Status'
          },
          helperRole: 'Pilih level akses yang sesuai dengan tanggung jawab staff ini.',
          helperStatus: 'Status menentukan apakah staff bisa masuk ke portal klinik.',
          actions: {
            submit: 'Simpan Perubahan',
            saving: 'Menyimpan...',
            cancel: 'Batal',
            close: 'Tutup'
          }
        },
        remove: {
          badge: 'Hapus Staff',
          title: 'Hapus staff ini?',
          description: 'Menghapus {{name}} ({{email}}) akan mencabut akses mereka ke semua modul klinik secara langsung.',
          warningTitle: 'Tindakan ini tidak dapat dibatalkan',
          warningBody: 'Riwayat aktivitas tetap tersimpan, namun staff tidak lagi muncul di daftar aktif.',
          actions: {
            confirm: 'Hapus Staff',
            deleting: 'Menghapus...',
            cancel: 'Batal',
            close: 'Tutup'
          }
        },
        changeBranch: {
          title: 'Ubah Penugasan Cabang',
          subtitle: 'Pindahkan staff ke cabang yang berbeda',
          currentBranch: 'Cabang Saat Ini',
          newBranch: 'Penugasan Cabang Baru',
          selectBranch: 'Pilih cabang...',
          mainBranch: 'Utama',
          unassigned: 'Belum Ditugaskan',
          noBranches: 'Tidak ada cabang tersedia',
          willMoveTo: 'Akan dipindah ke',
          cancel: 'Batal',
          update: 'Perbarui Cabang',
          updating: 'Memperbarui...'
        },
        addDentist: {
          title: 'Tambah Dokter Baru',
          subtitle: 'Daftarkan dokter baru dengan kredensial profesional'
        }
      },
      profile: {
        badge: 'Profil Staff',
        permissions: 'Hak Akses Modul',
        actions: {
          save: 'Simpan Perubahan',
          saving: 'Menyimpan...',
          cancel: 'Batal',
          close: 'Tutup'
        },
        placeholders: {
          phone: 'Nomor telepon (opsional)',
          position: 'Posisi di klinik (opsional)',
          department: 'Departemen/unit (opsional)',
          password: 'Kata sandi (minimal 6 karakter)'
        },
        fields: {
          name: 'Nama Lengkap',
          email: 'Email',
          phone: 'Telepon',
          role: 'Peran',
          status: 'Status',
          position: 'Posisi',
          department: 'Departemen',
          joinDate: 'Bergabung',
          lastLogin: 'Login Terakhir'
        },
        defaults: {
          missing: 'Belum diisi',
          unknown: 'Tidak diketahui',
          never: 'Belum pernah login'
        }
      }
    },
    branches: {
      badge: 'Manajemen Cabang',
      title: 'Manajemen Cabang',
      subtitle: 'Kelola cabang klinik, monitor performa, dan analisis pendapatan',
      totalBranches: 'total cabang',
      loading: 'Memuat cabang...',
      tabs: {
        overview: 'Ringkasan',
        directory: 'Direktori',
        revenue: 'Pendapatan'
      },
      actions: {
        addBranch: 'Tambah Cabang',
        retry: 'Coba Lagi'
      },
      errors: {
        title: 'Gagal Memuat Cabang',
        loadFailed: 'Gagal memuat data cabang',
        addFailed: 'Gagal menambah cabang',
        updateFailed: 'Gagal mengupdate cabang',
        deleteFailed: 'Gagal menghapus cabang'
      },
      notifications: {
        branchAdded: 'Cabang "{name}" berhasil ditambahkan',
        branchUpdated: 'Cabang "{name}" berhasil diupdate',
        branchDeleted: 'Cabang berhasil dihapus'
      }
    },
    schedule: {
      title: 'Jadwal Klinik',
      subtitle: 'Kelola jadwal semua dokter dan pantau aktivitas klinik',
      overview: 'Ringkasan',
      calendar: 'Kalender',
      statistics: 'Statistik',
      today: 'Hari Ini',
      week: 'Minggu',
      month: 'Bulan',
      daily: 'Harian',
      allDoctors: 'Semua Dokter',
      createAppointment: 'Buat Janji Temu',
      appointmentsToday: 'janji temu hari ini',
      totalAppointments: 'Total Janji Temu',
      confirmed: 'Dikonfirmasi',
      pending: 'Menunggu',
      inProgress: 'Sedang Berlangsung',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      patientsInClinic: 'Pasien di klinik',
      doctorWorkload: 'Beban Kerja Dokter',
      appointmentStatus: 'Status Janji Temu',
      todayProgress: 'Progres Hari Ini',
      busiestTimeAnalysis: 'Analisis Waktu Tersibuk',
      busiestHour: 'Jam Tersibuk',
      averagePerHour: 'Rata-rata per Jam',
      activeHours: 'Jam Aktif',
      hourlyDistribution: 'Distribusi per Jam',
      appointments: 'janji temu',
      timeDistribution: 'Distribusi waktu',
      patientsPresent: 'Ada pasien',
      calendarThisWeek: 'Kalender Minggu Ini',
      viewDetails: 'Lihat Detail',
      deepStatistics: 'Statistik Mendalam',
      deepStatisticsMessage: 'Fitur statistik mendalam akan segera tersedia',
      loadingSchedule: 'Memuat jadwal klinik...',
      noAppointments: 'Tidak ada janji temu',
      noAppointmentsMessage: 'Tidak ada janji temu yang dijadwalkan untuk periode ini',
      doctorFilter: 'Filter Dokter',
      selectAll: 'Pilih Semua',
      clear: 'Hapus',
      advancedAnalytics: 'Analitik Lanjutan',
      advancedAnalyticsSubtitle: 'Insight prediktif untuk optimisasi klinik',
      predictiveAnalytics: 'Analitik Prediktif',
      aiDrivenPredictions: 'Prediksi berbasis AI',
      nextWeekDemand: 'Perkiraan permintaan minggu depan',
      peakHoursPrediction: 'Prediksi jam sibuk',
      cancellationRisk: 'Risiko pembatalan',
      patientFlowOptimization: 'Optimasi Alur Pasien',
      streamlineOperations: 'Sederhanakan operasional',
      averageWaitTime: 'Waktu tunggu rata-rata',
      throughputEfficiency: 'Efisiensi throughput',
      bottleneckIdentified: 'Bottleneck teridentifikasi',
      xrayRoom: 'Ruang X-Ray',
      revenueForecasting: 'Peramalan Pendapatan',
      financialPredictions: 'Prediksi finansial',
      monthlyProjection: 'Proyeksi bulanan',
      growthRate: 'Tingkat pertumbuhan',
      optimalPricing: 'Harga optimal',
      implemented: 'Diimplementasikan',
      actionableInsights: 'Insight yang Dapat Ditindaklanjuti',
      recommendation1: 'Tambah 2 slot pada 10.00-11.00',
      recommendation1Desc: 'Periode permintaan tinggi dengan peningkatan 23%',
      recommendation2: 'Optimalkan penjadwalan X-Ray',
      recommendation2Desc: 'Kurangi bottleneck rata-rata 15 menit',
      doctors: {
        drSarahLestari: 'Dr. Sarah Lestari',
        drAhmadFauzi: 'Dr. Ahmad Fauzi',
        drMayaSari: 'Dr. Maya Sari',
        drRinoPratama: 'Dr. Rino Pratama'
      },
      specializations: {
        generalDentist: 'Dokter Gigi Umum',
        orthodontist: 'Orthodontist',
        endodontist: 'Endodontist',
        oralSurgeon: 'Ahli Bedah Mulut'
      },
      appointmentTypes: {
        generalConsultation: 'Konsultasi Umum',
        scalingPolishing: 'Scaling & Polishing'
      },
      patients: {
        ahmadSutrisno: 'Ahmad Sutrisno',
        budiSantoso: 'Budi Santoso'
      },
      locations: {
        room1: 'Ruang 1',
        room2: 'Ruang 2'
      },
      reasons: {
        toothacheUpperRight: 'Sakit gigi kanan atas',
        routineScaling: 'Scaling rutin setiap enam bulan'
      },
      appointment: {
        details: 'Detail Janji Temu',
        patientInfo: 'Informasi Pasien',
        appointmentDetails: 'Detail Janji Temu',
        riskAssessment: 'Penilaian Risiko',
        riskLevel: 'Tingkat Risiko',
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah',
        teledentistry: 'Teledentistry',
        videoConsultation: 'Konsultasi Video',
        patientWillJoin: 'Pasien akan mengikuti konsultasi melalui video call',
        openVideoRoom: 'Buka Ruang Video',
        depositRequired: 'Deposit Diperlukan',
        patientNeedsDeposit: 'Pasien perlu membayar deposit sebelum perawatan',
        notes: 'Catatan',
        confirm: 'Konfirmasi Janji Temu',
        cancel: 'Batalkan',
        checkin: 'Check-in Pasien',
        reschedule: 'Reschedule',
        start: 'Mulai Perawatan',
        noShow: 'Tandai Tidak Hadir',
        complete: 'Selesaikan Perawatan',
        edit: 'Edit',
        viewPatient: 'Pasien',
        status: {
          pending: 'Menunggu Konfirmasi',
          confirmed: 'Dikonfirmasi',
          checkin: 'Check-in',
          inchair: 'Sedang Perawatan',
          completed: 'Selesai',
          cancelled: 'Dibatalkan',
          noshow: 'Tidak Hadir',
          rescheduleRequested: 'Minta Reschedule'
        }
      },
      stats: {
        totalAppointments: 'Total Janji Temu',
        todayLabel: 'Hari Ini',
        ofTotal: 'dari total',
        inProgress: 'Sedang Berlangsung',
        percentCompleted: 'selesai',
        doctorWorkload: 'Beban Kerja Dokter',
        appointments: 'janji temu',
        noDoctor: 'Tidak ada data dokter',
        appointmentStatus: 'Status Janji Temu',
        todayProgress: 'Progres Hari Ini',
        vsYesterday: 'vs kemarin',
        performanceIndicators: 'Indikator Performa',
        currentlyActive: 'Sedang aktif',
        notConfirmed: 'Belum dikonfirmasi',
        trendsAndPredictions: 'Tren & Prediksi',
        peakHoursPrediction: 'Prediksi Jam Sibuk',
        basedOnHistoricalPatterns: 'Berdasarkan pola historis',
        optimalCapacity: 'Kapasitas Optimal',
        recommendedUtilization: 'Rekomendasi utilisasi',
        avgWaitTime: 'Rata-rata Waktu Tunggu',
        todayEstimate: 'Estimasi hari ini',
        revenueImpact: 'Dampak Pendapatan',
        vsLastWeek: 'vs minggu lalu',
        optimizationRecommendations: 'Rekomendasi Optimasi',
        optimizeHour1012: 'Optimalkan slot 10.00-12.00',
        addSlotsInBusiestHours: 'Tambah slot pada jam tersibuk untuk kurangi waktu tunggu',
        distributeDoctors: 'Sebar Dokter',
        balanceWorkloadForOptimalEfficiency: 'Seimbangkan beban kerja untuk efisiensi optimal',
        followupReminder: 'Pengingat Tindak Lanjut',
        activateAutoReminders: 'Aktifkan pengingat otomatis untuk menurunkan no-show',
        efficiencyRate: 'Tingkat Efisiensi',
        completedVsTotal: 'Selesai vs Total',
        target: 'Target',
        attendanceRate: 'Tingkat Kehadiran',
        nonCancelledAppointments: 'Janji temu yang tidak dibatalkan',
        timeUtilization: 'Utilisasi Waktu',
        activeHoursUtilization: 'Pemanfaatan jam aktif',
        operationalHours: 'jam operasional'
      },
      daily: {
        headerTitle: 'Jadwal Harian',
        scheduledLabel: '{{count}} janji temu terjadwal',
        appointmentsForDoctor: '{{count}} janji temu',
        appointmentsTodayCount: '{{count}} janji hari ini',
        activeDoctors: '{{count}} dokter aktif',
        viewTimeline: 'Linimasa',
        viewGrid: 'Grid',
        unknownDoctor: 'Dokter tidak dikenal',
        noAppointmentsToday: 'Tidak ada janji temu hari ini',
        defaultSpecialization: 'Dokter Gigi'
      },
      multi: {
        selectedDoctors: '{{count}} Dokter',
        dayNamesShort: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
        moreAppointments: '+{{count}} lagi'
      },
      detail: {
        nameUnavailable: 'Nama tidak tersedia',
        contactUnavailable: 'Kontak tidak tersedia',
        ageLabel: 'Usia: {{age}} {{unit}}',
        years: 'tahun',
        providerUnavailable: 'Dokter tidak tersedia',
        typeUnavailable: 'Tipe tidak tersedia',
        complaint: 'Keluhan',
        duration: '{{minutes}} menit',
        channelClinic: 'Klinik',
        channelTele: 'Teledentistry'
      }
    },
    dashboard: {
      badge: 'Ikhtisar Klinik',
      title: 'Dasbor Klinik',
      subtitle: 'Ringkasan aktivitas dan performa klinik hari ini',
      quickActions: 'Aksi Cepat',
      todaySummary: 'Ringkasan Hari Ini',
      recentActivities: 'Aktivitas Terbaru',
      upcomingAppointments: 'Janji Mendatang',
      newAppointment: '+ Janji Temu',
      checkin: 'Check-in',
      createInvoice: 'Buat Invoice',
      receivePayment: 'Terima Pembayaran',
      teleconsult: 'Telekonsultasi',
      appointmentsToday: 'Janji Hari Ini',
      roomOccupancy: 'Keterisian Ruang',
      noShow: 'No-Show',
      dailyRevenue: 'Pendapatan Hari Ini',
      stockAlerts: 'Peringatan Stok',
      teamTasks: 'Tugas Tim'
    },
    patients: {
      title: 'Pasien & Rekam Medis',
      subtitle: 'Kelola data pasien, riwayat medis, dan dokumen terkait',
      registry: 'Registry Pasien',
      history: 'Riwayat Kunjungan',
      documents: 'Dokumen & Consent',
      imaging: 'Imaging & X-Ray',
      aiInbox: 'CDSS Inbox'
    },
    billing: {
      title: 'Billing & Asuransi',
      subtitle: 'Pantau invoice, pembayaran, klaim, dan promo klinik',
      tabs: {
        invoices: 'Invoice',
        payments: 'Pembayaran',
        claims: 'Klaim Asuransi',
        promos: 'Promo & Paket'
      },
      payments: {
        title: 'Aktivitas Pembayaran',
        recordPayment: 'Catat Pembayaran',
        searchPlaceholder: 'Cari pembayaran...',
        allMethods: 'Semua Metode',
        stats: {
          total: 'Total Diterima',
          completed: 'Selesai',
          pending: 'Menunggu Konfirmasi',
          today: 'Hari Ini'
        },
        methods: {
          cash: 'Tunai',
          transfer: 'Transfer Bank',
          qris: 'QRIS',
          debit: 'Kartu Debit',
          credit: 'Kartu Kredit'
        },
        status: {
          completed: 'Selesai',
          pending: 'Menunggu',
          failed: 'Gagal',
          refunded: 'Dikembalikan'
        },
        table: {
          paymentId: 'ID Pembayaran',
          invoice: 'Invoice',
          patient: 'Pasien',
          amount: 'Jumlah',
          method: 'Metode',
          receivedBy: 'Diterima Oleh',
          status: 'Status',
          actions: 'Aksi'
        }
      },
      claims: {
        title: 'Klaim Asuransi',
        submitClaim: 'Ajukan Klaim',
        searchPlaceholder: 'Cari klaim...',
        allInsurance: 'Semua Asuransi',
        allStatus: 'Semua Status',
        stats: {
          totalClaimed: 'Total Klaim',
          totalApproved: 'Total Disetujui',
          approved: 'Klaim Disetujui',
          pending: 'Menunggu Review'
        },
        status: {
          pending: 'Menunggu',
          processing: 'Diproses',
          approved: 'Disetujui',
          partial: 'Sebagian Disetujui',
          rejected: 'Ditolak'
        },
        table: {
          claimNumber: 'No. Klaim',
          patient: 'Pasien',
          treatment: 'Tindakan',
          insurance: 'Asuransi',
          claimAmount: 'Jumlah Klaim',
          approvedAmount: 'Jumlah Disetujui',
          status: 'Status',
          actions: 'Aksi'
        }
      },
      promos: {
        title: 'Promo & Paket',
        searchPromos: 'Cari promo...',
        searchPackages: 'Cari paket...',
        createPromo: 'Buat Promo',
        createPackage: 'Buat Paket',
        allStatus: 'Semua Status',
        tabs: {
          promos: 'Promo',
          packages: 'Paket'
        },
        stats: {
          activePromos: 'Promo Aktif',
          totalUsage: 'Total Pemakaian',
          activePackages: 'Paket Aktif',
          packagesSold: 'Paket Terjual'
        },
        status: {
          active: 'Aktif',
          expiring: 'Segera Berakhir',
          expired: 'Berakhir',
          inactive: 'Tidak Aktif'
        },
        type: {
          percentage: 'Persentase',
          fixed: 'Nominal'
        },
        promosList: 'Daftar Promo',
        table: {
          name: 'Nama',
          code: 'Kode',
          type: 'Tipe',
          value: 'Nilai',
          validity: 'Masa Berlaku',
          usage: 'Penggunaan',
          status: 'Status',
          actions: 'Aksi'
        },
        package: {
          sold: 'Terjual',
          validity: 'Masa Berlaku',
          includes: 'Termasuk',
          edit: 'Ubah Paket'
        }
      }
    },
    inventory: {
      title: 'Inventori & Sterilisasi',
      subtitle: 'Kelola stok, pembelian, dan sterilisasi peralatan',
      tabs: {
        stock: 'Stok Barang',
        purchase: 'Permintaan Beli',
        receipts: 'Penerimaan',
        usage: 'Pemakaian',
        equipment: 'Sterilisasi & Alat'
      },

      purchase: {
        title: 'Daftar Permintaan Pembelian',
        newRequest: 'Buat Permintaan',
        searchPlaceholder: 'Cari permintaan...',
        allStatus: 'Semua Status',
        stats: {
          pending: 'Menunggu Approval',
          approved: 'Disetujui',
          ordered: 'Sudah Dipesan',
          totalValue: 'Total Nilai'
        },
        status: {
          pending: 'Menunggu Approval',
          approved: 'Disetujui',
          rejected: 'Ditolak',
          ordered: 'Sudah Dipesan'
        },
        priority: {
          high: 'Tinggi',
          medium: 'Sedang',
          low: 'Rendah'
        },
        table: {
          requestNumber: 'No. Permintaan',
          requestedBy: 'Diminta Oleh',
          items: 'Item',
          estimatedCost: 'Est. Biaya',
          priority: 'Prioritas',
          status: 'Status',
          actions: 'Aksi'
        }
      },

      receipts: {
        title: 'Daftar Penerimaan Barang',
        newReceipt: 'Terima Barang',
        searchPlaceholder: 'Cari penerimaan...',
        allStatus: 'Semua Status',
        stats: {
          pending: 'Menunggu Verifikasi',
          verified: 'Terverifikasi',
          partial: 'Penerimaan Sebagian',
          thisMonth: 'Bulan Ini'
        },
        status: {
          pending: 'Menunggu Verifikasi',
          verified: 'Terverifikasi',
          partial: 'Sebagian',
          rejected: 'Ditolak'
        },
        table: {
          receiptNumber: 'No. Penerimaan',
          poNumber: 'No. PO',
          supplier: 'Supplier',
          receivedBy: 'Diterima Oleh',
          items: 'Item',
          status: 'Status',
          actions: 'Aksi'
        }
      },

      usage: {
        title: 'Riwayat Pemakaian',
        recordUsage: 'Catat Pemakaian',
        searchPlaceholder: 'Cari pemakaian...',
        allTreatments: 'Semua Tindakan',
        topUsed: 'Item Paling Banyak Digunakan',
        stats: {
          today: 'Pemakaian Hari Ini',
          thisWeek: 'Minggu Ini',
          thisMonth: 'Bulan Ini',
          totalCost: 'Total Biaya'
        },
        table: {
          date: 'Tanggal',
          treatment: 'Tindakan',
          patient: 'Pasien',
          items: 'Item',
          cost: 'Biaya',
          actions: 'Aksi'
        }
      },

      equipment: {
        tabs: {
          sterilization: 'Sterilisasi',
          equipment: 'Peralatan'
        },
        sterilization: {
          title: 'Riwayat Sterilisasi',
          newCycle: 'Mulai Sterilisasi',
          searchPlaceholder: 'Cari batch...',
          allStatus: 'Semua Status',
          stats: {
            completed: 'Selesai Hari Ini',
            inProgress: 'Sedang Proses',
            failed: 'Gagal',
            thisWeek: 'Minggu Ini'
          },
          table: {
            batch: 'Batch',
            equipment: 'Alat',
            cycle: 'Siklus',
            operator: 'Operator',
            items: 'Item',
            status: 'Status',
            actions: 'Aksi'
          }
        },
        list: {
          title: 'Daftar Peralatan',
          addEquipment: 'Tambah Alat',
          searchPlaceholder: 'Cari peralatan...',
          allTypes: 'Semua Tipe',
          stats: {
            operational: 'Operasional',
            inUse: 'Sedang Digunakan',
            maintenance: 'Maintenance',
            total: 'Total Alat'
          },
          table: {
            equipment: 'Peralatan',
            type: 'Tipe',
            location: 'Lokasi',
            condition: 'Kondisi',
            maintenance: 'Maintenance',
            status: 'Status',
            actions: 'Aksi'
          }
        }
      }
    },
    reports: {
      title: 'Laporan & KPI',
      subtitle: 'Analitik, performa, dan business intelligence',
      operational: 'Operasional',
      financial: 'Keuangan',
      compliance: 'Kepatuhan',
      marketing: 'Marketing'
    },
    clinic: {
      staff: {
        searchPlaceholder: 'Cari berdasarkan nama, email, posisi, atau peran...',
        filters: {
          role: {
            label: 'Peran',
            all: 'Semua Peran'
          },
          status: {
            label: 'Status',
            all: 'Semua Status',
            active: 'Aktif',
            inactive: 'Tidak Aktif',
            invited: 'Diundang'
          }
        },
        directory: {
          headers: {
            staff: 'Staf',
            contact: 'Kontak',
            role: 'Peran',
            status: 'Status',
            actions: 'Tindakan'
          },
          actions: {
            view: 'Lihat Profil',
            edit: 'Edit Peran',
            remove: 'Hapus'
          },
          empty: {
            title: 'Tidak ada anggota staf ditemukan',
            description: 'Mulai dengan mengundang anggota staf pertama Anda'
          }
        },
        actions: {
          addStaff: 'Tambah Staf'
        },
        errors: {
          loadFailed: 'Gagal memuat data staf',
          profileUpdateFailed: 'Gagal memperbarui profil'
        },
        totalStaff: 'Total Staf',
        summary: {
          total: 'Total Staf',
          active: 'Staf Aktif',
          efficiency: 'Efisiensi',
          utilization: 'Utilisasi',
          satisfaction: 'Kepuasan',
          revenue_per_staff: 'Pendapatan per Staf',
          capacity: 'Kapasitas',
          productivity: 'Produktivitas',
          attendance: 'Kehadiran',
          performance: 'Performa',
          lastActivity: 'Aktivitas Terakhir'
        }
      }
    },
    settings: {
      title: 'Pengaturan',
      subtitle: 'Konfigurasi klinik, layanan, dan sistem',
      badge: 'Pengaturan Sistem',
      profile: 'Profil Saya',
      clinic: 'Profil Klinik',
      schedule: 'Jam Operasional',
      services: 'Layanan & Tarif',
      integrations: 'Integrasi',
      users: 'Pengguna & Peran',
      templates: 'Template Dokumen',
      audit: 'Audit & Data',
      readOnly: 'Hanya Baca',
      readOnlyIntegrations: 'Anda hanya dapat melihat pengaturan integrasi',
      saveAll: 'Simpan Semua',
      accessibleSections: 'bagian yang dapat diakses',
      roleAccess: 'Akses Berdasarkan Peran',
      roleAccessDesc: 'Peran Anda menentukan pengaturan mana yang dapat Anda akses dan ubah. Hubungi administrator untuk izin tambahan.',
      profileSaveSuccess: 'Profil berhasil diperbarui!',
      profileSaveError: 'Gagal memperbarui profil',
      passwordChangeSuccess: 'Password berhasil diubah!',
      passwordChangeError: 'Gagal mengubah password',
      avatarUploadSuccess: 'Avatar berhasil diunggah!',
      avatarUploadError: 'Gagal mengunggah avatar',
      clinicSaveSuccess: 'Informasi klinik berhasil diperbarui!',
      clinicSaveError: 'Gagal memperbarui informasi klinik',
      scheduleSaveSuccess: 'Jadwal berhasil diperbarui!',
      scheduleSaveError: 'Gagal memperbarui jadwal',
      operatingHours: 'Jam Operasional',
      holidays: 'Hari Libur',
      open: 'Buka',
      closed: 'Tutup',
      saving: 'Menyimpan...',
      saveSchedule: 'Simpan Jadwal',
      addHoliday: 'Tambah Hari Libur',
      noHolidays: 'Belum ada hari libur dikonfigurasi'
    },
    services: {
      title: 'Layanan & Tarif',
      addService: 'Tambah Layanan',
      noServices: 'Belum ada layanan dikonfigurasi',
      name: 'Nama Layanan',
      namePlaceholder: 'Masukkan nama layanan',
      category: 'Kategori',
      price: 'Harga (IDR)',
      duration: 'Durasi (menit)',
      description: 'Deskripsi',
      descriptionPlaceholder: 'Masukkan deskripsi layanan',
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      minutes: 'menit',
      addSuccess: 'Layanan berhasil ditambahkan!',
      addError: 'Gagal menambahkan layanan',
      updateSuccess: 'Layanan berhasil diperbarui!',
      updateError: 'Gagal memperbarui layanan',
      deleteSuccess: 'Layanan berhasil dihapus!',
      deleteError: 'Gagal menghapus layanan',
      deleteConfirm: 'Apakah Anda yakin ingin menghapus layanan ini?',
      toggleError: 'Gagal memperbarui status layanan',
      categories: {
        general: 'Umum',
        cleaning: 'Pembersihan',
        filling: 'Penambalan',
        extraction: 'Pencabutan',
        surgery: 'Bedah',
        cosmetic: 'Kosmetik',
        orthodontic: 'Ortodonti',
        other: 'Lainnya'
      }
    },
    integrations: {
      enabled: 'Diaktifkan',
      testConnection: 'Tes Koneksi',
      toggleError: 'Gagal memperbarui integrasi',
      saveSuccess: 'Pengaturan integrasi berhasil disimpan!',
      saveError: 'Gagal menyimpan pengaturan integrasi',
      testSuccess: 'Tes koneksi berhasil!',
      testError: 'Tes koneksi gagal',
      whatsapp: {
        title: 'WhatsApp Business',
        description: 'Kirim pengingat janji temu dan notifikasi',
        businessNumber: 'Nomor Telepon Bisnis',
        accessToken: 'Token Akses'
      },
      bpjs: {
        title: 'BPJS Kesehatan',
        description: 'Integrasi dengan sistem asuransi BPJS',
        consId: 'Consumer ID',
        secretKey: 'Secret Key'
      },
      payment: {
        title: 'Gateway Pembayaran',
        serverKey: 'Server Key',
        clientKey: 'Client Key',
        secretKey: 'Secret Key',
        publicKey: 'Public Key',
        production: 'Mode Produksi',
        midtrans: {
          description: 'Terima pembayaran melalui Midtrans'
        },
        xendit: {
          description: 'Terima pembayaran melalui Xendit'
        }
      },
      sms: {
        title: 'Notifikasi SMS',
        description: 'Kirim pengingat janji temu via SMS',
        accountSid: 'Account SID',
        authToken: 'Auth Token'
      }
    },
    users: {
      title: 'Manajemen Pengguna',
      inviteUser: 'Undang Pengguna',
      name: 'Nama',
      namePlaceholder: 'Masukkan nama lengkap',
      email: 'Email',
      emailPlaceholder: 'Masukkan alamat email',
      role: 'Peran',
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      lastLogin: 'Login terakhir',
      neverLoggedIn: 'Belum pernah login',
      editPermissions: 'Edit Izin',
      deactivate: 'Nonaktifkan',
      activate: 'Aktifkan',
      removeUser: 'Hapus Pengguna',
      removeConfirm: 'Apakah Anda yakin ingin menghapus pengguna ini dari klinik?',
      inviteSuccess: 'Undangan pengguna berhasil dikirim!',
      inviteError: 'Gagal mengirim undangan',
      roleUpdateSuccess: 'Peran pengguna berhasil diperbarui!',
      roleUpdateError: 'Gagal memperbarui peran pengguna',
      statusUpdateSuccess: 'Status pengguna berhasil diperbarui!',
      statusUpdateError: 'Gagal memperbarui status pengguna',
      removeSuccess: 'Pengguna berhasil dihapus!',
      removeError: 'Gagal menghapus pengguna',
      permissionUpdateError: 'Gagal memperbarui izin',
      sendInvite: 'Kirim Undangan',
      roles: {
        owner: 'Pemilik',
        ownerDesc: 'Akses penuh ke semua fitur',
        manager: 'Manajer',
        managerDesc: 'Mengelola staf dan operasi klinik',
        admin: 'Admin',
        adminDesc: 'Akses administratif',
        dentist: 'Dokter Gigi',
        dentistDesc: 'Akses profesional medis',
        nurse: 'Perawat',
        nurseDesc: 'Akses asisten medis',
        frontOffice: 'Front Office',
        frontOfficeDesc: 'Resepsionis dan penjadwalan',
        cashier: 'Kasir',
        cashierDesc: 'Pemrosesan pembayaran',
        staff: 'Staf',
        staffDesc: 'Akses dasar klinik'
      },
      permissions: {
        title: 'Izin',
        patients: 'Pasien',
        appointments: 'Janji Temu',
        staff: 'Manajemen Staf',
        settings: 'Pengaturan',
        read: 'Baca',
        write: 'Tulis',
        delete: 'Hapus'
      }
    },
    templates: {
      title: 'Template Dokumen',
      createTemplate: 'Buat Template',
      noTemplates: 'Belum ada template dikonfigurasi',
      name: 'Nama Template',
      namePlaceholder: 'Masukkan nama template',
      type: 'Tipe',
      subject: 'Subjek',
      subjectPlaceholder: 'Masukkan baris subjek',
      content: 'Konten',
      contentPlaceholder: 'Masukkan konten template...',
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      variables: 'Variabel',
      availableVariables: 'Variabel yang Tersedia',
      variablesHelp: 'Klik variabel untuk memasukkannya ke template Anda',
      lastModified: 'Dimodifikasi',
      preview: 'Pratinjau',
      edit: 'Edit',
      delete: 'Hapus',
      createSuccess: 'Template berhasil dibuat!',
      createError: 'Gagal membuat template',
      updateSuccess: 'Template berhasil diperbarui!',
      updateError: 'Gagal memperbarui template',
      deleteSuccess: 'Template berhasil dihapus!',
      deleteError: 'Gagal menghapus template',
      deleteConfirm: 'Apakah Anda yakin ingin menghapus template ini?',
      toggleError: 'Gagal memperbarui status template',
      types: {
        notification: 'Notifikasi',
        notificationDesc: 'Notifikasi Email/SMS',
        document: 'Dokumen',
        documentDesc: 'Dokumen yang dapat dicetak',
        report: 'Laporan',
        reportDesc: 'Laporan medis',
        receipt: 'Kwitansi',
        receiptDesc: 'Kwitansi pembayaran'
      },
      variables: {
        clinicName: 'Nama Klinik',
        patientName: 'Nama Pasien',
        patientEmail: 'Email Pasien',
        patientPhone: 'Telepon Pasien',
        patientDob: 'Tanggal Lahir Pasien',
        appointmentDate: 'Tanggal Janji Temu',
        appointmentTime: 'Waktu Janji Temu',
        doctorName: 'Nama Dokter',
        diagnosis: 'Diagnosis',
        treatment: 'Perawatan',
        cost: 'Biaya',
        totalAmount: 'Jumlah Total',
        paymentMethod: 'Metode Pembayaran',
        todayDate: 'Tanggal Hari Ini'
      }
    },
    audit: {
      settingsSaveSuccess: 'Pengaturan audit berhasil disimpan!',
      settingsSaveError: 'Gagal menyimpan pengaturan audit',
      exportSuccess: 'Log audit berhasil diekspor!',
      exportError: 'Gagal mengekspor log audit',
      exportLogs: 'Ekspor Log',
      exporting: 'Mengekspor...',
      saving: 'Menyimpan...',
      saveSettings: 'Simpan Pengaturan',
      searchPlaceholder: 'Cari log...',
      readOnlySettings: 'Anda hanya dapat melihat pengaturan audit',
      dataRetention: {
        title: 'Retensi Data',
        enabled: 'Aktifkan retensi data otomatis',
        patientRecords: 'Rekam Medis Pasien (tahun)',
        appointmentLogs: 'Log Janji Temu (tahun)',
        auditLogs: 'Log Audit (tahun)',
        backupFrequency: 'Frekuensi Backup'
      },
      logging: {
        title: 'Pencatatan Aktivitas',
        userActions: 'Tindakan Pengguna',
        systemEvents: 'Event Sistem',
        dataChanges: 'Perubahan Data',
        loginAttempts: 'Percobaan Login',
        paymentTransactions: 'Transaksi Pembayaran',
        fileAccess: 'Akses File'
      },
      compliance: {
        title: 'Kepatuhan & Keamanan',
        gdprCompliant: 'Patuh GDPR',
        hipaaCompliant: 'Patuh HIPAA',
        dataEncryption: 'Enkripsi Data',
        accessLogging: 'Pencatatan Akses',
        regularBackups: 'Backup Rutin',
        staffTraining: 'Pelatihan Staf'
      },
      frequency: {
        daily: 'Harian',
        weekly: 'Mingguan',
        monthly: 'Bulanan'
      },
      logs: {
        title: 'Log Audit',
        noLogs: 'Tidak ada log audit ditemukan'
      },
      columns: {
        timestamp: 'Waktu',
        user: 'Pengguna',
        action: 'Tindakan',
        resource: 'Sumber Daya',
        status: 'Status',
        details: 'Detail'
      },
      periods: {
        '7days': '7 hari terakhir',
        '30days': '30 hari terakhir',
        '90days': '90 hari terakhir',
        '1year': 'Tahun lalu'
      }
    }
  },
  // Common
  common: {
    save: 'Simpan',
    cancel: 'Batal',
    edit: 'Edit',
    delete: 'Hapus',
    add: 'Tambah',
    search: 'Cari',
    filter: 'Filter',
    loading: 'Memuat...',
    noData: 'Tidak ada data',
    confirm: 'Konfirmasi',
    back: 'Kembali',
    next: 'Selanjutnya',
    previous: 'Sebelumnya',
    close: 'Tutup',
    view: 'Lihat',
    download: 'Unduh',
    upload: 'Unggah',
    settings: 'Pengaturan',
    refresh: 'Muat Ulang',
    reset: 'Reset',
    clear: 'Bersihkan',
    update: 'Perbarui',
    create: 'Buat',
    submit: 'Kirim',
    apply: 'Terapkan',
    today: 'Hari ini',
    yesterday: 'Kemarin',
    tomorrow: 'Besok',
    thisWeek: 'Minggu ini',
    lastWeek: 'Minggu lalu',
    thisMonth: 'Bulan ini',
    lastMonth: 'Bulan lalu',
    yes: 'Ya',
    no: 'Tidak',
    role: 'Peran',
    lightMode: 'Mode Terang',
    darkMode: 'Mode Gelap',
    viewAll: 'Lihat Semua',
    viewSchedule: 'Lihat Jadwal',
    locale: 'id-ID'
  },

  // Sidebar Navigation
  sidebar: {
    dashboard: 'Dasbord',
    schedule: 'Jadwal',
    patients: 'Pasien',
    teledentistry: 'Teledentistry',
    reports: 'Laporan',
    settings: 'Pengaturan',
    aiInsights: 'Penalaran AI',
    profile: 'Profil',
    logout: 'Keluar'
  },

  // Navigation
  navigation: {
    dashboard: 'Dashboard',
    schedule: 'Jadwal',
    patients: 'Pasien',
    teledentistry: 'Teledentistry',
    reports: 'Laporan',
    settings: 'Pengaturan',
    aiInsights: 'AI Insights',
    profile: 'Profil',
    logout: 'Keluar'
  },

  // Dashboard/Home
  home: {
    title: 'Dashboard Praktik',
    welcome: 'Selamat datang',
    overview: 'Ringkasan Praktik',
    performanceMetrics: 'Metrik Kinerja',
    realTimeAnalytics: 'Analitik praktik real-time & indikator kunci',
    businessIntelligence: 'Intelijen Bisnis',
    aiDrivenInsights: 'Wawasan berbasis AI dan analitik keuangan',
    patientCareManagement: 'Manajemen Perawatan Pasien',
    comprehensivePatientCare: 'Perawatan pasien yang komprehensif dan manajemen hubungan',
    clinicalPracticeManagement: 'Manajemen Klinik & Praktik',
    treatmentPlanningInventory: 'Perencanaan perawatan & manajemen inventaris',
    frequentlyUsedFeatures: 'Fitur yang sering digunakan untuk efisiensi praktik',
    customizeLayout: 'Sesuaikan Tata Letak',
    todayAppointments: 'Janji Temu Hari Ini',
    upcomingAppointments: 'Janji Temu Mendatang',
    recentPatients: 'Pasien Terbaru',
    quickActions: 'Aksi Cepat',
    scheduleAppointment: 'Jadwalkan Janji Temu',
    addPatient: 'Tambah Pasien',
    viewReports: 'Lihat Laporan',
    totalPatients: 'Total Pasien',
    appointmentsToday: 'Janji Temu Hari Ini',
    revenue: 'Pendapatan',
    satisfaction: 'Kepuasan',
    chairStatus: 'Status Kursi',
    realTimeChairUtilization: 'Utilisasi kursi real-time',
    utilization: 'Utilisasi',
    occupied: 'Terisi',
    cleaning: 'Pembersihan',
    available: 'Tersedia',
    maintenance: 'Maintenance',
    unknown: 'Tidak Diketahui',
    claimsOutstanding: 'Klaim Tertunda',
    agingSummary: 'Ringkasan aging',
    outstandingClaims: 'klaim belum selesai',
    avgDays: 'Rata-rata hari',
    agingBreakdown: 'Rincian Aging',
    totalClaims: 'Total klaim',
    days: 'hari',
    filters: 'Filter',
    today: 'Hari ini',
    sevenDays: '7 Hari',
    thirtyDays: '30 Hari',
    allProviders: 'Semua Provider',
    allLocations: 'Semua Lokasi',
    productionVsCollections: 'Produksi vs Koleksi',
    lastSevenDays: '7 hari terakhir',
    production: 'Produksi',
    collections: 'Koleksi',
    totalProduction: 'Total Produksi',
    totalCollections: 'Total Koleksi',
    aiInsights: 'AI Insights',
    topNoShowRisksToday: 'Top risiko no-show hari ini',
  },

  // Schedule
  schedule: {
    title: 'Jadwal Praktik',
    dailyView: 'Harian',
    weeklyView: 'Mingguan',
    monthlyView: 'Bulanan',
    today: 'Hari Ini',
    tomorrow: 'Besok',
    thisWeek: 'Minggu Ini',
    thisMonth: 'Bulan Ini',
    allProviders: 'Semua Penyedia',
    allLocations: 'Semua Lokasi',
    allChannels: 'Semua Saluran',
    allStatus: 'Semua Status',
    inClinic: 'Di Klinik',
    teledentistry: 'Teledentistry',
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    checkIn: 'Check-in',
    inChair: 'Di Kursi',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    noShow: 'Tidak Hadir',
    reschedule: 'Reschedule',
    rescheduleRequested: 'Permintaan Reschedule',
    appointment: 'Janji Temu',
    patient: 'Pasien',
    provider: 'Penyedia',
    location: 'Lokasi',
    duration: 'Durasi',
    blockTime: 'Blokir Waktu',
    addBlock: 'Tambah Blok',
    reason: 'Alasan',
    lunchBreak: 'Istirahat Makan Siang',
    meeting: 'Rapat',
    emergency: 'Darurat',
    personalTime: 'Waktu Pribadi',
    stats: {
      totalAppointments: 'Total Janji Temu',
      currentlyActive: 'sedang aktif',
      pending: 'Menunggu',
      needsConfirmation: 'Perlu konfirmasi',
      confirmed: 'Dikonfirmasi',
      readyToGo: 'Siap dilakukan',
      completed: 'Selesai',
      successfullyFinished: 'Berhasil diselesaikan',
      teledentistry: 'Teledentistry',
      inClinic: 'di klinik',
      highRisk: 'Risiko Tinggi',
      requiresAttention: 'Perlu perhatian',
      depositRequired: 'Perlu Deposit',
      paymentPending: 'Pembayaran tertunda',
      performanceMetrics: 'Metrik Kinerja',
      completionRate: 'Tingkat Penyelesaian',
      confirmationRate: 'Tingkat Konfirmasi',
      teledentistryUsage: 'Penggunaan Teledentistry',
      quickActions: 'Aksi Cepat',
      newAppointment: 'Janji Temu Baru',
      scheduleNewConsultation: 'Jadwalkan konsultasi baru',
      bulkCheckIn: 'Check-in Massal',
      checkInMultiplePatients: 'Check-in beberapa pasien',
      sendReminders: 'Kirim Pengingat',
      notifyPendingPatients: 'Beri tahu pasien yang menunggu',
      exportSchedule: 'Ekspor Jadwal',
      downloadDailyReport: 'Unduh laporan harian',
    },
    filters: {
      search: 'Cari',
      searchPlaceholder: 'Cari berdasarkan nama pasien, alasan...',
      dateRange: 'Rentang Tanggal',
      provider: 'Penyedia',
      location: 'Lokasi',
      channel: 'Saluran',
      status: 'Status',
      reset: 'Reset',
      filters: 'Filter',
      customRange: 'Rentang Kustom'
    },
    appointment: {
      confirm: 'Konfirmasi',
      reschedule: 'Reschedule',
      cancel: 'Batal',
      startVideo: 'Mulai Video',
      requestPhotos: 'Minta Foto',
      urgent: 'Mendesak'
    }
  },

  // Patients
  patients: {
    title: 'Manajemen Pasien',
    addPatient: 'Tambah Pasien Baru',
    selectPatient: 'Pilih Pasien',
    selectPatientDesc: 'Pilih pasien dari daftar untuk melihat informasi detailnya dan mengelola perawatan mereka.',
    totalPatients: 'Total Pasien',
    activePatients: 'Pasien Aktif',
    patientProfile: 'Profil Pasien',
    medicalHistory: 'Riwayat Medis',
    aiResults: 'Hasil AI',
    appointments: 'Janji Temu',
    treatmentPlan: 'Rencana Perawatan',
    documents: 'Dokumen',
    communication: 'Komunikasi',
    billing: 'Penagihan',
    personalInfo: 'Informasi Pribadi',
    age: 'Usia',
    gender: 'Jenis Kelamin',
    allergies: 'Alergi',
    medications: 'Obat Saat Ini',
    bloodType: 'Golongan Darah',
    emergencyContact: 'Kontak Darurat',
    insurance: 'Asuransi',
    lastVisit: 'Kunjungan Terakhir',
    nextAppointment: 'Janji Temu Berikutnya',
    priority: 'Prioritas',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    high: 'Tinggi',
    medium: 'Sedang',
    low: 'Rendah',
    normal: 'Normal',
    patientManagement: {
      title: 'Manajemen Pasien',
      choosePatient: 'Pilih pasien dari daftar',
    },
  },

  // Settings
  settings: {
    title: 'Pengaturan',
    subtitle: 'Konfigurasi klinik, layanan, dan sistem',
    badge: 'Pengaturan Sistem',
    profile: 'Profil Saya',
    clinic: 'Profil Klinik',
    schedule: 'Jam Operasional',
    services: 'Layanan & Tarif',
    integrations: 'Integrasi',
    users: 'Pengguna & Peran',
    templates: 'Template Dokumen',
    audit: 'Audit & Data',
    readOnly: 'Hanya Baca',
    saveAll: 'Simpan Semua',
    accessibleSections: 'bagian yang dapat diakses',
    roleAccess: 'Akses Berdasarkan Peran',
    roleAccessDesc: 'Peran Anda menentukan pengaturan mana yang dapat Anda akses dan ubah. Hubungi administrator untuk izin tambahan.',
    practice: 'Pengaturan Praktik',
    preferences: 'Preferensi',
    security: 'Keamanan',
    billing: 'AI & Penagihan',
    profileSettings: 'Pengaturan Profil',
    practiceSettings: 'Pengaturan Praktik',
    preferencesSettings: 'Pengaturan Preferensi',
    securitySettings: 'Pengaturan Keamanan',
    billingSettings: 'Pengaturan AI & Penagihan',
    
    // Profile
    personalInformation: 'Informasi Pribadi',
    professionalInformation: 'Informasi Profesional',
    managePersonalProfessional: 'Kelola informasi pribadi dan profesional Anda',
    uploadImage: 'Unggah Gambar',
    uploading: 'Mengunggah...',
    name: 'Nama',
    email: 'Email',
    phone: 'Telepon',
    
    // Security
    changePassword: 'Ubah Kata Sandi',
    currentPassword: 'Kata Sandi Saat Ini',
    newPassword: 'Kata Sandi Baru',
    confirmPassword: 'Konfirmasi Kata Sandi',
    enterCurrentPassword: 'Masukkan kata sandi saat ini',
    enterNewPassword: 'Masukkan kata sandi baru',
    confirmNewPassword: 'Konfirmasi kata sandi baru',
    saving: 'Menyimpan...',
    edit: 'Edit',
    clinicInformation: 'Informasi Klinik',
    enterFullName: 'Masukkan nama lengkap',
    enterEmailAddress: 'Masukkan alamat email',
    enterPhoneNumber: 'Masukkan nomor telepon',
    specialization: 'Spesialisasi',
    experience: 'Pengalaman (tahun)',
    yearsOfExperience: 'Tahun pengalaman',
    years: 'tahun',
    education: 'Pendidikan',
    educationQualification: 'Kualifikasi pendidikan',
    clinicName: 'Nama Klinik',
    consultationFee: 'Biaya Konsultasi',
    about: 'Tentang',
    notFilledYet: 'Belum diisi',
    
    // Preferences
    themeDisplay: 'Tema & Tampilan',
    theme: 'Tema',
    language: 'Bahasa',
    fontSize: 'Ukuran Font',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Default sistem',
    english: 'Bahasa Inggris',
    indonesian: 'Bahasa Indonesia',
    small: 'Kecil',
    large: 'Besar',
    reduceMotion: 'Kurangi Gerakan',
    reduceMotionDesc: 'Membantu meningkatkan performa yang dirasakan',
    
    // Notifications
    notifications: 'Notifikasi',
    emailNotifications: 'Notifikasi Email',
    emailNotificationsDesc: 'Terima pembaruan melalui email',
    pushNotifications: 'Notifikasi Push',
    pushNotificationsDesc: 'Notifikasi real-time di browser Anda',
    appointmentReminders: 'Pengingat Janji Temu',
    appointmentRemindersDesc: 'Tetap mengikuti kunjungan mendatang',
    marketingEmails: 'Email Pemasaran',
    marketingEmailsDesc: 'Pembaruan produk dan praktik terbaik',
    systemUpdates: 'Pembaruan Sistem',
    systemUpdatesDesc: 'Informasi penting dari platform',
    reminderSound: 'Suara Pengingat',
    reminderSoundDesc: 'Aktifkan suara untuk pengingat dan peringatan',
    
    // Regional
    personalPreferences: 'Preferensi Pribadi',
    timezone: 'Zona Waktu',
    dateFormat: 'Format Tanggal',
    timeFormat: 'Format Waktu',
    currency: 'Mata Uang',
    autoSave: 'Simpan Otomatis',
    autoSaveDesc: 'Simpan perubahan secara otomatis',
    showTips: 'Tampilkan Tips',
    showTipsDesc: 'Tampilkan tips dan bantuan yang disesuaikan',
    
    // Privacy
    privacy: 'Privasi',
    profileVisibility: 'Visibilitas Profil',
    public: 'Publik',
    limited: 'Terbatas',
    private: 'Pribadi',
    dataSharing: 'Berbagi Data',
    dataSharingDesc: 'Bagikan data penggunaan anonim untuk meningkatkan pengalaman',
    analytics: 'Analitik',
    analyticsDesc: 'Aktifkan wawasan yang membantu kami meningkatkan',
    
    // Actions
    preferencesSaved: 'Preferensi berhasil disimpan!',
    resetPreferencesConfirm: 'Apakah Anda yakin ingin mengatur ulang semua preferensi ke default?',
  },

  // Teledentistry
  teledentistry: {
    title: 'Teledentistry',
    activeCall: 'Panggilan Aktif',
    conversations: 'Percakapan',
    startCall: 'Mulai Panggilan',
    endCall: 'Akhiri Panggilan',
    mute: 'Bisukan',
    unmute: 'Aktifkan Suara',
    camera: 'Kamera',
    shareScreen: 'Bagikan Layar',
    chat: 'Chat',
    patientInfo: 'Informasi Pasien',
    callDuration: 'Durasi Panggilan',
    callQuality: 'Kualitas Panggilan',
    dashboard: {
      title: 'Dashboard Sesi Hari Ini',
      subtitle: 'Appointment virtual yang live, menunggu, dan akan datang.',
      empty: 'Tidak ada sesi hari ini',
      formSubmitted: 'Form pra-sesi sudah diisi',
      status: {
        live: 'Live',
        waiting: 'Menunggu',
        upcoming: 'Akan Datang',
        overdue: 'Terlewat',
        completed: 'Selesai'
      }
    },
    chatReadiness: {
      tokenResponseMissing: 'Respons sesi teledentistry tidak lengkap. Silakan coba lagi.',
      paymentPending: 'Pembayaran belum selesai. Chat akan tersedia setelah pembayaran dikonfirmasi.',
      sessionEnded: 'Sesi teledentistry telah berakhir. Riwayat chat ditampilkan dari arsip lokal.',
      chatNotReady: 'Chat belum tersedia untuk appointment ini. Silakan coba lagi beberapa saat.',
      chatTokenMissing: 'Token chat belum tersedia. Silakan coba lagi atau hubungi admin.',
      conversationNotReady: 'Conversation chat belum siap. Silakan coba lagi beberapa saat.',
      connectFailed: 'Gagal menghubungkan chat'
    }
  },

  // Reports & Statistics
  reports: {
    title: 'Laporan & Statistik',
    subtitle: 'Analitik komprehensif dan business intelligence untuk praktik dental Anda',
    dashboard: 'Dashboard Analitik',
    overview: 'Ringkasan Praktik',
    
    // Time Periods
    today: 'Hari Ini',
    yesterday: 'Kemarin',
    thisWeek: 'Minggu Ini',
    lastWeek: 'Minggu Lalu',
    thisMonth: 'Bulan Ini',
    lastMonth: 'Bulan Lalu',
    thisQuarter: 'Kuartal Ini',
    lastQuarter: 'Kuartal Lalu',
    thisYear: 'Tahun Ini',
    lastYear: 'Tahun Lalu',
    custom: 'Rentang Kustom',
    
    // Categories
    financial: 'Laporan Keuangan',
    operational: 'Laporan Operasional',
    clinical: 'Laporan Klinis',
    patient: 'Analitik Pasien',
    performance: 'Metrik Kinerja',
    comparative: 'Analisis Perbandingan',
    
    // Financial Metrics
    revenue: 'Pendapatan',
    revenueAnalysis: 'Analisis Pendapatan',
    totalRevenue: 'Total Pendapatan',
    grossRevenue: 'Pendapatan Kotor',
    netRevenue: 'Pendapatan Bersih',
    projectedRevenue: 'Proyeksi Pendapatan',
    revenueGrowth: 'Pertumbuhan Pendapatan',
    revenueByService: 'Pendapatan per Layanan',
    revenueByProvider: 'Pendapatan per Dokter',
    revenueByLocation: 'Pendapatan per Lokasi',
    revenueByPaymentMethod: 'Pendapatan per Metode Pembayaran',
    monthlyRevenue: 'Pendapatan Bulanan',
    revenueByTreatment: 'Pendapatan per Perawatan',
    averageTransactionValue: 'Nilai Transaksi Rata-rata',
    paymentMethods: 'Metode Pembayaran',
    outstandingPayments: 'Tagihan Belum Dibayar',
    
    // Operational Metrics
    appointments: 'Janji Temu',
    appointmentAnalysis: 'Analisis Janji Temu',
    totalAppointments: 'Total Janji Temu',
    completedAppointments: 'Janji Temu Selesai',
    cancelledAppointments: 'Janji Temu Dibatalkan',
    noShowRate: 'Tingkat Tidak Hadir',
    rescheduleRate: 'Tingkat Jadwal Ulang',
    appointmentDuration: 'Durasi Rata-rata',
    appointmentEfficiency: 'Efisiensi Janji Temu',
    chairUtilization: 'Utilisasi Kursi',
    providerProductivity: 'Produktivitas Dokter',
    scheduleOptimization: 'Optimisasi Jadwal',
    peakHours: 'Jam Sibuk',
    appointmentTypes: 'Jenis Janji Temu',
    waitTimeDistribution: 'Distribusi Waktu Tunggu',
    roomUtilization: 'Utilisasi Ruangan',
    staffEfficiency: 'Efisiensi Staff',
    averageWaitTime: 'Waktu Tunggu Rata-rata',
    dailyCapacity: 'Kapasitas Harian',
    
    // Clinical Metrics
    treatments: 'Perawatan',
    treatmentAnalysis: 'Analisis Perawatan',
    treatmentSuccess: 'Tingkat Keberhasilan Perawatan',
    treatmentTypes: 'Jenis Perawatan',
    treatmentComplexity: 'Kompleksitas Perawatan',
    treatmentDuration: 'Durasi Perawatan',
    treatmentOutcomes: 'Hasil Perawatan',
    clinicalIndicators: 'Indikator Klinis',
    qualityMetrics: 'Metrik Kualitas',
    successRateByTreatment: 'Tingkat Keberhasilan per Perawatan',
    diagnosisAccuracy: 'Akurasi Diagnosis',
    accuracyRate: 'Tingkat Akurasi',
    painManagement: 'Manajemen Nyeri',
    followUpCompliance: 'Kepatuhan Tindak Lanjut',
    infectionControl: 'Kontrol Infeksi',
    equipmentEfficiency: 'Efisiensi Peralatan',
    treatmentTimeline: 'Timeline Perawatan',
    complicationRate: 'Tingkat Komplikasi',
    treatmentCompletion: 'Penyelesaian Perawatan',
    patientSatisfaction: 'Kepuasan Pasien',
    
    // Patient Metrics
    patients: 'Pasien',
    patientAnalysis: 'Analisis Pasien',
    newPatients: 'Pasien Baru',
    returningPatients: 'Pasien Kembali',
    patientRetention: 'Retensi Pasien',
    patientSatisfaction: 'Kepuasan Pasien',
    patientDemographics: 'Demografi Pasien',
    patientJourney: 'Perjalanan Pasien',
    patientLTV: 'Nilai Seumur Hidup Pasien',
    patientAcquisition: 'Akuisisi Pasien',
    totalPatients: 'Total Pasien',
    activePatients: 'Pasien Aktif',
    retentionRate: 'Tingkat Retensi',
    averageAge: 'Usia Rata-rata',
    ageDistribution: 'Distribusi Usia',
    visitFrequency: 'Frekuensi Kunjungan',
    
    // Demographics
    demographics: 'Demografi',
    genderDistribution: 'Distribusi Gender',
    male: 'Pria',
    female: 'Wanita',
    ageGroups: 'Kelompok Usia',
    
    // Treatment specifics
    totalTreatments: 'Total Perawatan',
    completed: 'Selesai',
    ongoing: 'Berlangsung',
    successRate: 'Tingkat Keberhasilan',
    successful: 'Berhasil',
    complications: 'Komplikasi',
    referrals: 'Rujukan',
    perTreatment: 'per Perawatan',
    treatments: 'perawatan',
    popularity: 'Popularitas',
    outcomes: 'Hasil',
    treatmentDescription: "Ringkasan volume, outcome, dan waktu perawatan—sekilas",
    
    // Growth metrics
    growth: 'Pertumbuhan',
    retention: 'Retensi',
    yearlyGrowth: 'Pertumbuhan Tahunan',
    avgMonthlyGrowth: 'Pertumbuhan Bulanan Rata-rata',
    avgNewPatients: 'Pasien Baru Rata-rata',
    avgDuration: 'Durasi Rata-rata',
    avgMonthly: 'Rata-rata Bulanan',
    
    // Quality metrics
    satisfaction: 'Kepuasan',
    appointmentFrequency: 'Frekuensi Janji Temu',
    treatmentCompletion: 'Penyelesaian Perawatan',
    communication: 'Komunikasi',
    
    // Data updates
    dataUpdated: 'Data Diperbarui',
    lastUpdated: 'Terakhir Diperbarui',
    patientSatisfaction: 'Kepuasan Pasien',
    patientDemographics: 'Demografi Pasien',
    patientJourney: 'Perjalanan Pasien',
    patientLTV: 'Nilai Seumur Hidup Pasien',
    patientAcquisition: 'Akuisisi Pasien',
    totalPatients: 'Total Pasien',
    activePatients: 'Pasien Aktif',
    retentionRate: 'Tingkat Retensi',
    averageAge: 'Usia Rata-rata',
    ageDistribution: 'Distribusi Usia',
    visitFrequency: 'Frekuensi Kunjungan',
    referralSources: 'Sumber Rujukan',
    retentionAnalysis: 'Analisis Retensi',
    retentionByYears: 'Retensi per Tahun',
    churnRisk: 'Risiko Churn',
    patientValue: 'Nilai Pasien',
    averageLifetimeValue: 'Nilai Seumur Hidup Rata-rata',
    valueSegments: 'Segmen Nilai',
    outOf5Stars: 'dari 5 bintang',
    overallExperience: 'Pengalaman Keseluruhan',
    waitTime: 'Waktu Tunggu',
    staffFriendliness: 'Keramahan Staff',
    facilityCleanliness: 'Kebersihan Fasilitas',
    treatmentExplanation: 'Penjelasan Perawatan',
    regular6Months: 'Rutin (6 bulan)',
    yearly: 'Tahunan',
    asNeeded: 'Sesuai kebutuhan',
    irregular: 'Tidak teratur',
    wordOfMouth: 'Dari Mulut ke Mulut',
    onlineSearch: 'Pencarian Online',
    socialMedia: 'Media Sosial',
    insurance: 'Asuransi',
    others: 'Lainnya',
    
    // Performance Indicators
    kpi: 'Indikator Kinerja Utama',
    productivity: 'Produktivitas',
    efficiency: 'Efisiensi',
    profitability: 'Profitabilitas',
    growth: 'Tingkat Pertumbuhan',
    benchmarks: 'Tolok Ukur',
    targets: 'Target',
    achievements: 'Pencapaian',
    improvements: 'Area Perbaikan',
    
    // Chart Types
    lineChart: 'Grafik Garis',
    barChart: 'Grafik Batang',
    pieChart: 'Grafik Lingkaran',
    areaChart: 'Grafik Area',
    donutChart: 'Grafik Donat',
    heatmap: 'Peta Panas',
    trendChart: 'Grafik Tren',
    comparisonChart: 'Grafik Perbandingan',
    
    // Data Actions
    export: 'Ekspor',
    print: 'Cetak',
    share: 'Bagikan',
    download: 'Unduh',
    refresh: 'Segarkan Data',
    filter: 'Filter',
    search: 'Cari',
    sort: 'Urutkan',
    
    // Export Formats
    exportPdf: 'Ekspor sebagai PDF',
    exportExcel: 'Ekspor sebagai Excel',
    exportCsv: 'Ekspor sebagai CSV',
    exportImage: 'Ekspor sebagai Gambar',
    
    // Filters
    dateRange: 'Rentang Tanggal',
    provider: 'Dokter',
    location: 'Lokasi',
    service: 'Jenis Layanan',
    paymentMethod: 'Metode Pembayaran',
    patientType: 'Jenis Pasien',
    ageGroup: 'Kelompok Usia',
    gender: 'Jenis Kelamin',
    
    // Filter Options
    allTreatments: 'Semua Perawatan',
    allPatients: 'Semua Pasien',
    returningPatients: 'Pasien Kembali',
    customRange: 'Rentang Kustom',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Selesai',
    treatmentType: 'Jenis Perawatan',
    revenueRange: 'Rentang Pendapatan',
    minRevenue: 'Pendapatan Minimum',
    maxRevenue: 'Pendapatan Maksimum',
    applyFilters: 'Terapkan Filter',
    reset: 'Reset',
    filters: 'Filter',
    
    // Summary Cards
    totalValue: 'Total Nilai',
    averageValue: 'Nilai Rata-rata',
    percentageChange: 'Perubahan',
    trend: 'Tren',
    comparison: 'vs Periode Sebelumnya',
    
    // Insights
    insights: 'Wawasan',
    recommendations: 'Rekomendasi',
    alerts: 'Peringatan',
    trends: 'Tren',
    anomalies: 'Anomali',
    opportunities: 'Peluang',
    
    // Descriptions
    revenueDescription: 'Lacak pendapatan praktik Anda di berbagai periode waktu, layanan, dan dokter',
    appointmentDescription: 'Pantau pola janji temu, efisiensi, dan metrik alur pasien',
    clinicalDescription: 'Analisis hasil perawatan, tingkat keberhasilan, dan indikator kinerja klinis',
    patientDescription: 'Pahami perilaku pasien, demografi, dan metrik kepuasan',
    performanceDescription: 'Metrik kinerja komprehensif dan KPI untuk optimasi praktik',
    
    // Status
    loading: 'Memuat analitik...',
    noData: 'Tidak ada data tersedia untuk periode yang dipilih',
    error: 'Error memuat data laporan',
    success: 'Laporan berhasil dibuat',
    
    // Time Formats
    daily: 'Harian',
    weekly: 'Mingguan',
    monthly: 'Bulanan',
    quarterly: 'Kuartalan',
    yearly: 'Tahunan',
    
    // Units
    currency: 'Mata Uang',
    percentage: 'Persentase',
    count: 'Jumlah',
    duration: 'Durasi',
    rate: 'Tingkat'
  },

  // AI Insights
  ai: {
    title: 'Analisis Klinis AI',
    subtitle: 'Analisis gambar dental canggih yang didukung Serene',
    analysis: 'Analisis',
    recommendations: 'Rekomendasi',
    riskAssessment: 'Penilaian Risiko',
    treatment: 'Perawatan',
    confidence: 'Tingkat Kepercayaan',
    findings: 'Temuan',
    
    // Chat Interface
    chatTitle: 'Asisten AI',
    welcomeMessage: 'Selamat datang di Analisis Klinis AI',
    welcomeSubtitle: 'Unggah gambar dental dan ajukan pertanyaan untuk mendapatkan analisis dan rekomendasi berbasis AI yang komprehensif.',
    inputPlaceholder: 'Tanyakan AI tentang kondisi dental, perawatan, atau unggah gambar untuk analisis...',
    thinking: 'AI sedang berpikir...',
    thinking: 'AI sedang berpikir...',
    
    // Image Upload
    uploadImages: 'Unggah Gambar',
    dragDropText: 'Seret & lepas gambar di sini atau klik untuk menjelajah',
    chooseFiles: 'Pilih File',
    recentImages: 'Gambar Terbaru',
    selectedImage: 'Dipilih',
    imageAnalyzed: 'Gambar dianalisis',
    
    // Quick Actions
    quickActions: 'Aksi Cepat',
    analyzeImage: 'Analisis Gambar Ini',
    identifyConditions: 'Identifikasi Kondisi',
    treatmentRecommendations: 'Rekomendasi Perawatan',
    riskAssessmentAction: 'Penilaian Risiko',
    
    // Analysis Messages
    analyzeImageMessage: 'Tolong analisis gambar dental ini dan berikan diagnosis yang komprehensif.',
    identifyConditionsMessage: 'Bisakah Anda mengidentifikasi kondisi atau kelainan dental dalam gambar ini?',
    treatmentMessage: 'Berdasarkan gambar ini, rekomendasi perawatan apa yang Anda sarankan?',
    riskMessage: 'Tolong nilai tingkat risiko dan urgensi dari kondisi yang ditunjukkan dalam gambar ini.',
    
    // Status
    connected: 'Terhubung',
    disconnected: 'Terputus',
    analysisResults: 'Hasil Analisis',
    
    // Error Messages
    uploadError: 'Gagal mengunggah gambar',
    analysisError: 'Maaf, saya mengalami error. Silakan coba lagi.',
    connectionError: 'Tidak dapat terhubung ke layanan AI',
    deepDental: {
      booting: 'Menginisialisasi Serene AI...',
      clinicalAssistant: 'Asisten Klinis',
      newAnalysis: 'Analisis Baru',
      analyzing: 'Menganalisis...',
      verifyNotice: 'Serene AI dapat keliru. Verifikasi temuan klinis.',
      clearLocalData: 'Bersihkan data klinis lokal',
      clearLocalDataShort: 'Bersihkan Lokal',
      empty: {
        title: 'Siap Menganalisis',
        subtitle: 'Unggah gambar dental atau jelaskan kasus untuk mendapatkan analisis AI, temuan klinis, dan rekomendasi perawatan.',
        pathology: 'Deteksi Patologi',
        clinical: 'Analisis Klinis',
        evidence: 'Berbasis Bukti'
      },
      input: {
        placeholder: 'Tanyakan diagnosis atau unggah scan...',
        dropToAnalyze: 'Lepas untuk dianalisis',
        attachImage: 'Lampirkan gambar dental',
        removeImage: 'Hapus gambar',
        messageInput: 'Pesan analisis dental',
        send: 'Kirim permintaan analisis',
        fileInput: 'Pilih gambar dental'
      },
      qualityCoach: {
        title: 'Quality Coach',
        ready: 'Kualitas awal cukup untuk analisis.'
      },
      sidebar: {
        open: 'Buka riwayat analisis',
        close: 'Tutup riwayat',
        pastAnalyses: 'Analisis terdahulu',
        clinicalHistory: 'Riwayat Klinis',
        sessionsAndCases: 'Sesi dan kasus terverifikasi',
        archiveCase: 'Arsipkan kasus',
        backendSource: 'Backend sebagai sumber data klinis',
        openSession: 'Buka sesi',
        deleteSession: 'Hapus sesi',
        noHistory: 'Belum ada riwayat',
        emptyDescription: 'Mulai analisis baru untuk melihat riwayat.',
        secureStorage: 'Penyimpanan Aman',
        today: 'Hari Ini',
        yesterday: 'Kemarin',
        previous7Days: '7 Hari Terakhir',
        older: 'Lebih Lama'
      }
    }
  },
  patients: {
    title: 'Manajemen Pasien',
    tabs: {
      registry: 'Daftar Pasien',
      appointments: 'Janji Temu',
      analytics: 'Analitik',
      reports: 'Laporan'
    },
    common: {
      gender: {
        male: 'Laki-laki',
        female: 'Perempuan'
      },
      labels: {
        visits: 'kunjungan',
        years: '{{count}} tahun',
        yearsOld: '{{count}} tahun'
      }
    },
    registry: {
      title: 'Daftar Pasien',
      search: 'Cari pasien...',
      loading: 'Memuat data pasien...',
      empty: {
        title: 'Tidak ditemukan pasien',
        description: 'Coba ubah pencarian atau filter Anda'
      },
      filters: {
        all: 'Semua Pasien',
        allStatus: 'Semua Status',
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        vip: 'VIP',
        newPatients: 'Pasien Baru'
      },
      search: {
        placeholder: 'Cari pasien...'
      },
      table: {
        name: 'Nama',
        age: 'Umur',
        gender: 'Jenis Kelamin',
        phone: 'Telepon',
        patient: 'Pasien',
        contact: 'Kontak',
        lastVisit: 'Kunjungan Terakhir',
        totalVisits: 'Kunjungan',
        status: 'Status',
        actions: 'Aksi',
        noEmail: 'Tidak ada email',
        visitsBadge: '{{count}} kunjungan'
      },
      status: {
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        vip: 'VIP'
      },
      actions: {
        view: 'Lihat',
        edit: 'Edit',
        schedule: 'Jadwal',
        history: 'Lihat Riwayat',
        export: 'Ekspor',
        add: 'Tambah Pasien'
      },
      stats: {
        totalPatients: 'Total Pasien',
        newThisMonth: 'Baru Bulan Ini',
        activePatients: 'Pasien Aktif',
        vipPatients: 'Pasien VIP'
      }
    },
    appointments: {
      title: 'Janji Temu Pasien',
      scheduleNew: 'Jadwalkan Janji Baru',
      upcoming: 'Janji Mendatang',
      past: 'Janji Sebelumnya',
      cancelled: 'Dibatalkan',
      noAppointments: 'Tidak ada janji temu'
    },
    analytics: {
      filters: 'Filter Analitik',
      period: 'Periode',
      year: 'Tahun',
      month: 'Bulan',
      periods: {
        all: 'Sepanjang Waktu',
        today: 'Hari Ini',
        week: 'Minggu Ini',
        month: 'Bulan Ini',
        year: 'Tahun Ini',
        custom: 'Rentang Khusus'
      },
      viewPatients: 'Lihat Pasien',
      patientList: 'Pasien Terfilter',
      modalTitle: 'Pasien Terfilter',
      patientCard: {
        meta: '{{age}} tahun • {{gender}} • {{phone}}'
      },
      stats: {
        total: 'Total Pasien',
        active: 'Pasien Aktif',
        vip: 'Pasien VIP',
        avgAge: 'Rata-rata Umur'
      },
      charts: {
        ageDistribution: 'Distribusi Umur',
        genderRatio: 'Distribusi Jenis Kelamin',
        monthlyVisits: 'Kunjungan Bulanan',
        treatmentTypes: 'Jenis Perawatan',
        datasets: {
          patients: 'Pasien',
          visits: 'Kunjungan'
        }
      },
      treatments: {
        cleaning: 'Pembersihan',
        filling: 'Tambal',
        rootCanal: 'Perawatan Saluran Akar',
        extraction: 'Pencabutan',
        crown: 'Mahkota',
        whitening: 'Pemutihan',
        other: 'Lainnya'
      },
      demographics: 'Rincian Demografi',
      table: {
        ageGroup: 'Kelompok Umur',
        male: 'Laki-laki',
        female: 'Perempuan',
        total: 'Total',
        percentage: 'Persentase'
      }
    },
    reports: {
      title: 'Laporan Pasien',
      reportType: 'Tipe Laporan',
      generate: 'Buat Laporan',
      generating: 'Sedang membuat...',
      generationSuccess: 'Laporan berhasil dibuat!',
      types: {
        patientList: 'Daftar Pasien',
        visitSummary: 'Ringkasan Kunjungan',
        treatmentReport: 'Laporan Perawatan',
        demographic: 'Demografi'
      },
      filters: {
        dateRange: 'Rentang Tanggal',
        patientType: 'Jenis Pasien',
        patientTypes: {
          all: 'Semua Pasien',
          active: 'Pasien Aktif',
          inactive: 'Pasien Tidak Aktif',
          vip: 'Pasien VIP'
        },
        treatmentType: 'Jenis Perawatan',
        treatmentTypes: {
          all: 'Semua Perawatan',
          cleaning: 'Pembersihan',
          filling: 'Tambal',
          rootCanal: 'Perawatan Saluran Akar',
          extraction: 'Pencabutan'
        }
      },
      preview: {
        title: 'Pratinjau Laporan',
        patientList: {
          title: 'Pratinjau Daftar Pasien',
          more: '... dan {{count}} pasien lainnya'
        },
        visitSummary: {
          title: 'Pratinjau Ringkasan Kunjungan',
          totalVisits: 'Total Kunjungan',
          avgVisits: 'Rata-rata Kunjungan per Pasien'
        },
        treatmentReport: {
          title: 'Pratinjau Laporan Perawatan',
          distribution: 'Distribusi Perawatan'
        },
        demographic: {
          title: 'Pratinjau Laporan Demografi',
          genderDistribution: 'Distribusi Jenis Kelamin',
          averageAge: 'Rata-rata Umur'
        }
      },
      recent: {
        title: 'Laporan Terbaru'
      }
    },
    details: {
      personalInfo: 'Informasi Pribadi',
      medicalHistory: 'Riwayat Medis',
      treatmentHistory: 'Riwayat Perawatan',
      appointments: 'Janji Temu',
      documents: 'Dokumen',
      notSpecified: 'Belum diisi',
      patientId: 'ID Pasien: #{{id}}',
      basicInfo: {
        fullName: 'Nama Lengkap',
        dateOfBirth: 'Tanggal Lahir',
        gender: 'Jenis Kelamin',
        phone: 'Nomor Telepon',
        email: 'Email',
        address: 'Alamat',
        emergencyContact: 'Kontak Darurat',
        age: 'Umur',
        ageValue: '{{count}} tahun'
      },
      medical: {
        allergies: 'Alergi',
        conditions: 'Kondisi Medis',
        medications: 'Obat Saat Ini',
        bloodType: 'Golongan Darah',
        lastTreatment: 'Perawatan Terakhir'
      },
      visitStats: {
        title: 'Statistik Kunjungan',
        totalVisits: 'Total Kunjungan',
        lastVisit: 'Kunjungan Terakhir',
        patientSince: 'Pasien Sejak'
      }
    }
  },
  profile: {
    settings: 'Pengaturan Profil',
    description: 'Kelola informasi akun dan preferensi Anda',
    changePhoto: 'Ganti Foto',
    personalInfo: 'Informasi Pribadi',
    fullName: 'Nama Lengkap',
    email: 'Alamat Email',
    phoneNumber: 'Nomor Telepon',
    title: 'Gelar Profesi',
    licenseNumber: 'Nomor Izin',
    specialization: 'Spesialisasi Utama',
    about: 'Tentang',
    aboutPlaceholder: 'Ceritakan tentang diri Anda...',
    registrationNumber: 'Nomor Registrasi',
    yearsOfExperience: 'Tahun Pengalaman',
    education: 'Kualifikasi Pendidikan',
    consultationFee: 'Biaya Konsultasi',
    clinicName: 'Nama Klinik',
    clinicAddress: 'Alamat Klinik',
    changePassword: 'Ubah Password',
    currentPassword: 'Password Saat Ini',
    newPassword: 'Password Baru',
    confirmPassword: 'Konfirmasi Password Baru',
    saveProfile: 'Simpan Profil',
    saving: 'Menyimpan...',
    changing: 'Mengubah...',
    updateSuccess: 'Profil berhasil diperbarui!',
    updateError: 'Gagal memperbarui profil',
    passwordChangeSuccess: 'Password berhasil diubah!',
    passwordChangeError: 'Gagal mengubah password',
    passwordMismatch: 'Password baru tidak cocok',
    passwordTooShort: 'Password harus minimal 6 karakter',
    avatarUploadSuccess: 'Foto profil berhasil diperbarui!',
    avatarUploadError: 'Gagal mengunggah foto profil',
    invalidImageType: 'Pilih file gambar yang valid',
    imageTooLarge: 'Ukuran gambar harus kurang dari 5MB'
  },
  
  // Schedule Settings
  schedule: {
    operatingHours: 'Jam Operasional',
    open: 'Buka',
    closed: 'Tutup',
    holidays: 'Hari Libur',
    addHoliday: 'Tambah Hari Libur',
    noHolidays: 'Belum ada hari libur dikonfigurasi',
    scheduleSaveSuccess: 'Jadwal berhasil diperbarui!',
    scheduleSaveError: 'Gagal memperbarui jadwal',
    saveSchedule: 'Simpan Jadwal'
  },

  // Services Settings
  services: {
    title: 'Layanan & Tarif',
    addService: 'Tambah Layanan',
    noServices: 'Belum ada layanan dikonfigurasi',
    name: 'Nama Layanan',
    namePlaceholder: 'Masukkan nama layanan',
    category: 'Kategori',
    price: 'Harga (IDR)',
    duration: 'Durasi (menit)',
    description: 'Deskripsi',
    descriptionPlaceholder: 'Masukkan deskripsi layanan',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    minutes: 'menit',
    addSuccess: 'Layanan berhasil ditambahkan!',
    addError: 'Gagal menambahkan layanan',
    updateSuccess: 'Layanan berhasil diperbarui!',
    updateError: 'Gagal memperbarui layanan',
    deleteSuccess: 'Layanan berhasil dihapus!',
    deleteError: 'Gagal menghapus layanan',
    deleteConfirm: 'Apakah Anda yakin ingin menghapus layanan ini?',
    toggleError: 'Gagal memperbarui status layanan',
    categories: {
      general: 'Umum',
      cleaning: 'Pembersihan',
      filling: 'Tambal',
      extraction: 'Cabut',
      surgery: 'Bedah',
      cosmetic: 'Kosmetik',
      orthodontic: 'Ortodontik',
      other: 'Lainnya'
    }
  },

  // Integrations Settings
  integrations: {
    enabled: 'Diaktifkan',
    testConnection: 'Test Koneksi',
    testSuccess: 'Test koneksi berhasil!',
    testError: 'Test koneksi gagal',
    saveSuccess: 'Pengaturan integrasi berhasil disimpan!',
    saveError: 'Gagal menyimpan pengaturan integrasi',
    toggleError: 'Gagal memperbarui integrasi',
    whatsapp: {
      title: 'WhatsApp Business',
      description: 'Kirim pengingat janji temu dan notifikasi',
      businessNumber: 'Nomor Telepon Bisnis',
      accessToken: 'Access Token'
    },
    bpjs: {
      title: 'BPJS Kesehatan',
      description: 'Integrasi dengan sistem asuransi BPJS',
      consId: 'Consumer ID',
      secretKey: 'Secret Key'
    },
    payment: {
      title: 'Payment Gateway',
      serverKey: 'Server Key',
      clientKey: 'Client Key',
      secretKey: 'Secret Key',
      publicKey: 'Public Key',
      production: 'Mode Produksi',
      midtrans: {
        description: 'Terima pembayaran via Midtrans'
      },
      xendit: {
        description: 'Terima pembayaran via Xendit'
      }
    },
    sms: {
      title: 'Notifikasi SMS',
      description: 'Kirim pengingat janji temu via SMS',
      accountSid: 'Account SID',
      authToken: 'Auth Token'
    }
  },

  // Users Settings
  users: {
    title: 'Manajemen Pengguna',
    inviteUser: 'Undang Pengguna',
    name: 'Nama',
    namePlaceholder: 'Masukkan nama lengkap',
    email: 'Email',
    emailPlaceholder: 'Masukkan alamat email',
    role: 'Peran',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    lastLogin: 'Login terakhir',
    neverLoggedIn: 'Belum pernah login',
    editPermissions: 'Edit Izin',
    deactivate: 'Nonaktifkan',
    activate: 'Aktifkan',
    removeUser: 'Hapus Pengguna',
    removeConfirm: 'Apakah Anda yakin ingin menghapus pengguna ini dari klinik?',
    sendInvite: 'Kirim Undangan',
    inviteSuccess: 'Undangan pengguna berhasil dikirim!',
    inviteError: 'Gagal mengirim undangan',
    roleUpdateSuccess: 'Peran pengguna berhasil diperbarui!',
    roleUpdateError: 'Gagal memperbarui peran pengguna',
    statusUpdateSuccess: 'Status pengguna berhasil diperbarui!',
    statusUpdateError: 'Gagal memperbarui status pengguna',
    removeSuccess: 'Pengguna berhasil dihapus!',
    removeError: 'Gagal menghapus pengguna',
    permissionUpdateError: 'Gagal memperbarui izin',
    roles: {
      owner: 'Pemilik',
      manager: 'Manajer',
      admin: 'Admin',
      dentist: 'Dokter Gigi',
      nurse: 'Perawat',
      frontOffice: 'Front Office',
      cashier: 'Kasir',
      staff: 'Staff',
      ownerDesc: 'Akses penuh ke semua fitur',
      managerDesc: 'Kelola staff dan operasional klinik',
      adminDesc: 'Akses administrasi',
      dentistDesc: 'Akses profesional medis',
      nurseDesc: 'Akses asisten medis',
      frontOfficeDesc: 'Resepsionis dan penjadwalan',
      cashierDesc: 'Pemrosesan pembayaran',
      staffDesc: 'Akses dasar klinik'
    },
    permissions: {
      title: 'Izin',
      patients: 'Pasien',
      appointments: 'Janji Temu',
      staff: 'Manajemen Staff',
      settings: 'Pengaturan',
      read: 'Baca',
      write: 'Tulis',
      delete: 'Hapus'
    }
  },

  // Templates Settings
  templates: {
    title: 'Template Dokumen',
    createTemplate: 'Buat Template',
    noTemplates: 'Belum ada template dikonfigurasi',
    name: 'Nama Template',
    namePlaceholder: 'Masukkan nama template',
    type: 'Jenis',
    subject: 'Subjek',
    subjectPlaceholder: 'Masukkan baris subjek',
    content: 'Konten',
    contentPlaceholder: 'Masukkan konten template...',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    preview: 'Pratinjau',
    edit: 'Edit',
    delete: 'Hapus',
    variables: 'Variabel',
    lastModified: 'Dimodifikasi',
    availableVariables: 'Variabel Tersedia',
    variablesHelp: 'Klik variabel untuk menyisipkannya ke dalam template Anda',
    createSuccess: 'Template berhasil dibuat!',
    createError: 'Gagal membuat template',
    updateSuccess: 'Template berhasil diperbarui!',
    updateError: 'Gagal memperbarui template',
    deleteSuccess: 'Template berhasil dihapus!',
    deleteError: 'Gagal menghapus template',
    deleteConfirm: 'Apakah Anda yakin ingin menghapus template ini?',
    toggleError: 'Gagal memperbarui status template',
    types: {
      notification: 'Notifikasi',
      document: 'Dokumen',
      report: 'Laporan',
      receipt: 'Kwitansi',
      notificationDesc: 'Notifikasi Email/SMS',
      documentDesc: 'Dokumen yang dapat dicetak',
      reportDesc: 'Laporan medis',
      receiptDesc: 'Kwitansi pembayaran'
    },
    variables: {
      clinicName: 'Nama Klinik',
      patientName: 'Nama Pasien',
      patientEmail: 'Email Pasien',
      patientPhone: 'Telepon Pasien',
      patientDob: 'Tanggal Lahir Pasien',
      appointmentDate: 'Tanggal Janji Temu',
      appointmentTime: 'Waktu Janji Temu',
      doctorName: 'Nama Dokter',
      diagnosis: 'Diagnosis',
      treatment: 'Perawatan',
      cost: 'Biaya',
      totalAmount: 'Total Jumlah',
      paymentMethod: 'Metode Pembayaran',
      todayDate: 'Tanggal Hari Ini'
    }
  },

  // Audit Settings
  audit: {
    readOnlySettings: 'Anda hanya dapat melihat pengaturan audit',
    dataRetention: {
      title: 'Retensi Data',
      enabled: 'Aktifkan retensi data otomatis',
      patientRecords: 'Rekam Pasien (tahun)',
      appointmentLogs: 'Log Janji Temu (tahun)',
      auditLogs: 'Log Audit (tahun)',
      backupFrequency: 'Frekuensi Backup'
    },
    logging: {
      title: 'Pencatatan Aktivitas',
      userActions: 'Aksi Pengguna',
      systemEvents: 'Event Sistem',
      dataChanges: 'Perubahan Data',
      loginAttempts: 'Percobaan Login',
      paymentTransactions: 'Transaksi Pembayaran',
      fileAccess: 'Akses File'
    },
    compliance: {
      title: 'Kepatuhan & Keamanan',
      gdprCompliant: 'Sesuai GDPR',
      hipaaCompliant: 'Sesuai HIPAA',
      dataEncryption: 'Enkripsi Data',
      accessLogging: 'Pencatatan Akses',
      regularBackups: 'Backup Rutin',
      staffTraining: 'Pelatihan Staff'
    },
    frequency: {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan'
    },
    logs: {
      title: 'Log Audit'
    },
    columns: {
      timestamp: 'Waktu',
      user: 'Pengguna',
      action: 'Aksi',
      resource: 'Resource',
      status: 'Status',
      details: 'Detail'
    },
    periods: {
      '7days': '7 hari terakhir',
      '30days': '30 hari terakhir',
      '90days': '90 hari terakhir',
      '1year': 'Tahun terakhir'
    },
    searchPlaceholder: 'Cari log...',
    noLogs: 'Log audit tidak ditemukan',
    exportLogs: 'Ekspor Log',
    exporting: 'Mengekspor...',
    exportSuccess: 'Log audit berhasil diekspor!',
    exportError: 'Gagal mengekspor log audit',
    settingsSaveSuccess: 'Pengaturan audit berhasil disimpan!',
    settingsSaveError: 'Gagal menyimpan pengaturan audit',
    saving: 'Menyimpan...',
    saveSettings: 'Simpan Pengaturan'
  },

  // General Settings
  settings: {
    badge: 'PENGATURAN',
    title: 'Pengaturan',
    subtitle: 'Kelola konfigurasi klinik, preferensi, dan pengaturan sistem',
    profile: 'Profil Saya',
    clinic: 'Profil Klinik',
    schedule: 'Jam Operasional',
    services: 'Layanan & Tarif',
    integrations: 'Integrasi',
    users: 'Pengguna & Peran',
    templates: 'Template Dokumen',
    audit: 'Audit & Data',
    readOnly: 'Hanya Baca',
    saveAll: 'Simpan Semua Perubahan',
    accessibleSections: 'bagian yang dapat diakses',
    roleAccess: 'Level Akses Anda',
    roleAccessDesc: 'Akses penuh ke semua pengaturan termasuk integrasi, audit, dan manajemen pengguna',
    avatarUploadSuccess: 'Foto profil berhasil diperbarui!',
    readOnlyIntegrations: 'Anda hanya dapat melihat pengaturan integrasi',
    clinicSaveSuccess: 'Informasi klinik berhasil diperbarui!',
    clinicSaveError: 'Gagal memperbarui informasi klinik',
    saveClinic: 'Simpan Info Klinik'
  },

  // Common days
  days: {
    monday: 'Senin',
    tuesday: 'Selasa',
    wednesday: 'Rabu',
    thursday: 'Kamis',
    friday: 'Jumat',
    saturday: 'Sabtu',
    sunday: 'Minggu'
  },

  // Common actions
  common: {
    save: 'Simpan',
    cancel: 'Batal',
    update: 'Perbarui',
    add: 'Tambah',
    create: 'Buat',
    delete: 'Hapus',
    edit: 'Edit',
    saving: 'Menyimpan...',
    sending: 'Mengirim...',
    creating: 'Membuat...',
    search: 'Cari...',
    role: 'Peran',
    darkMode: 'Mode Gelap',
    lightMode: 'Mode Terang',
    locale: 'id-ID'
  },
  auth: {
    login: {
      emailNotFound: 'Email tidak ditemukan. Silakan periksa kembali email Anda atau daftar akun baru.',
      wrongPassword: 'Password salah. Silakan periksa kembali password Anda.',
      invalidCredentials: 'Email atau password salah. Silakan coba lagi.',
      missingFields: 'Email dan password harus diisi'
    }
  },
  admin: {
    // Navigation labels
    nav: {
      dashboard: 'Dashboard',
      clinicManagement: 'Manajemen Klinik',
      clinicDirectory: 'Direktori Klinik',
      clinicVerification: 'Verifikasi Klinik',
      ownerAccounts: 'Akun Owner',
      
      dentistManagement: 'Manajemen Dokter Gigi',
      dentistDirectory: 'Direktori Dokter Gigi',
      verificationQueue: 'Antrean Verifikasi',
      professionalNetwork: 'Jaringan Profesional',
      
      revenueBilling: 'Pendapatan & Tagihan',
      revenueDashboard: 'Dashboard Pendapatan',
      paymentProcessing: 'Pemrosesan Pembayaran',
      subscriptionManagement: 'Manajemen Langganan',
      
      aiPlatform: 'Platform AI',
      aiUsageAnalytics: 'Analitik Penggunaan AI',
      modelManagement: 'Manajemen Model',
      aiBilling: 'Tagihan AI',
      
      supportHelpdesk: 'Dukungan & Helpdesk',
      ticketManagement: 'Manajemen Tiket',
      knowledgeBase: 'Basis Pengetahuan',
      communicationCenter: 'Pusat Komunikasi',
      
      analytics: 'Analitik & Laporan',
      businessIntelligence: 'Business Intelligence',
      performanceMetrics: 'Metrik Kinerja',
      financialReports: 'Laporan Keuangan',
      
      systemAdministration: 'Administrasi Sistem',
      userManagement: 'Manajemen Pengguna',
      systemConfiguration: 'Konfigurasi Sistem',
      monitoring: 'Monitoring & Peringatan',
      
      complianceSecurity: 'Kepatuhan & Keamanan',
      dataPrivacy: 'Privasi Data',
      securityCenter: 'Pusat Keamanan',
      regulatoryCompliance: 'Kepatuhan Regulasi',
      
      partnerships: 'Kemitraan',
      partnerDirectory: 'Direktori Mitra',
      apiManagement: 'Manajemen API',
      integrations: 'Integrasi',
      
      contentManagement: 'Manajemen Konten',
      marketingContent: 'Konten Pemasaran',
      educationalResources: 'Sumber Edukasi',
      resourceLibrary: 'Perpustakaan Sumber Daya'
    },
    
    // User interface
    ui: {
      search: 'Cari admin...',
      darkMode: 'Mode Gelap',
      lightMode: 'Mode Terang',
      logout: 'Keluar',
      profile: 'Profil'
    },
    
    // Sidebar interface
    sidebar: {
      searchPlaceholder: 'Cari admin...',
      profile: 'Pengaturan Profil',
      preferences: 'Preferensi',
      logout: 'Keluar'
    },
    pages: {
      dashboard: {
        title: 'Dashboard Admin',
        subtitle: 'Ringkasan Eksekutif & Overview Platform'
      },
      clinics: {
        title: 'Manajemen Klinik',
        subtitle: 'Direktori Klinik, Verifikasi & Onboarding'
      },
      dentists: {
        title: 'Verifikasi Dokter Gigi',
        subtitle: 'Network Profesional & Verifikasi Kredensial'
      },
      revenue: {
        title: 'Pendapatan & Billing',
        subtitle: 'Pemrosesan Pembayaran & Analitik Keuangan'
      },
      aiPlatform: {
        title: 'Platform AI',
        subtitle: 'Monitoring Penggunaan AI & Manajemen Model'
      },
      support: {
        title: 'Support & Helpdesk',
        subtitle: 'Customer Support & Manajemen Success'
      },
      analytics: {
        title: 'Analitik & Laporan',
        subtitle: 'Business Intelligence & Data Insight'
      },
      system: {
        title: 'Administrasi Sistem',
        subtitle: 'Manajemen User & Konfigurasi Platform'
      },
      compliance: {
        title: 'Kepatuhan & Keamanan',
        subtitle: 'Privasi Data & Kepatuhan Regulasi'
      },
      partnerships: {
        title: 'Kemitraan & API',
        subtitle: 'Partner Integrasi & Manajemen API'
      },
      content: {
        title: 'Manajemen Konten',
        subtitle: 'Sumber Daya Marketing & Edukasi'
      },
      profile: {
        title: 'Pengaturan Profil',
        subtitle: 'Kelola pengaturan akun admin Anda'
      },
      preferences: {
        title: 'Preferensi',
        subtitle: 'Kustomisasi pengalaman admin Anda'
      }
    }
  }
};
