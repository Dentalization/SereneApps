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
            title: 'Password Sementara Owner',
            subtitle: 'Bagikan password ini secara aman kepada owner klinik',
            copyTooltip: 'Salin password',
            warning: '⚠️ Owner disarankan mengubah password setelah login pertama demi keamanan.'
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
              label: 'Nama Owner',
              placeholder: 'Nama lengkap owner'
            },
            ownerEmail: {
              label: 'Email Owner',
              placeholder: 'owner@example.com'
            },
            ownerPosition: {
              label: 'Posisi Owner',
              options: {
                owner: 'Owner',
                manager: 'Manajer'
              }
            },
            ownerWhatsapp: {
              label: 'WhatsApp Owner',
              placeholder: 'mis. +628123456789'
            },
            ownerNik: {
              label: 'NIK Owner',
              placeholder: 'Masukkan nomor NIK owner'
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
              label: 'Selfie KTP / Foto Owner (jpeg/png/pdf)',
              hint: 'Opsional: Foto owner memegang KTP untuk verifikasi'
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
            ktpSelfie: 'Selfie KTP / Foto Owner',
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
      unassignedBranchLabel: 'Staff Belum Ditempatkan',
      unnamedBranchLabel: 'Cabang Tanpa Nama',
      virtualBadge: 'Virtual',
      mainBadge: 'Utama',
      branchDirectoryTitle: 'Direktori Cabang',
      branchCount: '{{count}} cabang terdaftar',
      noBranches: 'Belum ada cabang terdaftar.',
      noBranchesEmpty: 'Belum ada cabang. Tambahkan cabang untuk mengelola operasional dan penugasan.',
      unassignedStaffHint: 'Staff tanpa penugasan cabang spesifik',
      staffRosterTitle: 'Roster Staff',
      staffRosterSubtitle: 'Menampilkan staff yang ditempatkan di {{branch}}.',
      noMainBranchHint: 'Cabang utama belum ditentukan. Tetapkan cabang utama untuk menampilkan penugasan staff.',
      staffCountLabel: '{{count}} staff',
      roomCountLabel: '{{count}} ruang',
      branchCodeLabel: 'Kode: {{code}}',
      quickActionsTitle: 'Aksi Cepat',
      quickActionsSubtitle: 'Kelola verifikasi atau navigasi kembali.',
      modal: {
        approveTitle: 'Setujui Registrasi Klinik',
        rejectTitle: 'Tolak Pengajuan Klinik',
        approveDescription: 'Klinik ini akan ditandai sebagai terverifikasi dan owner akan diberi tahu.',
        rejectDescription: 'Pengajuan ini akan ditolak. Mohon berikan alasan di bawah.',
        notesLabel: 'Catatan Verifikasi',
        notesPlaceholderApprove: 'Tambahkan catatan terkait verifikasi (opsional)',
        notesPlaceholderReject: 'Jelaskan alasan penolakan pengajuan ini (wajib)',
        notesHintApprove: 'Catatan ini akan terlihat oleh admin lainnya',
        notesHintReject: 'Owner akan melihat alasan ini',
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
      notesPlaceholder: 'Gunakan alur verifikasi untuk mencatat review, lampiran, dan komentar kepatuhan. Catatan ini membantu tim lain memahami keputusan onboarding.',
      legalEntityLabel: 'Entitas legal:',
      metricTotalBranches: 'Total Cabang',
      metricTotalBranchesHint: 'Lokasi terdaftar',
      metricStaff: 'Jumlah Staff',
      metricStaffHint: 'Penugasan aktif',
      metricOwner: 'Owner',
      metricPrimaryBranch: 'Cabang Utama',
      primaryBranchSummary: '{{count}} staff • {{location}}',
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
      operationalOverviewTitle: 'Overview Operasional',
      operationalOverviewSubtitle: 'Identitas owner, kontak, dan kelengkapan kepatuhan.',
      ownerSectionTitle: 'Owner / PIC',
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
  },
  clinic: {
    sidebar: {
      publicProfile: 'Profil Publik',
      descriptions: {
        publicProfile: 'Layanan, Galeri & Fasilitas'
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
        gallery: 'Atur hero image dan foto galeri.',
        highlights: 'Promosikan keunggulan dan pengalaman unik klinik.',
        facilities: 'Tampilkan fasilitas dan peralatan yang tersedia.'
      }
    },
    staff: {
      // Existing translations
      badge: 'Manajemen Staff',
      title: 'Manajemen Staff',
      subtitle: 'Kelola tim klinik, peran, dan penempatan cabang',
      totalStaff: 'total staff',
      
      // Multi-branch extensions
      branches: {
        title: 'Penempatan Cabang',
        allBranches: 'Semua Cabang',
        unassigned: 'Belum Ditempatkan',
        assignToBranch: 'Tempatkan di Cabang',
        currentBranch: 'Cabang Saat Ini',
        branchInfo: 'Informasi Cabang',
        moveStaff: 'Pindah Staff',
        filterByBranch: 'Filter berdasarkan Cabang'
      },
      
      // Table columns
      table: {
        staff: 'Staff',
        contact: 'Kontak',
        role: 'Peran',
        branch: 'Cabang',
        status: 'Status',
        actions: 'Aksi'
      },
      
      // Actions
      actions: {
        addStaff: 'Tambah Staff',
        viewProfile: 'Lihat Profil',
        editRole: 'Edit Peran',
        changeBranch: 'Ubah Cabang',
        remove: 'Hapus'
      },
      
      // Modals
      modals: {
        invite: {
          badge: 'Undang Staff',
          title: 'Undang Anggota Staff Baru',
          subtitle: 'Tambahkan anggota tim baru ke klinik Anda',
          fields: {
            name: 'Nama Lengkap',
            email: 'Alamat Email',
            password: 'Password',
            role: 'Peran',
            position: 'Posisi',
            department: 'Departemen',
            branch: 'Penempatan Cabang'
          },
          placeholders: {
            name: 'Masukkan nama lengkap',
            email: 'Masukkan alamat email',
            password: 'Masukkan password sementara',
            position: 'Masukkan posisi (opsional)',
            department: 'Masukkan departemen (opsional)',
            branch: 'Pilih penempatan cabang'
          },
          hints: {
            password: 'Minimal 6 karakter. Staff dapat mengubah password setelah login pertama.',
            branch: 'Staff akan ditempatkan untuk bekerja di lokasi cabang ini.'
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
        marketing: 'Marketing'
      },
      operational: {
        roomUtilization: 'Keterisian Ruang',
        avgWaitTime: 'Rata-rata Waktu Tunggu',
        satisfaction: 'Kepuasan Pasien',
        completionRate: 'Completion Rate',
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
        outstandingInvoices: 'Invoice Tertunggak',
        outstandingList: 'Daftar Invoice Tertunggak',
        monthlyTrend: 'Tren Pendapatan Bulanan'
      },
      compliance: {
        overallScore: 'Skor Kepatuhan',
        dataPrivacy: 'Privasi Data',
        consentForms: 'Form Persetujuan',
        recordKeeping: 'Pencatatan',
        security: 'Keamanan Sistem',
        consentStatus: 'Status Consent',
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
        recallProgram: 'Program Recall',
        recallSuccess: 'Keberhasilan Recall',
        topReferrers: 'Pengirim Rujukan Teratas',
        socialMedia: 'Performa Media Sosial',
        activeCampaigns: 'Kampanye Aktif',
        contentPerformance: 'Performa Konten',
        campaignROI: 'ROI Kampanye'
      }
    }
  },
  settings: {
    title: 'Pengaturan',
    profile: 'Profil',
    billing: 'AI & Billing',
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
        submit: 'Tambah Pasien & Jadwalkan'
      },
      validation: {
        nameRequired: 'Nama wajib diisi',
        phoneRequired: 'Nomor telepon wajib diisi',
        emailRequired: 'Email wajib diisi',
        ageRequired: 'Usia harus valid',
        genderRequired: 'Jenis kelamin wajib diisi',
        dateRequired: 'Tanggal janji wajib diisi',
        timeRequired: 'Waktu janji wajib diisi'
      }
    },
    ai: {
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
        share: 'Bagikan ke Pasien'
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
        clear: 'Reset Filter',
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
        reset: 'Reset',
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
        scaling: 'Scaling & Polishing',
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
          supplier: 'Supplier',
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
    
    // Billing & Insurance
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
    }
  }
};
