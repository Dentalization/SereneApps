export default {
  common: {
    notifications: 'Notifikasi',
  },
  admin: {
    // Navigation labels
    nav: {
      dashboard: 'Dasbor',
      clinicManagement: 'Manajemen Klinik',
      clinicDirectory: 'Direktori Klinik',
      clinicVerification: 'Verifikasi Klinik',
      ownerAccounts: 'Akun Pemilik',

      dentistManagement: 'Manajemen Dokter Gigi',
      dentistDirectory: 'Direktori Dokter Gigi',
      verificationQueue: 'Antrean Verifikasi',
      professionalNetwork: 'Jaringan Profesional',

      revenueBilling: 'Pendapatan & Tagihan',
      revenueDashboard: 'Dasbor Pendapatan',
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
      businessIntelligence: 'Intelijen Bisnis',
      performanceMetrics: 'Metrik Kinerja',
      financialReports: 'Laporan Keuangan',

      systemAdministration: 'Administrasi Sistem',
      userManagement: 'Manajemen Pengguna',
      systemConfiguration: 'Konfigurasi Sistem',
      monitoring: 'Pemantauan & Peringatan',

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
        title: 'Dasbor Admin',
        subtitle: 'Ringkasan Eksekutif & Ikhtisar Platform'
      },
      clinics: {
        title: 'Manajemen Klinik',
        subtitle: 'Direktori Klinik, Verifikasi & Orientasi'
      },
      dentists: {
        title: 'Verifikasi Dokter Gigi',
        subtitle: 'Jaringan Profesional & Verifikasi Kredensial'
      },
      revenue: {
        title: 'Pendapatan & Penagihan',
        subtitle: 'Pemrosesan Pembayaran & Analitik Keuangan'
      },
      aiPlatform: {
        title: 'Platform AI',
        subtitle: 'Pemantauan Penggunaan AI & Manajemen Model'
      },
      support: {
        title: 'Dukungan & Helpdesk',
        subtitle: 'Dukungan Pelanggan & Manajemen Keberhasilan'
      },
      analytics: {
        title: 'Analitik & Laporan',
        subtitle: 'Intelijen Bisnis & Wawasan Data'
      },
      system: {
        title: 'Administrasi Sistem',
        subtitle: 'Manajemen Pengguna & Konfigurasi Platform'
      },
      compliance: {
        title: 'Kepatuhan & Keamanan',
        subtitle: 'Privasi Data & Kepatuhan Regulasi'
      },
      partnerships: {
        title: 'Kemitraan & API',
        subtitle: 'Mitra Integrasi & Manajemen API'
      },
      content: {
        title: 'Manajemen Konten',
        subtitle: 'Sumber Daya Pemasaran & Edukasi'
      },
      profile: {
        title: 'Pengaturan Profil',
        subtitle: 'Kelola pengaturan akun admin Anda'
      },
      preferences: {
        title: 'Preferensi',
        subtitle: 'Kustomisasi pengalaman admin Anda'
      }
    },
    clinicManagement: {
      header: {
        badge: 'Manajemen Klinik',
        title: 'Manajemen Klinik',
        subtitle: 'Kelola registrasi klinik, verifikasi, dan akun owner',
        totalLabel: 'Total Klinik',
        actions: {
          reviewPending: 'Tinjau Klinik Menunggu'
        },
        statusTabs: {
          all: 'Semua Klinik',
          pending: 'Menunggu',
          verified: 'Terverifikasi',
          rejected: 'Ditolak'
        },
        cards: {
          total: {
            title: 'Total',
            description: 'Klinik terdaftar'
          },
          pending: {
            title: 'Menunggu',
            description: 'Menunggu peninjauan'
          },
          verified: {
            title: 'Terverifikasi',
            description: 'Klinik disetujui'
          },
          rejected: {
            title: 'Ditolak',
            description: 'Pengajuan ditolak'
          }
        }
      },
      directory: {
        title: 'Direktori Klinik',
        description: 'Pantau status onboarding, dokumen, dan detail kepemilikan.',
        loading: 'Memuat...',
        actions: {
          refresh: 'Segarkan',
          refreshing: 'Menyegarkan...',
          addClinic: 'Tambah Klinik'
        },
        search: {
          placeholder: 'Cari berdasarkan klinik, owner, atau email'
        },
        status: {
          all: 'Semua',
          pending: 'Menunggu',
          verified: 'Terverifikasi',
          rejected: 'Ditolak'
        },
        filters: {
          clear: 'Reset filter'
        },
        list: {
          emptyTitle: 'Tidak ada klinik',
          emptyDescription: 'Coba ubah kata kunci atau filter. Registrasi klinik baru akan muncul otomatis setelah dikirim.'
        },
        errors: {
          sessionExpired: 'Sesi berakhir. Mengalihkan ke login...',
          fetchFailed: 'Gagal mengambil data klinik'
        },
        pagination: {
          none: 'Tidak ada klinik untuk ditampilkan',
          range: 'Menampilkan {{start}}-{{end}} dari {{total}}',
          pageInfo: 'Halaman {{page}} dari {{totalPages}}',
          prev: 'Sebelumnya',
          next: 'Berikutnya'
        }
      },
      create: {
        title: 'Buat Klinik',
        defaults: {
          branchName: 'Utama'
        },
        errors: {
          requiredFields: 'Mohon lengkapi kolom wajib: {{fields}}',
          requiredFiles: 'Mohon lampirkan berkas wajib: {{files}}',
          createFailed: 'Gagal membuat klinik',
          unexpected: 'Terjadi kesalahan tak terduga'
        },
        success: {
          message: 'Klinik berhasil dibuat',
          title: 'Klinik berhasil dibuat',
          subtitle: 'Profil klinik telah dibuat dan terdaftar di sistem.',
          tempPassword: {
            title: 'Kata Sandi Sementara Pemilik',
            subtitle: 'Bagikan kata sandi ini secara aman kepada pemilik klinik',
            copyTooltip: 'Salin kata sandi',
            warning: '⚠️ Pemilik disarankan mengubah kata sandi setelah login pertama demi keamanan.'
          },
          actions: {
            backToDirectory: 'Kembali ke Direktori Klinik'
          }
        },
        form: {
          fields: {
            legalName: {
              label: 'Nama Legal',
              placeholder: 'Masukkan nama entitas legal'
            },
            brandName: {
              label: 'Nama Brand',
              placeholder: 'Masukkan nama brand atau klinik'
            },
            facilityType: {
              label: 'Tipe Fasilitas',
              placeholder: 'Pilih tipe fasilitas...',
              options: {
                klinikGigi: 'Klinik Gigi',
                rsgm: 'Rumah Sakit Gigi & Mulut (RSGM)'
              },
              hint: 'Pilih tipe fasilitas yang paling sesuai. Ini menentukan alur onboarding.'
            },
            city: {
              label: 'Kota',
              placeholder: 'mis. Kota Jakarta Barat'
            },
            province: {
              label: 'Provinsi',
              placeholder: 'mis. DKI Jakarta'
            },
            postalCode: {
              label: 'Kode Pos',
              placeholder: 'mis. 12321'
            },
            phone: {
              label: 'Telepon Klinik',
              placeholder: 'mis. 0812-1234-5678'
            },
            email: {
              label: 'Email Klinik',
              placeholder: 'mis. clinic@example.com'
            },
            streetAddress: {
              label: 'Alamat Jalan',
              placeholder: 'Masukkan alamat lengkap'
            },
            ownerName: {
              label: 'Nama Pemilik',
              placeholder: 'Nama lengkap pemilik'
            },
            ownerEmail: {
              label: 'Email Pemilik',
              placeholder: 'owner@example.com'
            },
            ownerPosition: {
              label: 'Posisi Pemilik',
              options: {
                owner: 'Pemilik',
                manager: 'Manajer'
              }
            },
            ownerWhatsapp: {
              label: 'WhatsApp Pemilik',
              placeholder: 'mis. +628123456789'
            },
            ownerNik: {
              label: 'NIK Pemilik',
              placeholder: 'Masukkan nomor NIK pemilik'
            },
            nibNumber: {
              label: 'Nomor NIB',
              placeholder: 'Masukkan nomor NIB'
            },
            npwpNumber: {
              label: 'Nomor NPWP',
              placeholder: 'Masukkan nomor NPWP'
            },
            ktpFile: {
              label: 'Berkas KTP (jpeg/png/pdf)'
            },
            ktpSelfie: {
              label: 'Selfie KTP / Foto Pemilik (jpeg/png/pdf)',
              hint: 'Opsional: Foto pemilik memegang KTP untuk verifikasi'
            },
            nibFile: {
              label: 'Berkas NIB (jpeg/png/pdf)'
            },
            npwpFile: {
              label: 'Berkas NPWP (jpeg/png/pdf)'
            },
            operationalLicense: {
              label: 'Izin Operasional'
            },
            additionalLicenses: {
              label: 'Izin Tambahan (Opsional)',
              hint: 'Unggah izin atau sertifikat tambahan (maks 5 berkas)'
            },
            dataProtectionContact: {
              label: 'Email Kontak Perlindungan Data',
              placeholder: 'dpo@clinic.com',
              hint: 'Opsional: Email untuk pertanyaan perlindungan data/privasi'
            }
          },
          files: {
            ktp: 'Berkas KTP',
            ktpSelfie: 'Selfie KTP / Foto Pemilik',
            nib: 'Berkas NIB',
            npwp: 'Berkas NPWP',
            operationalLicense: 'Izin Operasional',
            additionalLicenses: 'Izin Tambahan'
          },
          operatingHours: {
            title: 'Jam Operasional',
            weekdayLabel: 'Senin - Jumat',
            weekdayPlaceholder: '08:00-17:00',
            saturdayLabel: 'Sabtu',
            saturdayPlaceholder: '08:00-14:00 atau tutup',
            sundayLabel: 'Minggu',
            sundayPlaceholder: 'tutup atau 09:00-12:00',
            hint: 'Jam default akan digunakan untuk cabang utama. Anda dapat mengubah per cabang nanti.'
          },
          actions: {
            submit: 'Buat Klinik',
            creating: 'Sedang membuat...',
            cancel: 'Batal'
          },
          agreement: {
            prefix: 'Saya mengonfirmasi klinik ini menyetujui',
            terms: 'Syarat & Ketentuan',
            connector: 'dan',
            privacy: 'Kebijakan Privasi',
            suffix: '. (Konfirmasi sederhana seperti alur marketplace)'
          }
        }
      }
    },
    clinicDetail: {
      backButton: 'Kembali',
      statusLabels: {
        pending: 'Menunggu Verifikasi',
        verified: 'Terverifikasi',
        rejected: 'Ditolak',
        unknown: 'Status tidak dikenal'
      },
      verification: {
        approveButton: 'Setujui Klinik',
        rejectButton: 'Tolak Pengajuan',
        verifiedBadge: 'Terverifikasi',
        rejectedBadge: 'Ditolak',
        verificationDate: 'Diverifikasi pada {{date}}',
        modal: {
          approveTitle: 'Setujui Registrasi Klinik',
          approveDescription: 'Klinik ini akan ditandai sebagai terverifikasi dan diberikan akses penuh ke platform.',
          rejectTitle: 'Tolak Pengajuan Klinik',
          rejectDescription: 'Registrasi klinik ini akan ditolak dan owner akan diberitahu.',
          notesLabel: 'Catatan Verifikasi',
          notesPlaceholderApprove: 'Tambahkan catatan tentang verifikasi (opsional)',
          notesPlaceholderReject: 'Jelaskan mengapa pengajuan ini ditolak (wajib)',
          notesRequired: '⚠️ Catatan penolakan wajib diisi untuk membantu pemohon memahami keputusan.',
          cancelButton: 'Batal',
          confirmApproveButton: 'Setujui Klinik',
          confirmRejectButton: 'Tolak Pengajuan',
          verifying: 'Memproses...'
        }
      },
      errors: {
        notFoundRedirect: 'Klinik tidak ditemukan. Mengalihkan ke direktori…',
        fetchFailed: 'Gagal mengambil detail klinik',
        staffFetchFailed: 'Gagal mengambil data tim klinik',
        verifyFailed: 'Gagal mengupdate status verifikasi'
      },
      unnamedClinic: 'Klinik Tanpa Nama',
      defaultTimezone: 'Asia/Jakarta',
      unassignedBranchLabel: 'Staf Belum Ditempatkan',
      unnamedBranchLabel: 'Cabang Tanpa Nama',
      virtualBadge: 'Virtual',
      mainBadge: 'Utama',
      branchDirectoryTitle: 'Direktori Cabang',
      branchCount: '{{count}} cabang terdaftar',
      noBranches: 'Belum ada cabang terdaftar.',
      noBranchesEmpty: 'Belum ada cabang. Tambahkan cabang untuk mengelola operasional dan penugasan.',
      unassignedStaffHint: 'Staf tanpa penugasan cabang spesifik',
      staffRosterTitle: 'Daftar Staf',
      staffRosterSubtitle: 'Menampilkan staf yang ditempatkan di {{branch}}.',
      noMainBranchHint: 'Cabang utama belum ditentukan. Tetapkan cabang utama untuk menampilkan penugasan staf.',
      staffCountLabel: '{{count}} staf',
      roomCountLabel: '{{count}} ruang',
      branchCodeLabel: 'Kode: {{code}}',
      quickActionsTitle: 'Aksi Cepat',
      quickActionsSubtitle: 'Kelola verifikasi atau navigasi kembali.',
      modal: {
        approveTitle: 'Setujui Registrasi Klinik',
        rejectTitle: 'Tolak Pengajuan Klinik',
        approveDescription: 'Klinik ini akan ditandai sebagai terverifikasi dan pemilik akan diberi tahu.',
        rejectDescription: 'Pengajuan ini akan ditolak. Mohon berikan alasan di bawah.',
        notesLabel: 'Catatan Verifikasi',
        notesPlaceholderApprove: 'Tambahkan catatan terkait verifikasi (opsional)',
        notesPlaceholderReject: 'Jelaskan alasan penolakan pengajuan ini (wajib)',
        notesHintApprove: 'Catatan ini akan terlihat oleh admin lainnya',
        notesHintReject: 'Pemilik akan melihat alasan ini',
        rejectWarning: 'Mohon sertakan alasan penolakan',
        cancelButton: 'Batal',
        processing: 'Memproses...',
        confirmApprove: 'Setujui Klinik',
        confirmReject: 'Tolak Pengajuan'
      },
      actionBack: 'Kembali ke direktori',
      actionBackHint: 'Lihat semua klinik',
      actionRefresh: 'Segarkan data',
      actionRefreshHint: 'Ambil data terbaru',
      actionVerify: 'Proses verifikasi',
      actionVerifyHint: 'Setujui atau tolak',
      actionApprove: 'Setujui Klinik',
      actionReject: 'Tolak Pengajuan',
      statusVerified: 'Klinik Terverifikasi',
      verifiedOn: 'Diverifikasi pada',
      statusRejected: 'Pengajuan Ditolak',
      notesTitle: 'Catatan',
      notesPlaceholder: 'Gunakan alur verifikasi untuk mencatat tinjauan, lampiran, dan komentar kepatuhan. Catatan ini membantu tim lain memahami keputusan orientasi.',
      legalEntityLabel: 'Entitas legal:',
      metricTotalBranches: 'Total Cabang',
      metricTotalBranchesHint: 'Lokasi terdaftar',
      metricStaff: 'Jumlah Staf',
      metricStaffHint: 'Penugasan aktif',
      metricOwner: 'Pemilik',
      metricPrimaryBranch: 'Cabang Utama',
      primaryBranchSummary: '{{count}} staf • {{location}}',
      primaryBranchMissing: 'Tetapkan cabang utama untuk memantau penugasan.',
      notAssigned: 'Belum ditetapkan',
      noEmail: 'Tidak ada email',
      noLocation: 'Lokasi belum diisi',
      docNIB: 'Nomor NIB',
      docNPWP: 'Nomor NPWP',
      docOperational: 'Izin Operasional',
      docAdditional: 'Dokumen Tambahan',
      complianceFilesTitle: 'Dokumen Kepatuhan',
      docUploadedPlaceholder: 'Diunggah',
      docFilesSuffix: 'berkas',
      operationalOverviewTitle: 'Ikhtisar Operasional',
      operationalOverviewSubtitle: 'Identitas pemilik, kontak, dan kelengkapan kepatuhan.',
      ownerSectionTitle: 'Pemilik / PIC',
      contactSectionTitle: 'Kontak Klinik',
      fieldEmail: 'Email',
      fieldWhatsapp: 'WhatsApp',
      fieldNik: 'NIK',
      fieldPhone: 'Telepon',
      fieldTimezone: 'Zona waktu',
      fieldCreated: 'Dibuat',
      fieldUpdated: 'Diperbarui',
      fieldVerificationNotes: 'Catatan verifikasi'
    },
    revenueBilling: {
      badge: 'Manajemen Keuangan',
      title: 'Pendapatan & Tagihan',
      subtitle: 'Wawasan keuangan komprehensif, pemrosesan pembayaran, dan manajemen langganan.',
      systemStatus: 'status sistem: optimal',
      downloadReport: 'Unduh Laporan',
      tabs: {
        overview: 'Ringkasan',
        transactions: 'Transaksi',
        invoices: 'Faktur',
        settings: 'Pengaturan'
      },
      cards: {
        totalRevenue: 'Total Pendapatan',
        mrr: 'Pendapatan Berulang Bulanan',
        activeSubscriptions: 'Langganan Aktif',
        pendingInvoices: 'Faktur Tertunda'
      },
      charts: {
        revenueGrowth: {
          title: 'Pertumbuhan Pendapatan',
          subtitle: 'Pendapatan bulanan vs pengeluaran'
        },
        timeRanges: {
          last12Months: '12 Bulan Terakhir',
          last6Months: '6 Bulan Terakhir',
          last30Days: '30 Hari Terakhir'
        },
        legend: {
          revenue: 'Pendapatan',
          expenses: 'Pengeluaran'
        },
        subscriptionTiers: {
          title: 'Tingkat Langganan',
          subtitle: 'Distribusi paket aktif',
          tiers: {
            basic: 'Dasar',
            professional: 'Profesional',
          enterprise: 'Perusahaan'
          }
        }
      },
      transactions: {
        recentTitle: 'Transaksi Terkini',
        viewAll: 'Lihat Semua',
        table: {
          id: 'ID Transaksi',
          entity: 'Entitas',
          typePlan: 'Tipe / Paket',
          amount: 'Jumlah',
          status: 'Status',
          action: 'Aksi'
        },
        status: {
          success: 'Berhasil',
          pending: 'Tertunda',
          failed: 'Gagal'
        }
      },
      invoices: {
        title: 'Faktur',
        subtitle: 'Kelola dan lacak semua faktur',
        createInvoice: 'Buat Faktur',
        loadMore: 'Muat Lebih Banyak',
        table: {
          id: 'ID Faktur',
          client: 'Klien',
          date: 'Tanggal',
          dueDate: 'Jatuh Tempo',
          amount: 'Jumlah',
          status: 'Status',
          action: 'Aksi'
        },
        status: {
          paid: 'Lunas',
          pending: 'Tertunda',
          overdue: 'Terlambat'
        }
      },
      settings: {
        saveChanges: 'Simpan Perubahan',
        general: {
          title: 'Konfigurasi Umum',
          subtitle: 'Kelola preferensi penagihan',
          paymentGateway: 'Gerbang Pembayaran',
          paymentGatewayHint: 'Prosesor pembayaran aktif saat ini.',
          defaultCurrency: 'Mata Uang Default',
          taxRate: 'Tarif Pajak (%)'
        },
        automation: {
          title: 'Otomatisasi',
          subtitle: 'Tugas penagihan otomatis',
          autoGenerate: 'Buat Faktur Otomatis',
          autoGenerateHint: 'Buat faktur secara otomatis saat perpanjangan.',
          reminders: 'Pengingat Pembayaran',
          remindersHint: 'Kirim pengingat email untuk tagihan yang akan datang/terlambat.',
          gatewayStatus: 'Status Gerbang',
          midtransConnection: 'Koneksi Midtrans:',
          active: 'Aktif'
        }
      }
    },
    aiPlatform: {
      badge: 'Platform AI',
      title: 'Platform AI',
      subtitle: 'Pemantauan penggunaan AI, manajemen model, dan operasi machine learning',
      systemStatus: 'Model AI: Aktif',
      settings: 'Pengaturan AI',
      deploy: 'Terapkan Model',
      tabs: {
        overview: 'Ringkasan',
        usage: 'Penggunaan',
        models: 'Model'
      },
      cards: {
        totalRequests: 'Total Permintaan',
        tokenUsage: 'Penggunaan Token',
        avgLatency: 'Rata-rata Latensi',
        errorRate: 'Tingkat Kesalahan'
      },
      charts: {
        usageTrends: {
          title: 'Tren Penggunaan AI',
          subtitle: 'Konsumsi token vs volume permintaan'
        },
        timeRanges: {
          last24Hours: '24 Jam Terakhir',
          last7Days: '7 Hari Terakhir',
          last30Days: '30 Hari Terakhir'
        },
        legend: {
          tokens: 'Token (k)',
          requests: 'Permintaan'
        }
      },
      models: {
        title: 'Kinerja Model',
        subtitle: 'Analisis efisiensi dan biaya per model',
        refresh: 'Segarkan',
        table: {
          modelName: 'Nama Model',
          contextWindow: 'Jendela Konteks',
          costPer1k: 'Biaya / 1k Token',
          requests: 'Permintaan (24j)',
          status: 'Status',
          action: 'Aksi'
        },
        status: {
          operational: 'Operasional',
          degraded: 'Terdegradasi',
          maintenance: 'Pemeliharaan'
        }
      },
      activity: {
        title: 'Aktivitas Terkini',
        viewAll: 'Lihat Semua Log',
        table: {
          timestamp: 'Waktu',
          user: 'Pengguna / Klinik',
          model: 'Model',
          tokens: 'Token',
          status: 'Status'
        },
        status: {
          completed: 'Selesai',
          processing: 'Memproses',
          failed: 'Gagal'
        }
      }
    },
    supportHelpdesk: {
      badge: 'Dukungan & Bantuan',
      title: 'Dukungan & Bantuan',
      subtitle: 'Manajemen dukungan pelanggan, sistem tiket, dan administrasi basis pengetahuan',
      openTickets: 'tiket terbuka',
      newTicket: 'Tiket Baru',
      knowledgeBase: 'Basis Pengetahuan',
      tabs: {
        tickets: 'Tiket',
        liveChat: 'Chat Langsung',
        knowledgeBase: 'Basis Pengetahuan'
      },
      cards: {
        openTickets: 'Tiket Terbuka',
        avgResponseTime: 'Rata-rata Waktu Respon',
        resolutionRate: 'Tingkat Penyelesaian',
        csatScore: 'Skor CSAT'
      },
      charts: {
        ticketVolume: {
          title: 'Volume Tiket',
          subtitle: 'Tiket baru vs diselesaikan dari waktu ke waktu'
        },
        timeRanges: {
          last7Days: '7 Hari Terakhir',
          last30Days: '30 Hari Terakhir',
          last90Days: '90 Hari Terakhir'
        },
        legend: {
          new: 'Tiket Baru',
          resolved: 'Diselesaikan'
        }
      },
      tickets: {
        title: 'Tiket Terkini',
        viewAll: 'Lihat Semua Tiket',
        table: {
          subject: 'Subjek',
          requester: 'Pemohon',
          priority: 'Prioritas',
          status: 'Status',
          time: 'Waktu'
        },
        priority: {
          high: 'Tinggi',
          medium: 'Sedang',
          low: 'Rendah'
        },
        status: {
          open: 'Terbuka',
          inProgress: 'Sedang Proses',
          resolved: 'Diselesaikan',
          closed: 'Ditutup'
        }
      },
      team: {
        title: 'Kinerja Tim',
        subtitle: 'Produktivitas agen dan peringkat kepuasan',
        table: {
          agent: 'Agen',
          resolved: 'Diselesaikan',
          avgTime: 'Rata-rata Waktu',
          rating: 'Peringkat'
        }
      },
      liveChat: {
        sidebarTitle: 'Chat Aktif',
        searchPlaceholder: 'Cari obrolan...',
        typing: 'sedang mengetik...',
        inputPlaceholder: 'Ketik pesan...',
        send: 'Kirim',
        endChat: 'Akhiri Obrolan',
        transfer: 'Alihkan',
        noChatSelected: 'Pilih obrolan untuk memulai pesan'
      },
      knowledgeContent: {
        searchPlaceholder: 'Apa yang bisa kami bantu hari ini?',
        categories: {
          gettingStarted: 'Memulai',
          accountBilling: 'Akun & Tagihan',
          technicalSupport: 'Dukungan Teknis',
          features: 'Fitur & Tutorial'
        },
        popularArticles: 'Artikel Populer',
        viewAll: 'Lihat Semua Artikel'
      }
    },
    systemAdmin: {
      badge: 'Administrasi Sistem',
      title: 'Administrasi Sistem',
      subtitle: 'Konfigurasi platform, manajemen pengguna, dan pemantauan sistem',
      systemHealth: 'Kesehatan Sistem: Optimal',
      systemConfig: 'Konfigurasi Sistem',
      security: 'Keamanan',
      tabs: {
        health: 'Kesehatan Sistem',
        users: 'Manajemen Pengguna',
        audit: 'Log Audit',
        integrations: 'Integrasi'
      },
      health: {
        cpuUsage: 'Penggunaan CPU',
        memoryUsage: 'Penggunaan Memori',
        storageUsage: 'Penyimpanan',
        apiLatency: 'Latensi API',
        services: {
          database: 'Basis Data',
          redis: 'Cache Redis',
          storage: 'Penyimpanan Objek',
          email: 'Layanan Email'
        },
        status: {
          operational: 'Operasional',
          degraded: 'Menurun',
          down: 'Mati'
        }
      },
      users: {
        title: 'Manajemen Pengguna',
        subtitle: 'Kelola akses administratif dan staf',
        addUser: 'Tambah Pengguna',
        table: {
          user: 'Pengguna',
          role: 'Peran',
          status: 'Status',
          lastLogin: 'Login Terakhir',
          actions: 'Tindakan'
        },
        roles: {
          admin: 'Admin Sistem',
          manager: 'Manajer',
          staff: 'Staf',
          support: 'Dukungan'
        },
        status: {
          active: 'Aktif',
          inactive: 'Tidak Aktif',
          suspended: 'Ditangguhkan'
        }
      },
      audit: {
        title: 'Log Audit',
        subtitle: 'Lacak aktivitas sistem dan peristiwa keamanan',
        export: 'Ekspor Log',
        table: {
          action: 'Tindakan',
          user: 'Pengguna',
          ipAddress: 'Alamat IP',
          time: 'Waktu',
          status: 'Status'
        }
      },
      integrations: {
        title: 'Pengaturan Integrasi',
        subtitle: 'Kelola layanan dan koneksi pihak ketiga',
        card: {
          connected: 'Terhubung',
          disconnected: 'Terputus',
          configure: 'Konfigurasi'
        }
      }
    },
    complianceSecurity: {
      badge: 'Kepatuhan & Keamanan',
      title: 'Kepatuhan & Keamanan',
      subtitle: 'Kontrol privasi data, kepatuhan regulasi, dan manajemen audit keamanan',
      securityScore: 'Skor Keamanan',
      securityAudit: 'Audit Keamanan',
      alerts: 'Peringatan',
      tabs: {
        overview: 'Ringkasan Keamanan',
        audit: 'Jejak Audit',
        standards: 'Standar Kepatuhan',
        privacy: 'Privasi Data'
      },
      overview: {
        threatsBlocked: 'Ancaman Diblokir',
        activeAlerts: 'Peringatan Aktif',
        scoreLabel: 'Skor Keamanan Keseluruhan',
        riskLevel: 'Tingkat Risiko',
        low: 'Rendah',
        medium: 'Sedang',
        high: 'Tinggi',
        securityTrend: 'Tren Keamanan',
        deviceHygiene: 'Kesehatan Perangkat',
        compliantDevices: 'Perangkat Patuh',
        nonCompliant: 'Tidak Patuh'
      },
      audit: {
        title: 'Jejak Audit Keamanan',
        subtitle: 'Log rinci peristiwa terkait keamanan dan akses',
        table: {
          event: 'Peristiwa',
          actor: 'Aktor',
          resource: 'Sumber Daya',
          severity: 'Keparahan',
          time: 'Waktu',
          details: 'Detail'
        },
        filters: {
          all: 'Semua Peristiwa',
          high: 'Keparahan Tinggi',
          medium: 'Keparahan Sedang',
          low: 'Keparahan Rendah'
        }
      },
      standards: {
        title: 'Standar Kepatuhan',
        subtitle: 'Status kerangka kerja kepatuhan regulasi',
        controls: 'Kontrol Diterapkan',
        nextAudit: 'Audit Berikutnya',
        days: 'hari',
        evidenceLocker: 'Loker Bukti',
        status: {
          passed: 'Tersertifikasi',
          failed: 'Tidak Patuh',
          pending: 'Sedang Berjalan'
        }
      },
      privacy: {
        title: 'Pengaturan Privasi Data',
        subtitle: 'Kelola retensi data, enkripsi, dan hak subjek',
        export: 'Ekspor Data Pribadi',
        forget: 'Hak untuk Dilupakan',
        consentLog: 'Log Persetujuan',
        optIn: 'Setuju',
        optOut: 'Tidak setuju',
        groups: {
          patient: 'Data Pasien',
          employee: 'Data Karyawan',
          system: 'Data Sistem'
        },
        settings: {
          retention: 'Kebijakan Retensi Data',
          encryption: 'Enkripsi saat Istirahat',
          anonymization: 'Anonimisasi Data',
          consent: 'Manajemen Persetujuan',
          accessControl: 'Kontrol Akses Ketat',
          auditLogging: 'Log Audit Komprehensif'
        }
      }
    },
    partnerships: {
      badge: 'Ekosistem Kemitraan',
      title: 'Kemitraan',
      subtitle: 'Direktori mitra, manajemen API, dan pengawasan integrasi',
      tabs: {
        overview: 'Vital Ekosistem',
        directory: 'Registri Mitra',
        agreements: 'Perjanjian',
        integrations: 'Detak Integrasi'
      },
      overview: {
        activePartners: 'Mitra Aktif',
        apiCalls: 'Panggilan API (24j)',
        revenueShare: 'Bagi Hasil',
        growthVitals: 'Vital Pertumbuhan',
        recentActivity: 'Catatan Klinis',
        health: {
          healthy: 'Sehat',
          critical: 'Kritis',
          stable: 'Stabil'
        }
      },
      directory: {
        title: 'Registri Mitra',
        subtitle: 'Mitra dan klinik ekosistem terotorisasi',
        tier: {
          gold: 'Spesialis (Gold)',
          silver: 'Praktisi (Silver)',
          bronze: 'Residen (Bronze)'
        },
        status: {
          online: 'Online',
          offline: 'Offline',
          maintenance: 'Pemeliharaan'
        }
      },
      agreements: {
        title: 'Siklus Perjanjian',
        subtitle: 'Manajemen kontrak dan pelacakan pembaruan',
        stages: {
          triage: 'Triase (Prospek)',
          diagnosis: 'Diagnosis (Negosiasi)',
          treatment: 'Perawatan (Aktif)',
          recovery: 'Pemulihan (Pembaruan)'
        }
      },
      integrations: {
        title: 'Detak Integrasi',
        subtitle: 'Kesehatan API dan pemantauan koneksi real-time',
        latency: 'Latensi',
        uptime: 'Uptime',
        requests: 'Permintaan/menit'
      }
    },
    contentManagement: {
      badge: 'Pusat Konten',
      title: 'Manajemen Konten',
      subtitle: 'Materi pemasaran, sumber edukasi, dan pustaka konten',
      overview: {
        activeArticles: 'Artikel Aktif',
        totalViews: 'Total Dilihat',
        avgReadTime: 'Rata-rata Waktu Baca',
        engagementVitals: 'Vital Keterlibatan',
        clinicalNotes: 'Pembaruan Konten'
      },
      status: {
        published: 'Pulang (Diterbitkan)',
        review: 'Diagnosis (Review)',
        draft: 'Triase (Draf)',
        observation: 'Observasi'
      },
      workflow: {
        draft: 'Draf (Triase)',
        review: 'Review Klinis',
        approval: 'Persetujuan Akhir',
        published: 'Diterbitkan (Pulang)'
      }
    }
  },
  clinic: {
    sidebar: {
      publicProfile: 'Profil Publik',
      descriptions: {
        publicProfile: 'Layanan, Galeri & Fasilitas'
      }
    },
    teledentistry: {
      title: 'Teledentistry',
      subtitle: 'Pemantauan sesi, ringkasan final, dan audit teledentistry tingkat klinik.',
      liveCount: 'Live',
      date: {
        today: 'Hari ini',
        tomorrow: 'Besok',
        yesterday: 'Kemarin'
      },
      tabs: {
        live: 'Sesi Live',
        history: 'Riwayat Sesi',
        audit: 'Log Audit'
      },
      accessDenied: 'Role klinik ini hanya dapat melihat status appointment. Akses teledentistry memerlukan clinic owner atau clinic admin.',
      adminLimitedAccess: 'Anda memiliki akses riwayat dan ringkasan sesuai policy klinik. Pemantauan live hanya tersedia untuk clinic owner.',
      empty: {
        liveTitle: 'Belum ada sesi aktif',
        liveDescription: 'Tidak ada sesi teledentistry aktif.',
        historyTitle: 'Belum ada riwayat sesi',
        historyDescription: 'Tidak ada riwayat sesi pada tanggal ini.',
        auditTitle: 'Audit log kosong',
        auditDescription: 'Tidak ada audit event.'
      },
      actions: {
        viewSummary: 'Lihat Ringkasan',
        viewChat: 'Riwayat Chat',
        observe: 'Pantau',
        refreshAudit: 'Segarkan Audit',
        close: 'Tutup'
      },
      filters: {
        eventType: 'Filter jenis event'
      },
      labels: {
        summary: 'Ringkasan',
        activeParticipants: 'Participant aktif',
        observer: 'Observer',
        duration: 'Durasi',
        appointment: 'Janji temu',
        quality: 'Kualitas',
        localChatMessages: 'chat_messages lokal'
      },
      statuses: {
        live: 'Live',
        waiting: 'Menunggu',
        completed: 'Selesai',
        ended: 'Berakhir',
        unknown: 'Tidak diketahui'
      },
      summaryStatuses: {
        finalized: 'Final',
        amended: 'Diamendemen',
        draft: 'Draft',
        pending: 'Menunggu'
      },
      roles: {
        dentist: 'Dokter',
        patient: 'Pasien',
        guardian: 'Wali',
        interpreter: 'Interpreter',
        assistant: 'Asisten',
        observer: 'Observer Klinik',
        participant: 'Participant',
        system: 'system'
      },
      categories: {
        session: 'Sesi',
        observer: 'Observer',
        security: 'Keamanan',
        chat: 'Chat',
        summary: 'Ringkasan',
        attachment: 'Attachment',
        system: 'Sistem'
      },
      summaryDrawer: {
        title: 'Ringkasan Klinis',
        patientFallback: 'Pasien',
        closeAria: 'Tutup ringkasan',
        loading: 'Memuat ringkasan...',
        unavailable: 'Ringkasan belum final atau isi klinis tidak tersedia untuk role klinik ini.',
        chiefComplaint: 'Keluhan utama',
        objectiveFindings: 'Temuan objektif',
        assessment: 'Assessment',
        plan: 'Rencana tindakan',
        recommendations: 'Rekomendasi lanjutan',
        followUp: 'Follow-up',
        followUpYes: 'Ya',
        followUpNo: 'Tidak'
      },
      messagesDrawer: {
        title: 'Riwayat Chat Konsultasi',
        closeAria: 'Tutup riwayat chat',
        policyCopy: 'Pemilik klinik dapat meninjau arsip chat lokal untuk kepatuhan. Unduhan lampiran tidak tersedia di mode tinjauan klinik.',
        loading: 'Memuat riwayat chat...',
        empty: 'Belum ada pesan chat yang tersinkron ke arsip lokal.',
        attachmentFallback: 'Attachment',
        attachmentStored: 'Attachment tersimpan, tetapi download dinonaktifkan untuk review klinik.',
        attachmentUnavailable: 'Attachment tidak tersedia ({{reason}}).',
        unavailableReason: 'expired/deleted'
      },
      observer: {
        title: 'Mode Pemantauan Klinik',
        appointmentMeta: 'Janji temu #{{appointmentId}} · pemantauan sesi teledentistry',
        policyCopy: 'Observer terhubung tanpa camera/mic. Penyalahgunaan token diaudit dan dapat memicu disconnect.',
        connecting: 'Menghubungkan observer ke room...',
        connectedWaiting: 'Terhubung sebagai observer. Menunggu video participant.',
        reconnecting: 'Koneksi terputus, mencoba menyambungkan ulang...',
        disconnected: 'Sesi telah berakhir atau koneksi observer terputus.',
        roomEnded: 'Sesi telah berakhir. Observer tidak dapat bergabung lagi.',
        openFailed: 'Gagal membuka observer room.'
      },
      errors: {
        auditFailed: 'Gagal memuat audit log teledentistry. Silakan coba lagi.',
        sessionsFailed: 'Gagal memuat sesi teledentistry klinik.',
        summaryFailed: 'Gagal memuat ringkasan klinis.',
        messagesFailed: 'Gagal memuat riwayat chat konsultasi.',
        forbidden: 'Akses teledentistry tidak diizinkan untuk akun ini.',
        appointmentNotFound: 'Janji temu tidak ditemukan.'
      }
    },
    billing: {
      title: 'Billing & Asuransi',
      subtitle: 'Kelola invoice, pembayaran, dan klaim asuransi',
      tabs: {
        invoices: 'Invoice',
        payments: 'Pembayaran',
        claims: 'Klaim Asuransi',
        promos: 'Promo & Paket'
      },
      payments: {
        title: 'Riwayat Pembayaran',
        searchPlaceholder: 'Cari pembayaran...',
        allMethods: 'Semua Metode',
        recordPayment: 'Catat Pembayaran',
        stats: {
          total: 'Total Pembayaran',
          completed: 'Selesai',
          pending: 'Menunggu',
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
      }
    },
    publicProfile: {
      badge: 'Profil Publik',
      title: 'Profil Publik Klinik',
      subtitle: 'Kelola tampilan klinik Anda di aplikasi mobile Serene.',
      actions: {
        preview: 'Pratinjau tampilan mobile',
        refresh: 'Segarkan konten'
      },
      tabs: {
        services: 'Layanan & Harga',
        gallery: 'Galeri & Foto',
        highlights: 'Keunggulan',
        facilities: 'Fasilitas'
      },
      tabDescriptions: {
        services: 'Perbarui layanan, harga, dan ketersediaan yang terlihat oleh pasien.',
        gallery: 'Atur gambar utama dan foto galeri.',
        highlights: 'Promosikan keunggulan dan pengalaman unik klinik.',
        facilities: 'Tampilkan fasilitas dan peralatan yang tersedia.'
      }
    },
    staff: {
      // Existing translations
      badge: 'Manajemen Staf',
      title: 'Manajemen Staf',
      subtitle: 'Kelola tim klinik, peran, dan penempatan cabang',
      totalStaff: 'total staf',

      // Multi-branch extensions
      branches: {
        title: 'Penempatan Cabang',
        allBranches: 'Semua Cabang',
        unassigned: 'Belum Ditempatkan',
        assignToBranch: 'Tempatkan di Cabang',
        currentBranch: 'Cabang Saat Ini',
        branchInfo: 'Informasi Cabang',
        moveStaff: 'Pindah Staf',
        filterByBranch: 'Filter berdasarkan Cabang'
      },

      // Table columns
      table: {
        staff: 'Staf',
        contact: 'Kontak',
        role: 'Peran',
        branch: 'Cabang',
        status: 'Status',
        actions: 'Aksi'
      },

      // Actions
      actions: {
        addStaff: 'Tambah Staf',
        viewProfile: 'Lihat Profil',
        editRole: 'Edit Peran',
        changeBranch: 'Ubah Cabang',
        remove: 'Hapus'
      },

      // Modals
      modals: {
        invite: {
          badge: 'Undang Staf',
          title: 'Undang Anggota Staf Baru',
          subtitle: 'Tambahkan anggota tim baru ke klinik Anda',
          fields: {
            name: 'Nama Lengkap',
            email: 'Alamat Email',
            password: 'Kata Sandi',
            role: 'Peran',
            position: 'Posisi',
            department: 'Departemen',
            branch: 'Penempatan Cabang'
          },
          placeholders: {
            name: 'Masukkan nama lengkap',
            email: 'Masukkan alamat email',
            password: 'Masukkan kata sandi sementara',
            position: 'Masukkan posisi (opsional)',
            department: 'Masukkan departemen (opsional)',
            branch: 'Pilih penempatan cabang'
          },
          hints: {
            password: 'Minimal 6 karakter. Staf dapat mengubah kata sandi setelah login pertama.',
            branch: 'Staf akan ditempatkan untuk bekerja di lokasi cabang ini.'
          },
          actions: {
            cancel: 'Batal',
            submit: 'Kirim Undangan',
            sending: 'Mengirim...'
          }
        },

        changeBranch: {
          title: 'Ubah Penempatan Cabang',
          subtitle: 'Pindahkan anggota staff ke cabang yang berbeda',
          currentBranch: 'Cabang Saat Ini',
          newBranch: 'Cabang Baru',
          reason: 'Alasan Pemindahan',
          actions: {
            cancel: 'Batal',
            confirm: 'Ubah Cabang',
            changing: 'Memproses...'
          }
        }
      },

      // Branch info
      branchInfo: {
        mainBranch: 'Cabang Utama',
        address: 'Alamat',
        phone: 'Telepon',
        facilities: 'Fasilitas',
        operatingHours: 'Jam Operasional',
        treatmentRooms: 'Ruang Perawatan',
        sterilization: 'Sterilisasi',
        radiography: 'Radiografi'
      },

      // Status and labels
      status: {
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        onLeave: 'Cuti'
      },

      roles: {
        owner: 'Pemilik',
        manager: 'Manajer',
        dentist: 'Dokter Gigi',
        nurse: 'Perawat',
        receptionist: 'Resepsionis',
        admin: 'Admin'
      }
    },
    reports: {
      title: 'Laporan & KPI',
      subtitle: 'Analitik, performa, dan business intelligence',
      tabs: {
        operational: 'Operasional',
        financial: 'Keuangan',
        compliance: 'Kepatuhan',
        marketing: 'Pemasaran'
      },
      operational: {
        roomUtilization: 'Keterisian Ruang',
        avgWaitTime: 'Rata-rata Waktu Tunggu',
        satisfaction: 'Kepuasan Pasien',
        completionRate: 'Rasio Penyelesaian',
        appointmentStats: 'Statistik Janji Mingguan',
        roomUsage: 'Penggunaan Ruang',
        treatmentDistribution: 'Distribusi Tindakan',
        staffPerformance: 'Performa Staf'
      },
      financial: {
        totalRevenue: 'Total Pendapatan',
        treatmentRevenue: 'Pendapatan per Tindakan',
        expenses: 'Pengeluaran',
        profitMargin: 'Margin Profit',
        cashPayments: 'Pembayaran Tunai',
        paymentMethods: 'Metode Pembayaran',
        outstandingInvoices: 'Faktur Tertunggak',
        outstandingList: 'Daftar Faktur Tertunggak',
        monthlyTrend: 'Tren Pendapatan Bulanan'
      },
      compliance: {
        overallScore: 'Skor Kepatuhan',
        dataPrivacy: 'Privasi Data',
        consentForms: 'Form Persetujuan',
        recordKeeping: 'Pencatatan',
        security: 'Keamanan Sistem',
        consentStatus: 'Status Persetujuan',
        auditLogs: 'Log Audit',
        dataBackups: 'Cadangan Data',
        privacyRequirements: 'Kebutuhan Privasi',
        securityIncidents: 'Insiden Keamanan'
      },
      marketing: {
        newPatients: 'Pasien Baru',
        campaignPerformance: 'Performa Kampanye',
        acquisitionSources: 'Sumber Akuisisi',
        referralRate: 'Rasio Rujukan',
        recallProgram: 'Program Kunjungan Ulang',
        recallSuccess: 'Keberhasilan Kunjungan Ulang',
        topReferrers: 'Pengirim Rujukan Teratas',
        socialMedia: 'Performa Media Sosial',
        activeCampaigns: 'Kampanye Aktif',
        contentPerformance: 'Performa Konten',
        campaignROI: 'ROI Kampanye'
      }
    }
  },
  notifications: {
    common: {
      notifications: 'Notifikasi',
      markAllRead: 'Tandai semua dibaca',
      markAsRead: 'Tandai dibaca',
      settings: 'Pengaturan notifikasi',
      preferences: 'Preferensi notifikasi',
      focusMode: 'Mode fokus',
      new: 'Baru',
      priority: 'Prioritas',
      emptyTitle: 'Tidak ada notifikasi',
      emptyDescription: 'Semua aman. Kami akan memberi tahu saat ada update baru.',
      updatedAt: 'Diperbarui {{time}}',
      asOf: 'Hingga {{time}}',
      updatesCount: '{{count}} update',
      notificationsCount: '{{count}} notifikasi'
    },
    filters: {
      all: 'Semua',
      network: 'Jaringan',
      billing: 'Pendapatan & Penagihan',
      ai: 'Platform AI',
      support: 'Dukungan',
      compliance: 'Kepatuhan',
      analytics: 'Analitik',
      partnership: 'Kemitraan',
      schedule: 'Jadwal & Antrean',
      patient: 'Pasien',
      operations: 'Operasional',
      marketing: 'Pengalaman',
      appointments: 'Jadwal',
      teledentistry: 'Teledentistry',
      clinical: 'Klinis',
      business: 'Keuangan',
      security: 'Keamanan'
    },
    admin: {
      title: 'Pusat Kontrol Admin',
      subtitle: 'Pantau onboarding, sinyal pendapatan, dan alert kepatuhan secara real-time.',
      stats: {
        totalLabel: 'Total sinyal',
        totalDescription: 'Seluruh touchpoint admin',
        unreadLabel: 'Notifikasi belum dibaca',
        unreadMeta: 'Butuh review',
        unreadDescription: '{{count}} perlu aksi dalam 4 jam',
        criticalLabel: 'Workflow kritis',
        criticalMeta: 'Prioritas tinggi',
        criticalDescription: 'Diekalasi ke tim ops & compliance'
      },
      sections: {
        insights: 'Sinyal',
        escalations: 'Eskalasi',
        playbooks: 'Playbook'
      },
      labels: {
        escalated: 'Diekalasi'
      }
    },
    clinic: {
      title: 'Pusat Notifikasi Klinik',
      subtitle: 'Sinyal antrean, pasien, dan operasional untuk seluruh cabang.',
      stats: {
        totalLabel: 'Pembaruan hari ini',
        totalDescription: 'Gabungan jadwal, pasien, dan billing',
        unreadLabel: 'Belum dibaca',
        unreadMeta: 'Butuh perhatian',
        unreadDescription: 'Termasuk antrean & klaim prioritas',
        opsLabel: 'Tugas operasional',
        opsMeta: 'Operasional & inventori',
        opsDescription: 'Pastikan sterilisasi dan stok aman'
      },
      sections: {
        insights: 'WAWASAN',
        alerts: 'Alert Operasional',
        playbooks: 'PANDUAN'
      },
      emptyTitle: 'Tidak ada update',
      emptyDescription: 'Area ini aman. Sistem akan memberi tahu saat ada perubahan.'
    },
    dentist: {
      title: 'Pusat Notifikasi Dokter Gigi',
      subtitle: 'Sinkronkan jadwal, konsultasi virtual, dan insight klinis di satu tempat.',
      stats: {
        totalLabel: 'Total sinyal',
        totalMeta: '24 jam terakhir',
        totalDescription: 'Termasuk jadwal & klinis',
        unreadLabel: 'Belum dibaca',
        unreadMeta: 'Perlu aksi',
        unreadDescription: 'Teledentistry & peringatan AI',
        clinicalLabel: 'Tugas klinis',
        clinicalMeta: 'Perlu review',
        clinicalDescription: 'Kasus lab, insight AI, consent'
      },
      sections: {
        insights: 'WAWASAN',
        alerts: 'Item Prioritas',
        playbooks: 'PANDUAN'
      },
      emptyTitle: 'Tidak ada notifikasi',
      emptyDescription: 'Semua aman. Kami akan memberi tahu jika ada update baru.'
    }
  },
  settings: {
    title: 'Pengaturan',
    profile: 'Profil',
    billing: 'AI & Penagihan',
    practice: 'Praktik',
    security: 'Keamanan',
    preferences: 'Preferensi',
    personalInformation: 'Informasi Pribadi',
    personalPreferences: 'Preferensi Pribadi',
    managePersonalProfessional: 'Kelola informasi pribadi dan profesional Anda.',
    profileSettings: 'Pengaturan Profil',
    name: 'Nama Lengkap',
    enterFullName: 'Masukkan nama lengkap',
    notFilledYet: 'Belum diisi',
    uploading: 'Mengunggah...',
    uploadImage: 'Unggah Foto',
    preferencesSettings: 'Tampilan & Preferensi',
    preferencesSaved: 'Preferensi berhasil disimpan!',
    resetPreferencesConfirm: 'Kembalikan preferensi ke setelan awal?',
    themeDisplay: 'Tampilan & Tema',
    theme: 'Tema',
    light: 'Terang',
    dark: 'Gelap',
    system: 'Sistem',
    language: 'Bahasa',
    english: 'Inggris',
    indonesian: 'Indonesia',
    fontSize: 'Ukuran Huruf',
    small: 'Kecil',
    large: 'Besar',
    timezone: 'Zona Waktu',
    dateFormat: 'Format Tanggal',
    timeFormat: 'Format Waktu',
    currency: 'Mata Uang',
    notifications: 'Notifikasi',
    emailNotifications: 'Notifikasi email',
    emailNotificationsDesc: 'Terima kwitansi, peringatan billing, dan pembaruan pasien baru.',
    pushNotifications: 'Notifikasi push',
    pushNotificationsDesc: 'Tampilkan peringatan di perangkat ini untuk janji temu dan tugas penting.',
    appointmentReminders: 'Pengingat janji',
    appointmentRemindersDesc: 'Kirim pengingat kepada pasien sebelum kunjungannya.',
    marketingEmails: 'Email marketing',
    marketingEmailsDesc: 'Dapatkan tips produk, kampanye, dan info fitur baru.',
    systemUpdates: 'Pembaruan sistem',
    systemUpdatesDesc: 'Beritahu saya tentang downtime, rilis, dan informasi keamanan.',
    reminderSound: 'Suara pengingat',
    reminderSoundDesc: 'Putar suara untuk tugas dan janji yang akan datang.',
    reduceMotion: 'Kurangi animasi',
    reduceMotionDesc: 'Batasi animasi antarmuka agar lebih nyaman.',
    autoSave: 'Simpan otomatis',
    autoSaveDesc: 'Simpan perubahan secara otomatis ketika mengedit.',
    showTips: 'Tampilkan tips produk',
    showTipsDesc: 'Perlihatkan saran kontekstual di dalam aplikasi.',
    dataSharing: 'Bagikan data penggunaan',
    dataSharingDesc: 'Izinkan analitik anonim untuk membantu meningkatkan produk.',
    analytics: 'Ikut serta analitik AI',
    analyticsDesc: 'Bantu tingkatkan akurasi AI dengan data agregat.',
    privacy: 'Privasi',
    profileVisibility: 'Visibilitas profil',
    public: 'Publik',
    limited: 'Terbatas',
    private: 'Privat'
  },
  dentist: {
    settings: {
      badge: 'Pengaturan Akun',
      subtitle: 'Kelola profil, AI billing, dan pengaturan praktik Anda'
    }
  },
  dentistPatient: {
    common: {
      noPatientSelected: 'Belum ada pasien dipilih',
      cancel: 'Batal',
      add: 'Tambah',
      viewMode: 'Mode Lihat',
      editMode: 'Mode Ubah',
      export: 'Ekspor Riwayat',
      notProvided: 'Belum diisi',
      minutes: '{{minutes}} menit'
    },
    tabs: {
      profile: 'Profil',
      aiResults: 'Hasil AI',
      appointments: 'Janji',
      medicalHistory: 'Riwayat Medis',
      treatmentPlan: 'Rencana Perawatan',
      billing: 'Penagihan',
      communication: 'Komunikasi'
    },
    emptyState: {
      title: 'Pilih Pasien',
      subtitle: 'Pilih pasien dari daftar untuk melihat detailnya'
    },
    header: {
      tagline: 'Sistem Manajemen Pasien',
      title: 'Manajemen Pasien',
      subtitle: 'Platform terintegrasi untuk perawatan dan manajemen klinis',
      actions: {
        addPatient: 'Tambah Pasien'
      },
      stats: {
        totalPatients: 'Total Pasien',
        activePatients: 'Pasien Aktif',
        todaysAppointments: 'Janji Hari Ini',
        aiAnalyzed: 'Pasien dianalisis AI'
      }
    },
    addPatient: {
      title: 'Tambah Pasien Baru',
      sections: {
        personalInfo: 'Informasi Pribadi',
        schedule: 'Jadwalkan Janji Pertama'
      },
      fields: {
        name: 'Nama Lengkap *',
        phone: 'Nomor Telepon *',
        email: 'Alamat Email *',
        age: 'Usia *',
        gender: 'Jenis Kelamin *',
        appointmentDate: 'Tanggal *',
        appointmentTime: 'Waktu *',
        appointmentType: 'Jenis Janji',
        notes: 'Catatan'
      },
      placeholders: {
        name: 'Masukkan nama lengkap pasien',
        phone: '+62-xxx-xxxx-xxxx',
        email: 'pasien@email.com',
        age: '25',
        notes: 'Catatan tambahan untuk pasien atau janji...'
      },
      genderOptions: {
        placeholder: 'Pilih jenis kelamin',
        male: 'Laki-laki',
        female: 'Perempuan'
      },
      appointmentTypes: {
        consultation: 'Konsultasi',
        checkup: 'Pemeriksaan Rutin',
        cleaning: 'Pembersihan',
        treatment: 'Perawatan',
        emergency: 'Darurat'
      },
      actions: {
        cancel: 'Batal',
        submit: 'Tambah Pasien & Jadwalkan',
        submitting: 'Menyimpan...'
      },
      validation: {
        nameRequired: 'Nama wajib diisi',
        phoneRequired: 'Nomor telepon wajib diisi',
        emailRequired: 'Email wajib diisi',
        ageRequired: 'Usia harus valid',
        genderRequired: 'Jenis kelamin wajib diisi',
        dateRequired: 'Tanggal janji wajib diisi',
        timeRequired: 'Waktu janji wajib diisi',
        submitFailed: 'Gagal menambahkan pasien. Silakan coba lagi.'
      }
    },
    ai: {
      deepDental: {
        workspace: {
          title: 'Ruang Kasus',
          open: 'Buka ruang kasus',
          close: 'Tutup ruang kasus',
          short: 'Ruang Kasus',
          header: {
            title: 'Ruang Kasus Terverifikasi',
            description: 'Buat kasus klinis untuk melampirkan gambar, temuan, ekspor, dan acara linimasa.',
            caseId: 'Kasus {{id}}'
          },
          actions: {
            refresh: 'Segarkan',
            createCase: 'Buat kasus'
          },
          tabs: {
            case: 'Kasus',
            findings: 'Temuan',
            audit: 'Audit',
            export: 'Ekspor',
            timeline: 'Linimasa'
          },
          imageUpload: {
            title: 'Unggah kasus multi-gambar',
            subtitle: 'Lampirkan semua gambar diagnostik ke satu kasus klinis.',
            imageCount: 'gambar',
            dropZone: 'Lepaskan gambar gigi di sini',
            fileFormats: 'JPG, PNG, WebP, HEIC. Beberapa file didukung.',
            selectButton: 'Pilih gambar',
            locked: 'Gambar terkunci setelah verifikasi klinisi.'
          },
          analysis: {
            title: 'Analisis berbantu AI',
            subtitle: 'Jalankan hanya setelah prapemeriksaan kualitas per-gambar.',
            button: 'Analisis gambar yang memenuhi syarat ({{count}})'
          },
          findings: {
            title: 'Temuan klinisi',
            subtitle: 'Tinjau saran AI secara terpisah dari temuan klinisi final.',
            manualFinding: 'Temuan manual',
            aiSuggestion: 'Saran AI',
            noAI: 'Belum ada saran AI.',
            confirmed: 'Dikonfirmasi klinisi',
            noConfirmed: 'Belum ada temuan klinisi yang dikonfirmasi.',
            verifyCase: 'Verifikasi kasus'
          },
          audit: {
            title: 'Jejak audit',
            subtitle: 'Tindakan klinis yang tidak dapat diubah dan hanya dapat dibaca.',
            empty: 'Belum ada acara audit.'
          },
          export: {
            title: 'Ekspor kasus',
            subtitle: 'Hasilkan laporan PDF atau JSON yang dapat diaudit.',
            redact: 'Redaksi pengenal pasien dalam muatan ekspor jika didukung',
            blocked: 'Tautkan pasien dan verifikasi kasus sebelum ekspor.',
            pdfButton: 'PDF',
            jsonButton: 'JSON',
            draftLabel: 'DRAF - BELUM DIVERIFIKASI KLINISI'
          },
          timeline: {
            title: 'Linimasa pasien',
            subtitle: 'Batu loncatan kasus yang terkait dengan perawatan longitudinal.',
            unlinked: 'Belum ada pasien yang ditautkan.',
            linkPatient: 'Tautkan pasien',
            empty: 'Belum ada acara linimasa.',
            images: 'gambar',
            session: 'Sesi',
            reportLinked: 'Laporan tertaut'
          }
        }
      },
      empty: {
        title: 'Belum Ada Analisis AI',
        description: 'Pasien ini belum menggunakan fitur diagnostik AI.'
      },
      header: {
        title: 'Hasil Diagnostik AI',
        count: '{{count}} hasil tersedia'
      },
      controls: {
        select: 'Pilih Analisis'
      },
      summary: {
        analysisDate: 'Tanggal Analisis',
        confidence: 'Tingkat Keyakinan',
        risk: 'Tingkat Risiko'
      },
      tabs: {
        summary: 'Ringkasan',
        diagnosis: 'Diagnosa',
        symptoms: 'Gejala',
        recommendations: 'Rekomendasi',
        images: 'Gambar'
      },
      diagnosis: {
        title: 'Diagnosa AI',
        probability: 'probabilitas'
      },
      symptoms: {
        title: 'Gejala yang Dilaporkan',
        severity: 'Tingkat keparahan: {{severity}}'
      },
      recommendations: {
        title: 'Rekomendasi AI'
      },
        title: 'Ringkasan Analisis',
        analysisDate: 'Tanggal Analisis',
        confidence: 'Tingkat Keyakinan',
        risk: 'Tingkat Risiko',
      },
      images: {
        title: 'Gambar Analisis',
        empty: 'Belum ada gambar untuk analisis ini'
      },
      riskLevels: {
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah',
        unknown: 'Tidak diketahui'
      },
      severityLevels: {
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah',
        severe: 'Berat',
        moderate: 'Sedang',
        mild: 'Ringan',
        unknown: 'Tidak diketahui'
      },
      urgencyLevels: {
        immediate: 'Segera',
        soon: 'Dalam waktu dekat',
        normal: 'Normal',
        unknown: 'Tidak diketahui'
      },
      footer: {
        performedOn: 'Analisis AI dilakukan pada {{date}}',
        export: 'Ekspor Laporan',
        share: 'Bagikan ke Pasien',
        askAI: 'Tanya AI',
        closeChat: 'Tutup Chat'
      },
      chat: {
        title: 'Tanya AI tentang Hasil Ini',
        empty: 'Belum ada riwayat chat untuk analisis ini.',
        placeholder: 'Tanya AI tentang hasil ini...',
        send: 'Kirim',
        loading: 'Memuat...'
      }
    },
    appointments: {
      title: 'Janji',
      actions: {
        scheduleNew: 'Jadwalkan Baru',
        reschedule: 'Jadwal Ulang',
        start: 'Mulai',
        cancel: 'Batalkan',
        complete: 'Selesai',
        viewDetails: 'Lihat Detail',
        scheduleFirst: 'Jadwalkan Janji Pertama',
        sendReminder: 'Kirim Pengingat'
      },
      summary: {
        total: 'Total',
        upcoming: 'Akan Datang',
        completed: 'Selesai',
        cancelled: 'Dibatalkan'
      },
      filters: {
        label: 'Filter berdasarkan status:',
        all: 'Semua Janji'
      },
      statuses: {
        scheduled: 'Terjadwal',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        noShow: 'Tidak Hadir',
        inProgress: 'Sedang Berlangsung',
        unknown: 'Tidak diketahui'
      },
      history: {
        title: 'Riwayat Janji ({{count}})',
        treatment: 'Ringkasan Perawatan',
        followUp: 'Perlu tindak lanjut'
      },
      empty: {
        title: 'Belum Ada Janji',
        noAppointments: 'Pasien ini belum memiliki janji.',
        noFilterMatches: 'Tidak ada janji {{status}} yang ditemukan.'
      },
      next: {
        title: 'Janji Berikutnya'
      },
      labels: {
        duration: '{{minutes}} menit'
      }
    },
    billing: {
      title: 'Penagihan & Pembayaran',
      actions: {
        createInvoice: 'Buat Tagihan',
        sendStatement: 'Kirim Pernyataan',
        createNewInvoice: 'Tagihan Baru',
        view: 'Lihat',
        markPaid: 'Tandai Lunas',
        receipt: 'Kuitansi'
      },
      summary: {
        totalBalance: 'Total Tagihan',
        paidAmount: 'Telah Dibayar',
        pending: 'Tertunda',
        paymentRate: 'Rasio Pembayaran'
      },
      insurance: {
        title: 'Informasi Asuransi',
        provider: 'Penyedia:',
        policy: 'No. Polis:',
        coverage: 'Pertanggungan:',
        deductible: 'Deductible Terpenuhi:'
      },
      tabs: {
        overview: 'Ringkasan',
        invoices: 'Tagihan',
        payments: 'Riwayat Pembayaran',
        insurance: 'Klaim Asuransi'
      },
      overview: {
        accountSummary: 'Ringkasan Akun',
        recentActivity: 'Aktivitas Terbaru',
        paymentReceived: 'Pembayaran Diterima',
        outstandingTitle: 'Tagihan Tertunda',
        outstandingDescription: 'Pembayaran masih menunggu untuk tagihan tertentu'
      },
      invoices: {
        title: 'Tagihan',
        treatments: 'Tindakan:',
        issued: 'Diterbitkan: {{date}}',
        due: 'Jatuh tempo: {{date}}',
        paid: 'Dibayar: {{date}}'
      },
      payments: {
        title: 'Riwayat Pembayaran',
        paymentFor: 'Pembayaran untuk {{invoice}}',
        empty: 'Belum ada riwayat pembayaran'
      },
      insuranceClaims: {
        title: 'Klaim Asuransi',
        empty: 'Fitur klaim asuransi segera hadir'
      },
      invoiceStatuses: {
        paid: 'Lunas',
        pending: 'Tertunda',
        overdue: 'Terlambat',
        cancelled: 'Dibatalkan',
        unknown: 'Tidak diketahui'
      },
      paymentStatuses: {
        completed: 'Selesai',
        pending: 'Tertunda',
        failed: 'Gagal',
        delivered: 'Terkirim',
        sent: 'Terkirim',
        received: 'Diterima'
      }
    },
    communication: {
      title: 'Komunikasi Pasien',
      actions: {
        scheduleCall: '📞 Jadwalkan Panggilan',
        sendSms: '📱 Kirim SMS'
      },
      contact: {
        primaryEmail: 'Email Utama',
        phoneNumber: 'Nomor Telepon',
        preferred: 'Kontak Favorit',
        defaultPreferred: 'Email'
      },
      quickActions: 'Aksi Cepat',
      templates: {
        appointment_reminder: {
          name: 'Pengingat Janji',
          subject: 'Pengingat Janji Mendatang',
          content: 'Ini adalah pengingat untuk janji Anda pada {date} pukul {time}. Harap tiba 15 menit lebih awal.'
        },
        treatment_followup: {
          name: 'Tindak Lanjut Perawatan',
          subject: 'Bagaimana kondisi Anda setelah perawatan?',
          content: 'Semoga pemulihan Anda berjalan baik setelah perawatan kemarin. Silakan hubungi kami jika ada pertanyaan atau keluhan.'
        },
        payment_reminder: {
          name: 'Pengingat Pembayaran',
          subject: 'Pemberitahuan Jatuh Tempo Pembayaran',
          content: 'Ini pengingat bahwa pembayaran sebesar {amount} untuk tagihan #{invoice} jatuh tempo pada {due_date}.'
        },
        annual_checkup: {
          name: 'Pemeriksaan Tahunan',
          subject: 'Saatnya Pemeriksaan Gigi Tahunan Anda',
          content: 'Sudah satu tahun sejak kunjungan terakhir Anda. Pemeriksaan rutin penting untuk menjaga kesehatan gigi dan mulut.'
        }
      },
      sendMessage: {
        title: 'Kirim Pesan',
        templateLabel: 'Template Pesan (Opsional)',
        templatePlaceholder: 'Pilih template...',
        contentLabel: 'Isi Pesan',
        contentPlaceholder: 'Tulis pesan Anda di sini...',
        clear: 'Bersihkan',
        submit: 'Kirim Pesan'
      },
      history: {
        title: 'Riwayat Komunikasi',
        duration: 'Durasi: {{duration}}',
        responseLabel: 'Balasan Pasien:',
        emptyTitle: 'Belum Ada Riwayat Komunikasi',
        emptySubtitle: 'Mulai percakapan dengan pasien ini'
      },
      directions: {
        outgoing: 'Keluar',
        incoming: 'Masuk'
      },
      statuses: {
        sent: 'Terkirim',
        delivered: 'Tersampaikan',
        read: 'Dibaca',
        failed: 'Gagal',
        pending: 'Menunggu',
        received: 'Diterima',
        completed: 'Selesai'
      },
      newMessage: {
        defaultSubject: 'Pesan dari Dokter Gigi'
      }
    },
    list: {
      title: 'Direktori Pasien',
      subtitle: '{{visible}} dari {{total}} pasien',
      searchPlaceholder: 'Cari pasien…',
      filters: {
        all: 'Semua',
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        new: 'Baru'
      },
      sources: {
        all: 'Semua Sumber',
        serene_mobile: 'Serene Mobile',
        clinic_walk_in: 'Walk-in Klinik',
        clinic_added: 'Ditambahkan Dokter',
        unknown: 'Sumber Tidak Tercatat'
      },
      actions: {
        open: 'Buka Direktori Pasien',
        close: 'Tutup Direktori Pasien'
      },
      loadingDetails: 'Memuat detail pasien...',
      badges: {
        ai: 'AI',
        allergy: 'Alergi'
      },
      labels: {
        noVisits: 'Belum ada kunjungan',
        id: 'ID: {{id}}',
        ageShort: '{{age}} th',
        gender: {
          male: 'Pria',
          female: 'Wanita',
          other: 'Lainnya',
          unknown: 'Tidak diketahui'
        }
      },
      empty: {
        title: 'Pasien Tidak Ditemukan',
        adjustFilters: 'Coba ubah pencarian, filter, atau urutan.',
        addFirst: 'Mulai dengan menambahkan pasien pertama Anda dari header di atas.'
      }
    },
    medicalHistory: {
      title: 'Riwayat Medis',
      actions: {
        add: '+ Tambah',
        cancel: 'Batal',
        submit: 'Simpan',
        view: 'Mode Lihat',
        edit: 'Mode Ubah',
        export: 'Ekspor Riwayat'
      },
      summary: {
        allergies: 'Alergi',
        conditions: 'Kondisi',
        medications: 'Obat',
        surgeries: 'Operasi'
      },
      placeholders: {
        default: 'Tambahkan entri baru...'
      },
      empty: 'Belum ada data',
      sections: {
        allergies: {
          title: 'Alergi',
          placeholder: 'Tambahkan alergi baru...',
          empty: 'Belum ada alergi tercatat',
          toggle: '+ Tambah'
        },
        conditions: {
          title: 'Kondisi Medis',
          placeholder: 'Tambahkan kondisi baru...',
          empty: 'Belum ada kondisi tercatat',
          toggle: '+ Tambah'
        },
        medications: {
          title: 'Obat yang Dikonsumsi',
          placeholder: 'Tambahkan obat baru...',
          empty: 'Belum ada obat tercatat',
          toggle: '+ Tambah'
        },
        surgeries: {
          title: 'Riwayat Operasi',
          placeholder: 'Tambahkan operasi baru...',
          empty: 'Belum ada operasi tercatat',
          toggle: '+ Tambah'
        }
      },
      severity: {
        high: 'Tinggi',
        severe: 'Berat',
        medium: 'Sedang',
        moderate: 'Sedang',
        low: 'Rendah',
        mild: 'Ringan',
        unknown: 'Tidak diketahui'
      },
      emergency: {
        title: 'Kontak Darurat',
        name: 'Nama',
        relationship: 'Hubungan',
        phone: 'Telepon',
        empty: 'Belum ada kontak darurat yang tersimpan',
        add: 'Tambah Kontak Darurat'
      },
      family: {
        title: 'Riwayat Medis Keluarga',
        empty: 'Belum ada riwayat medis keluarga',
        add: 'Tambah Riwayat Keluarga'
      },
      timeline: {
        title: 'Linimasa Riwayat Medis',
        empty: 'Fitur linimasa medis akan segera hadir'
      },
      xcore: {
        title: 'Pencitraan X-Core',
        description: 'Studi radiografi yang ditautkan ke pasien ini dan dapat Anda akses.',
        openGallery: 'Buka Galeri X-Core',
        openStudy: 'Buka Studi',
        study: 'Studi X-Core',
        series: 'seri',
        unknownModality: 'Pencitraan',
        emptyTitle: 'Belum ada studi X-Core tertaut',
        emptyDescription: 'Studi yang diunggah ke Galeri akan tampil di sini setelah ditautkan secara eksplisit ke pasien ini.'
      }
    },
    profile: {
      title: 'Profil Pasien',
      actions: {
        close: 'Tutup profil'
      },
      header: {
        nextAppointment: 'Janji berikutnya: {{date}}'
      },
      labels: {
        unknownAge: 'Tidak diketahui',
        ageDisplay: '{{age}} tahun',
        patientSince: '{{years}} th',
        notAvailable: 'Tidak tersedia'
      },
      personal: {
        title: 'Informasi Pribadi',
        fields: {
          name: 'Nama Lengkap',
          patientId: 'ID Pasien',
          dob: 'Tanggal Lahir',
          age: 'Usia',
          gender: 'Jenis Kelamin',
          maritalStatus: 'Status Pernikahan'
        }
      },
      contact: {
        title: 'Informasi Kontak',
        fields: {
          phone: 'Nomor Telepon',
          email: 'Alamat Email',
          address: 'Alamat',
          preferredContact: 'Metode Kontak Favorit',
          occupation: 'Pekerjaan'
        },
        defaults: {
          preferredContact: 'Email'
        }
      },
      medical: {
        title: 'Ringkasan Medis',
        summary: {
          allergies: 'Alergi',
          conditions: 'Kondisi',
          medications: 'Obat',
          none: 'Belum ada data'
        }
      },
      visits: {
        title: 'Ringkasan Kunjungan',
        totalVisits: 'Total Kunjungan',
        lastVisit: 'Kunjungan Terakhir',
        nextAppointment: 'Janji Berikutnya',
        patientSince: 'Menjadi Pasien Sejak',
        none: 'Tidak ada',
        notAvailable: 'Tidak tersedia'
      },
      statuses: {
        active: 'Aktif',
        inactive: 'Tidak Aktif',
        new: 'Baru'
      },
      gender: {
        male: 'Pria',
        female: 'Wanita',
        other: 'Lainnya',
        unknown: 'Tidak diketahui'
      }
    },
    treatmentPlan: {
      title: 'Rencana Perawatan',
      actions: {
        createNew: 'Buat Rencana Baru',
        cancel: 'Batal',
        create: 'Buat Rencana',
        editPlan: 'Ubah Rencana',
        addTreatment: 'Tambah Tindakan',
        complete: 'Selesai',
        start: 'Mulai'
      },
      stats: {
        total: 'Total Rencana',
        inProgress: 'Sedang Berjalan',
        completed: 'Selesai',
        totalCost: 'Total Biaya'
      },
      form: {
        title: 'Buat Rencana Perawatan Baru',
        fields: {
          title: 'Judul Rencana',
          priority: 'Prioritas',
          description: 'Deskripsi',
          estimatedCost: 'Perkiraan Biaya (IDR)',
          estimatedDuration: 'Perkiraan Durasi (minggu)',
          notes: 'Catatan'
        },
        placeholders: {
          title: 'Masukkan judul rencana...',
          description: 'Jelaskan rencana perawatan...',
          notes: 'Catatan tambahan...'
        },
        priorityOptions: {
          low: 'Prioritas Rendah',
          medium: 'Prioritas Sedang',
          high: 'Prioritas Tinggi'
        }
      },
      table: {
        plan: {
          startDate: 'Mulai:',
          estimatedCompletion: 'Perkiraan selesai:',
          estimatedCost: 'Perkiraan biaya:',
          actualCost: 'Biaya aktual:',
          progress: 'Progres'
        },
        details: {
          title: 'Detail Tindakan',
          costLabel: '💰'
        }
      },
      statuses: {
        pending: 'Tertunda',
        'in-progress': 'Sedang Berjalan',
        completed: 'Selesai',
        cancelled: 'Dibatalkan'
      },
      taskStatuses: {
        pending: 'Tertunda',
        inprogress: 'Sedang Berlangsung',
        completed: 'Selesai',
        cancelled: 'Dibatalkan'
      },
      priorities: {
        high: 'Tinggi',
        medium: 'Sedang',
        low: 'Rendah'
      },
      labels: {
        notScheduled: 'Belum dijadwalkan',
        completedOn: '✅ Selesai: {{date}}',
        scheduledOn: '📅 Terjadwal: {{date}}',
        priorityLabel: 'Prioritas {{priority}}'
      },
      empty: {
        title: 'Belum Ada Rencana Perawatan',
        description: 'Buat rencana perawatan untuk mulai merencanakan perawatan pasien ini.',
        action: 'Buat Rencana Pertama'
      }
    },
    dentistTeledentistry: {
      title: 'Teledentistry',
      subtitle: 'Manajemen konsultasi virtual dan sesi',
      breadcrumb: {
        portal: 'Portal Dokter Gigi',
        teledentistry: 'Teledentistry'
      },
    header: {
      title: 'Teledentistry'
    },
    actions: {
      summary: 'Ringkasan',
      newConsultation: 'Konsultasi Baru',
      startCall: 'Mulai Panggilan',
      connecting: 'Menghubungkan...'
    },
    postCallSummary: {
      title: 'Ringkasan Pasca Konsultasi',
      finalized: 'Ringkasan sudah final dan tampil sebagai read-only.'
    },
    newConsultation: {
      title: 'Konsultasi Baru',
      subtitle: 'Mulai konsultasi virtual dengan pasien'
    },
    search: {
      placeholder: 'Cari pasien...'
    },
    patientInfo: {
      title: 'Informasi Pasien',
      selectPatient: 'Pilih percakapan untuk melihat detail pasien',
      details: {
        title: 'Detail Pasien',
        email: 'Email',
        phone: 'Telepon',
        role: 'Peran',
        notProvided: 'Tidak disediakan',
        unknown: 'Pasien tidak diketahui'
      },
      preSessionForm: {
        title: 'Form kesehatan pra-sesi',
        loading: 'Memuat form pra-sesi...',
        error: 'Form pra-sesi belum dapat dimuat. Sesi tetap dapat berjalan karena form ini opsional.',
        notFilled: 'Pasien belum mengisi form pra-sesi. Form ini opsional, jadi sesi tetap dapat berjalan.',
        submittedBy: 'Diisi pasien',
        status: 'Dikirim',
        chiefComplaint: 'Keluhan utama',
        painScale: 'Skala nyeri',
        allergies: 'Alergi',
        medications: 'Obat yang dikonsumsi',
        additionalNotes: 'Catatan tambahan',
        notFilled_text: 'Tidak diisi',
        notProvided_text: 'Tidak disediakan'
      },
      conversation: {
        title: 'Percakapan',
        unread: 'Belum dibaca',
        lastActivity: 'Aktivitas terakhir',
        lastRead: 'Dibaca terakhir',
        lastMessage: 'Pesan terakhir',
        sharedFile: 'File dibagikan: {{fileName}}',
        attachment: 'Lampiran',
        justNow: 'baru saja',
        minutesAgo: '{{minutes}}m yang lalu',
        hoursAgo: '{{hours}}j yang lalu'
      },
      quickActions: {
        title: 'Aksi cepat',
        scheduleFollowUp: 'Jadwalkan tindak lanjut',
        viewMedicalHistory: 'Lihat riwayat medis'
      },
      onlineStatus: {
        online: 'Online',
        offline: 'Offline'
      },
      footer: {
        chatDescription: 'Chat, video, dan lampiran terkait dengan janji temu #{{appointmentId}}. Unduhan memerlukan sesi terautentikasi dan mengikuti kebijakan ukuran/jenis lampiran.',
        moreContext: 'Butuh konteks lebih? Buka catatan janji temu atau profil pasien dari dashboard klinik; panel ini mencerminkan data langsung dari API komunikasi.'
      }
    }
  },
  dentistSchedule: {
    header: {
      title: 'Jadwal Janji',
      greeting: 'Halo, {{name}}',
      fallbackName: 'Tim Dokter Gigi',
      lastUpdated: 'Sinkron terakhir {{time}}',
      fetching: 'Menyinkronkan data terbaru...',
      refresh: 'Segarkan',
      refreshing: 'Sedang menyegarkan...',
      viewModes: {
        daily: 'Harian',
        week: 'Mingguan',
        month: 'Bulanan'
      }
    },
    labels: {
      unknownPatient: 'Pasien belum diketahui',
      unknownDentist: 'Dokter gigi yang ditugaskan'
    },
    status: {
      all: 'Semua status',
      pending: 'Menunggu',
      confirmed: 'Terkonfirmasi',
      checkIn: 'Check-in',
      inChair: 'Sedang Ditangani',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      noShow: 'Tidak Hadir',
      rescheduleRequested: 'Permintaan Jadwal Ulang'
    },
    summary: {
      total: 'Janji mendatang',
      pending: 'Menunggu tinjauan',
      confirmed: 'Terkonfirmasi',
      cancelled: 'Dibatalkan'
    },
    actions: {
      confirm: 'Konfirmasi',
      reschedule: 'Jadwal Ulang',
      startVideo: 'Mulai Video',
      requestPhotos: 'Minta Foto',
      cancel: 'Batalkan',
      viewDetails: 'Lihat Detail',
      handleReschedule: 'Tangani Permintaan Jadwal Ulang',
      checkIn: 'Check-in Pasien'
    },
    channels: {
      clinic: 'Tatap Muka',
      teledentistry: 'Teledentistry'
    },
    filters: {
      title: 'Filter',
      searchLabel: 'Pencarian',
      searchPlaceholder: 'Cari pasien, layanan, atau alasan...',
      dateRange: {
        label: 'Rentang Tanggal',
        today: 'Hari ini',
        tomorrow: 'Besok',
        thisWeek: 'Minggu ini',
        thisMonth: 'Bulan ini',
        custom: 'Rentang Kustom'
      },
      status: {
        label: 'Status'
      },
      channel: {
        label: 'Kanal'
      },
      provider: {
        label: 'Dokter',
        all: 'Semua Dokter'
      },
      location: {
        label: 'Lokasi',
        all: 'Semua Lokasi'
      },
      priority: {
        label: 'Prioritas',
        all: 'Semua Prioritas',
        urgentOnly: 'Hanya Urgensi',
        highRisk: 'Risiko Tinggi',
        depositRequired: 'Butuh Deposit'
      },
      channels: {
        all: 'Semua Kanal',
        clinic: 'Tatap Muka',
        teledentistry: 'Teledentistry'
      },
      actions: {
        clear: 'Atur Ulang Filter',
        showPending: 'Tampilkan Menunggu',
        teleOnly: 'Hanya Tele'
      }
    },
    card: {
      riskTooltip: 'Risiko: {{value}}%',
      badges: {
        depositRequired: 'Butuh Deposit',
        urgent: 'Urgensi'
      },
      labels: {
        providerFallback: 'Belum ditetapkan',
        locationFallback: 'Lokasi menyusul'
      }
    },
    detail: {
      status: {
        pending: 'Menunggu',
        confirmed: 'Terkonfirmasi',
        checkIn: 'Check-in',
        inChair: 'Sedang Ditangani',
        completed: 'Selesai',
        cancelled: 'Dibatalkan',
        rescheduleRequested: 'Permintaan Jadwal Ulang'
      },
      sections: {
        patientInfo: {
          title: 'Informasi Pasien',
          details: 'Detail Pasien'
        },
        appointmentDetails: {
          title: 'Detail Janji'
        },
        providerLocation: {
          title: 'Dokter & Lokasi'
        },
        riskAssessment: {
          title: 'Penilaian Risiko',
          labels: {
            high: 'Risiko Tinggi',
            medium: 'Risiko Sedang',
            low: 'Risiko Rendah'
          }
        },
        payment: {
          title: 'Pembayaran',
          depositRequired: 'Butuh Deposit'
        },
        teledentistry: {
          title: 'Teledentistry',
          description: 'Ruang konsultasi video siap digunakan'
        }
      },
      fields: {
        name: 'Nama',
        patientId: 'ID Pasien',
        whatsApp: 'WhatsApp',
        type: 'Jenis',
        reason: 'Alasan',
        reasonFallback: 'Belum diisi',
        duration: 'Durasi',
        minuteUnit: 'menit',
        provider: 'Dokter',
        location: 'Lokasi',
        riskLevel: 'Tingkat Risiko'
      },
      quickActions: {
        title: 'Aksi Cepat',
        sendMessage: 'Kirim Pesan',
        requestPhotos: 'Minta Foto',
        sendInstructions: 'Kirim Instruksi',
        callPatient: 'Telepon Pasien'
      },
      actions: {
        title: 'Tindakan',
        confirm: 'Konfirmasi Janji',
        reschedule: 'Jadwal Ulang',
        handleReschedule: 'Tangani Permintaan Jadwal Ulang',
        checkIn: 'Check-in Pasien',
        startVideo: 'Mulai Konsultasi Video',
        cancel: 'Batalkan Janji'
      }
    },
    stats: {
      totalAppointments: 'Total Janji',
      currentlyActive: 'sedang berlangsung',
      pending: 'Menunggu konfirmasi',
      needsConfirmation: 'Butuh konfirmasi',
      confirmed: 'Terkonfirmasi',
      readyToGo: 'Siap berjalan',
      completed: 'Selesai',
      successfullyFinished: 'Selesai sukses',
      teledentistry: 'Teledentistry',
      inClinic: 'tatap muka',
      highRisk: 'Risiko Tinggi',
      requiresAttention: 'Perlu perhatian',
      depositRequired: 'Butuh Deposit',
      paymentPending: 'Menunggu pembayaran',
      performanceMetrics: 'Metri kinerja',
      completionRate: 'Tingkat Penyelesaian',
      confirmationRate: 'Tingkat Konfirmasi',
      teledentistryUsage: 'Penggunaan Teledentistry',
      quickActions: 'Aksi Cepat',
      newAppointment: 'Janji Baru',
      scheduleNewConsultation: 'Jadwalkan konsultasi baru',
      bulkCheckIn: 'Check-in massal',
      checkInMultiplePatients: 'Check-in beberapa pasien',
      sendReminders: 'Kirim pengingat',
      notifyPendingPatients: 'Notifikasi pasien menunggu',
      exportSchedule: 'Ekspor jadwal',
      downloadDailyReport: 'Unduh laporan harian'
    },
    daily: {
      header: {
        meta: '{{count}} janji temu • Granularitas {{minutes}} menit',
        statusLabel: 'Status:',
        statusOptions: {
          available: 'Tersedia',
          busy: 'Sibuk',
          dnd: 'Jangan Diganggu',
          off: 'Tidak Bertugas'
        },
        blockingOn: 'Mode Penutupan: AKTIF',
        blockingOff: 'Mode Penutupan'
      },
      quickBlock: {
        title: 'Penutupan Slot Cepat',
        typeSelected: 'Tipe: {{type}}',
        typePrompt: 'Pilih tipe penutupan terlebih dahulu',
        reset: 'Atur Ulang',
        instructions: {
          title: '💡 Cara menutup slot:',
          step1: '1️⃣ Pilih tipe penutupan di atas (mis. Istirahat)',
          step2: '2️⃣ Klik slot kosong untuk menutup secara instan',
          step3: '3️⃣ Atau klik slot tanpa memilih tipe untuk membuka form detail',
          warning: '⚠️ Hanya slot kosong yang dapat ditutup.'
        }
      },
      statsBar: {
        confirmed: 'Terkonfirmasi',
        pending: 'Menunggu',
        active: 'Aktif',
        emergency: 'Darurat',
        tele: 'Teledentistry'
      },
      quickBook: {
        block: {
          title: 'Tutup Slot',
          subtitle: 'Tutup slot untuk kebutuhan khusus',
          typeLabel: 'Tipe Penutupan',
          typePlaceholder: 'Pilih tipe penutupan...',
          durationLabel: 'Durasi',
          notesLabel: 'Catatan (Opsional)',
          notesPlaceholder: 'Masukkan catatan mengenai penutupan slot...'
        },
        booking: {
          title: 'Booking Cepat',
          subtitle: 'Buat janji baru untuk slot terpilih'
        },
        form: {
          patientName: {
            label: 'Nama Pasien',
            placeholder: 'Masukkan nama pasien...'
          },
          phone: {
            label: 'Nomor Telepon',
            placeholder: 'contoh: 0812-3456-7890'
          },
          type: {
            label: 'Jenis Layanan',
            placeholder: 'Pilih jenis layanan...'
          },
          duration: {
            label: 'Durasi'
          },
          priority: {
            label: 'Prioritas'
          },
          channel: {
            label: 'Kanal'
          },
          concerns: {
            label: 'Keluhan / Catatan',
            placeholder: 'Masukkan keluhan atau catatan khusus pasien...'
          }
        },
        common: {
          durationOption: '{{minutes}} menit'
        },
        actions: {
          close: 'Tutup modal',
          cancel: 'Batal',
          block: 'Tutup Slot',
          book: 'Buat Janji'
        }
      },
      appointmentTypes: {
        consultation: 'Konsultasi',
        scaling: 'Pembersihan Karang Gigi & Pemolesan',
        fillingSimple: 'Tambal Sederhana',
        fillingComplex: 'Tambal Kompleks',
        rootCanal: 'Perawatan Saraf',
        followUp: 'Kontrol',
        emergency: 'Darurat'
      },
      blockTypes: {
        lunch: 'Istirahat',
        dnd: 'Jangan Diganggu',
        meeting: 'Rapat Tim',
        off: 'Libur',
        maintenance: 'Pemeliharaan'
      },
      priorities: {
        routine: 'Rutin',
        urgent: 'Mendesak',
        emergency: 'Darurat'
      },
      channels: {
        office: 'Tatap Muka',
        tele: 'Teledentistry',
        phone: 'Telepon'
      },
      legend: {
        available: 'Tersedia',
        booked: 'Terisi',
        hold: 'Ditahan',
        closed: 'Ditutup',
        outsideHours: 'Di luar jam operasional'
      },
      blockingMode: {
        title: 'Mode Penutupan Aktif:',
        description: 'Slot yang sudah memiliki janji tidak dapat ditutup.'
      }
    },
    toast: {
      blockConflictDetail: '{{time}} ({{status}})',
      status: {
        scheduled: 'Terjadwal',
        blocked: 'Ditutup',
        occupied: 'Terisi'
      },
      blockConflictTitle: 'Tidak dapat menutup slot',
      blockConflictMessage: 'Ditemukan {{count}} konflik pada rentang waktu yang dipilih',
      blockSuccessTitle: 'Slot berhasil ditutup',
      blockSuccessMessage: '{{start}} - {{end}} ({{duration}} menit)',
      blockSuccessType: 'Tipe: {{type}}',
      blockSuccessDuration: 'Durasi: {{duration}} menit',
      slotUnavailableTitle: 'Slot tidak dapat ditutup',
      slotUnavailableBooked: 'Slot ini sudah memiliki janji. Pilih slot kosong lainnya.',
      slotUnavailableBlocked: 'Slot ini sudah ditutup. Pilih slot kosong lainnya.',
      slotUnavailableOutsideHours: 'Slot berada di luar jam operasional. Pilih slot dalam jam kerja.',
      blockConflictShortTitle: 'Tidak dapat menutup slot',
      blockConflictShortMessage: 'Ditemukan {{count}} jadwal yang tumpang tindih pada rentang waktu ini',
      blockConflictShortDetail: 'Pilih waktu lain atau selesaikan jadwal yang bertabrakan terlebih dahulu',
      appointmentConflictTitle: 'Tidak dapat membuat janji',
      appointmentConflictMessage: 'Ditemukan {{count}} janji yang bertabrakan dengan slot ini',
      appointmentConflictDetail: 'Pilih slot lain yang tersedia'
    },

    // Inventory & Sterilization
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

      // Purchase Requests
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

      // Receipts
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
          supplier: 'Pemasok',
          receivedBy: 'Diterima Oleh',
          items: 'Item',
          status: 'Status',
          actions: 'Aksi'
        }
      },

      // Usage
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

      // Equipment & Sterilization
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
      maintenance: 'Pemeliharaan',
            total: 'Total Alat'
          },
          table: {
            equipment: 'Peralatan',
            type: 'Tipe',
            location: 'Lokasi',
            condition: 'Kondisi',
            maintenance: 'Pemeliharaan',
            status: 'Status',
            actions: 'Aksi'
          }
        }
      }
    },

    // Billing & Insurance
    billing: {
      title: 'Penagihan & Asuransi',
      subtitle: 'Pantau faktur, pembayaran, klaim, dan promo klinik',
      tabs: {
        invoices: 'Faktur',
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
          invoice: 'Faktur',
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
    }
  }
};
