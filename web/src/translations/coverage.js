const en = {
  admin: {
    badge: 'Admin Portal',
    clinicDetail: {
      allStaffLabel: 'All staff',
      staffRosterAllSubtitle: 'All clinic staff across branches'
    },
    dentistManagement: {
      badge: 'Dentist Management',
      subtitle: 'Review, verify, and manage dentist accounts'
    },
    profile: {
      title: 'Profile Settings',
      subtitle: 'Manage your admin account settings',
      personalInfo: 'Personal Information',
      personalInfoDesc: 'Update your personal details and contact information',
      security: 'Security Settings',
      securityDesc: 'Change your password to keep your account secure',
      save: 'Save Changes',
      saving: 'Saving...',
      name: 'Full Name',
      namePlaceholder: 'Enter your full name',
      phone: 'Phone Number',
      phonePlaceholder: 'Enter your phone number',
      email: 'Email Address',
      emailPlaceholder: 'Enter your email',
      bio: 'Bio',
      bioPlaceholder: 'Tell us about yourself...',
      currentPassword: 'Current Password',
      currentPasswordPlaceholder: 'Enter current password',
      newPassword: 'New Password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPassword: 'Confirm New Password',
      confirmPasswordPlaceholder: 'Confirm new password',
      passwordHint: 'Leave password fields empty if you do not want to change your password',
      defaultName: 'Admin User',
      defaultEmail: 'admin@sereneai.com',
      fileSizeError: 'File size must be less than 5MB',
      fileTypeError: 'Please select an image file',
      uploadSuccess: 'Avatar uploaded successfully!',
      uploadError: 'Failed to upload avatar. Please try again.',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 6 characters',
      success: 'Profile updated successfully!',
      error: 'Failed to update profile. Please try again.'
    }
  },
  clinic: {
    audit: {
      noLogs: 'No audit logs yet'
    },
    schedule: {
      appointment: {
        ownerOnlyVideoRoom: 'Only clinic owners can observe live teledentistry rooms'
      },
      labels: {
        unknownPatient: 'Unknown patient',
        unknownDentist: 'Unknown dentist'
      },
      locations: {
        default: 'Clinic'
      },
      lastUpdated: 'Last updated',
      syncing: 'Syncing...',
      refreshing: 'Refreshing...',
      refresh: 'Refresh'
    },
    settings: {
      basicInfo: 'Basic Information',
      clinicName: 'Clinic Name',
      licenseNumber: 'License Number',
      phone: 'Phone',
      email: 'Email',
      taxId: 'Tax ID',
      establishedDate: 'Established Date',
      address: 'Address',
      description: 'Description',
      descriptionPlaceholder: 'Describe your clinic, services, and patient experience',
      saveChanges: 'Save Changes'
    }
  },
  common: {
    appErrorTitle: 'Error in App',
    back: 'Back',
    goBack: 'Go Back',
    backToHome: 'Back to Home',
    city: 'City',
    close: 'Close',
    dismissNotification: 'Dismiss notification',
    errorBoundaryTitle: 'Something went wrong',
    errorBoundaryMessage: 'We encountered an unexpected error while processing your request.',
    itemsSelected: '{{count}} items selected',
    mainBranch: 'Main',
    noBranches: 'No branches',
    noBranchesAvailable: 'No branches available',
    noDataAvailable: 'No data available',
    noOptionsAvailable: 'No options available',
    noOptionsFound: 'No options found',
    noStaffAssigned: 'No staff assigned to this branch',
    notifications: 'Notifications',
    pageNotFound: 'Page Not Found',
    pageNotFoundDescription: "The page you're looking for does not exist. Let us get you back.",
    viewAll: 'View all',
    viewSchedule: 'View schedule',
    download: 'Download',
    rooms: 'Rooms',
    reset: 'Reset',
    searchOptions: 'Search options...',
    select: 'Select...',
    selectPlaceholder: 'Select an option',
    statuses: {
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      verified: 'Verified',
      rejected: 'Rejected',
      suspended: 'Suspended',
      unknown: 'Unknown'
    },
    toast: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info'
    },
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    }
  },
  shared: {
    charts: {
      noDataAvailable: 'No data available'
    },
    clinic: {
      table: {
        caption: 'Clinic directory',
        clinic: 'Clinic',
        owner: 'Owner',
        status: 'Status',
        branches: 'Branches',
        created: 'Created',
        actions: 'Actions',
        view: 'View',
        empty: 'No clinics available',
        unnamedClinic: 'Unnamed clinic'
      },
      branches: {
        listLabel: 'Clinic branches',
        unnamed: 'Unnamed branch',
        virtual: 'Unassigned',
        unassignedHint: 'Staff without a branch assignment',
        staffCount: 'Staff'
      },
      staff: {
        listLabel: 'Clinic staff',
        unnamed: 'Unnamed staff member',
        viewDetails: 'Details',
        hideDetails: 'Hide',
        assignedBranch: 'Assigned branch',
        specialization: 'Specialization',
        license: 'License',
        licenseExpiry: 'License expiry',
        department: 'Department',
        emailAction: 'Email staff member',
        professionalVerified: 'Professional verified',
        professionalPending: 'Professional pending'
      }
    },
    loader: {
      dentalScan: 'Analyzing Dental Structure...',
      modelProcessing: 'AI Model v2.4 Processing'
    }
  },
  public: {
    header: {
      brand: 'Serene AI',
      dentalPlatform: 'Dental Platform',
      platform: 'Platform',
      forPatients: 'For Patients',
      forDentists: 'For Dentists',
      pricing: 'Pricing',
      clinicalResearch: 'Clinical Research',
      more: 'More',
      toggleTheme: 'Toggle theme',
      signIn: 'Sign In',
      tryFreeAnalysis: 'Try Free Analysis',
      tryAI: 'Try AI',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode'
    },
    footer: {
      brand: 'Serene AI',
      brandAlt: 'Serene AI Logo',
      dentalIntelligence: 'Dental Intelligence',
      description: 'Pioneering the future of dental diagnostics with advanced computer vision and generative AI. Bridging the gap between patients and practitioners.',
      newsletterTitle: 'Stay ahead of the curve',
      newsletterDescription: 'Join our newsletter for the latest AI research and product updates.',
      emailPlaceholder: 'Enter your email',
      subscribe: 'Subscribe',
      medicalDisclaimerTitle: 'Medical Disclaimer:',
      medicalDisclaimerBody: 'Serene AI is a clinical decision support tool designed for educational and informational purposes. It does not provide medical diagnoses or treatment advice. Always consult a qualified healthcare professional for dental concerns. This software is designed to assist, not replace, human judgment.',
      location: 'Jakarta, Indonesia',
      systemOperational: 'System Operational',
      sections: {
        platform: 'Platform',
        company: 'Company',
        resources: 'Resources',
        legal: 'Legal'
      },
      links: {
        howItWorks: 'How it Works',
        forPatients: 'For Patients',
        forDentists: 'For Dentists',
        pricingPlans: 'Pricing & Plans',
        ourStory: 'Our Story',
        careers: 'Careers',
        pressKit: 'Press Kit',
        contactUs: 'Contact Us',
        clinicalResearch: 'Clinical Research',
        developerApi: 'Developer API',
        helpCenter: 'Help Center',
        systemStatus: 'System Status',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
        hipaaCompliance: 'HIPAA Compliance',
        medicalDisclaimer: 'Medical Disclaimer'
      },
      certifications: {
        hipaa: 'HIPAA Compliant',
        fda: 'FDA Registered',
        iso: 'ISO 27001',
        soc: 'SOC 2 Type II'
      },
      socials: {
        email: 'Email',
        instagram: 'Instagram',
        twitter: 'Twitter',
        linkedin: 'LinkedIn'
      }
    }
  },
  dentistPatient: {
    appointments: {
      summary: {
        treatment: 'Treatment'
      }
    },
    billing: {
      invoices: {
        empty: 'No invoices yet'
      }
    },
    profile: {
      contact: {
        defaultPreferred: 'Preferred contact'
      }
    }
  },
  reports: {
    pdfDescription: 'Best for printable summaries and formal sharing',
    excelDescription: 'Best for spreadsheet analysis and pivot tables',
    csvDescription: 'Best for raw data import into other tools',
    pngDescription: 'Best for sharing charts as images',
    exportData: 'Export Data',
    exportFormat: 'Export Format',
    exportOptions: 'Export Options',
    includeCharts: 'Include charts',
    includeChartsDescription: 'Export chart images with the report',
    includeRawData: 'Include raw data',
    includeRawDataDescription: 'Export the underlying table data',
    includeSummary: 'Include summary',
    includeSummaryDescription: 'Add the executive summary section',
    includeFilters: 'Include filters',
    includeFiltersDescription: 'Show active filters in the export',
    estimatedSize: 'Estimated size',
    exporting: 'Exporting...',
    exportNow: 'Export now',
    cancel: 'Cancel'
  },
  schedule: {
    today: 'Today'
  },
  settings: {
    scheduleSaveSuccess: 'Schedule settings saved successfully',
    scheduleSaveError: 'Failed to save schedule settings'
  }
};

const id = {
  admin: {
    badge: 'Portal Admin',
    clinicDetail: {
      allStaffLabel: 'Semua staff',
      staffRosterAllSubtitle: 'Semua staff klinik lintas cabang'
    },
    dentistManagement: {
      badge: 'Manajemen Dokter Gigi',
      subtitle: 'Tinjau, verifikasi, dan kelola akun dokter gigi'
    },
    profile: {
      title: 'Pengaturan Profil',
      subtitle: 'Kelola pengaturan akun admin Anda',
      personalInfo: 'Informasi Pribadi',
      personalInfoDesc: 'Perbarui detail pribadi dan informasi kontak Anda',
      security: 'Pengaturan Keamanan',
      securityDesc: 'Ubah password untuk menjaga keamanan akun',
      save: 'Simpan Perubahan',
      saving: 'Menyimpan...',
      name: 'Nama Lengkap',
      namePlaceholder: 'Masukkan nama lengkap',
      phone: 'Nomor Telepon',
      phonePlaceholder: 'Masukkan nomor telepon',
      email: 'Alamat Email',
      emailPlaceholder: 'Masukkan email',
      bio: 'Bio',
      bioPlaceholder: 'Ceritakan tentang diri Anda...',
      currentPassword: 'Password Saat Ini',
      currentPasswordPlaceholder: 'Masukkan password saat ini',
      newPassword: 'Password Baru',
      newPasswordPlaceholder: 'Masukkan password baru',
      confirmPassword: 'Konfirmasi Password Baru',
      confirmPasswordPlaceholder: 'Konfirmasi password baru',
      passwordHint: 'Biarkan field password kosong jika tidak ingin mengubah password',
      defaultName: 'Pengguna Admin',
      defaultEmail: 'admin@sereneai.com',
      fileSizeError: 'Ukuran file harus kurang dari 5MB',
      fileTypeError: 'Pilih file gambar',
      uploadSuccess: 'Avatar berhasil diupload!',
      uploadError: 'Gagal mengupload avatar. Silakan coba lagi.',
      passwordMismatch: 'Password tidak cocok',
      passwordTooShort: 'Password minimal 6 karakter',
      success: 'Profil berhasil diperbarui!',
      error: 'Gagal memperbarui profil. Silakan coba lagi.'
    }
  },
  clinic: {
    audit: {
      noLogs: 'Belum ada audit log'
    },
    schedule: {
      appointment: {
        ownerOnlyVideoRoom: 'Hanya clinic owner yang dapat memantau room teledentistry live'
      },
      labels: {
        unknownPatient: 'Pasien tidak diketahui',
        unknownDentist: 'Dokter tidak diketahui'
      },
      locations: {
        default: 'Klinik'
      },
      lastUpdated: 'Terakhir diperbarui',
      syncing: 'Sinkronisasi...',
      refreshing: 'Memuat ulang...',
      refresh: 'Muat ulang'
    },
    settings: {
      basicInfo: 'Informasi Dasar',
      clinicName: 'Nama Klinik',
      licenseNumber: 'Nomor Lisensi',
      phone: 'Telepon',
      email: 'Email',
      taxId: 'NPWP',
      establishedDate: 'Tanggal Berdiri',
      address: 'Alamat',
      description: 'Deskripsi',
      descriptionPlaceholder: 'Jelaskan klinik, layanan, dan pengalaman pasien',
      saveChanges: 'Simpan Perubahan'
    }
  },
  common: {
    appErrorTitle: 'Error pada Aplikasi',
    back: 'Kembali',
    goBack: 'Kembali',
    backToHome: 'Kembali ke Beranda',
    city: 'Kota',
    close: 'Tutup',
    dismissNotification: 'Tutup notifikasi',
    errorBoundaryTitle: 'Terjadi kesalahan',
    errorBoundaryMessage: 'Kami mengalami kesalahan saat memproses permintaan Anda.',
    itemsSelected: '{{count}} item dipilih',
    mainBranch: 'Utama',
    noBranches: 'Tidak ada cabang',
    noBranchesAvailable: 'Belum ada cabang tersedia',
    noDataAvailable: 'Tidak ada data tersedia',
    noOptionsAvailable: 'Tidak ada opsi tersedia',
    noOptionsFound: 'Opsi tidak ditemukan',
    noStaffAssigned: 'Belum ada staff yang ditugaskan ke cabang ini',
    notifications: 'Notifikasi',
    pageNotFound: 'Halaman Tidak Ditemukan',
    pageNotFoundDescription: 'Halaman yang Anda cari tidak tersedia. Mari kembali ke halaman sebelumnya.',
    viewAll: 'Lihat semua',
    viewSchedule: 'Lihat jadwal',
    download: 'Unduh',
    rooms: 'Ruangan',
    reset: 'Reset',
    searchOptions: 'Cari opsi...',
    select: 'Pilih...',
    selectPlaceholder: 'Pilih opsi',
    statuses: {
      active: 'Aktif',
      inactive: 'Tidak aktif',
      pending: 'Menunggu',
      verified: 'Terverifikasi',
      rejected: 'Ditolak',
      suspended: 'Ditangguhkan',
      unknown: 'Tidak diketahui'
    },
    toast: {
      success: 'Berhasil',
      error: 'Butuh perhatian',
      warning: 'Perlu dicek',
      info: 'Informasi'
    },
    days: {
      monday: 'Senin',
      tuesday: 'Selasa',
      wednesday: 'Rabu',
      thursday: 'Kamis',
      friday: 'Jumat',
      saturday: 'Sabtu',
      sunday: 'Minggu'
    }
  },
  shared: {
    charts: {
      noDataAvailable: 'Tidak ada data tersedia'
    },
    clinic: {
      table: {
        caption: 'Direktori klinik',
        clinic: 'Klinik',
        owner: 'Pemilik',
        status: 'Status',
        branches: 'Cabang',
        created: 'Dibuat',
        actions: 'Aksi',
        view: 'Lihat',
        empty: 'Belum ada klinik tersedia',
        unnamedClinic: 'Klinik tanpa nama'
      },
      branches: {
        listLabel: 'Cabang klinik',
        unnamed: 'Cabang tanpa nama',
        virtual: 'Belum ditugaskan',
        unassignedHint: 'Staff tanpa penugasan cabang',
        staffCount: 'Staff'
      },
      staff: {
        listLabel: 'Staff klinik',
        unnamed: 'Anggota staff tanpa nama',
        viewDetails: 'Detail',
        hideDetails: 'Sembunyikan',
        assignedBranch: 'Cabang penugasan',
        specialization: 'Spesialisasi',
        license: 'Lisensi',
        licenseExpiry: 'Masa berlaku lisensi',
        department: 'Departemen',
        emailAction: 'Kirim email ke staff',
        professionalVerified: 'Profesional terverifikasi',
        professionalPending: 'Verifikasi profesional tertunda'
      }
    },
    loader: {
      dentalScan: 'Menganalisis struktur gigi...',
      modelProcessing: 'AI Model v2.4 Memproses'
    }
  },
  public: {
    header: {
      brand: 'Serene AI',
      dentalPlatform: 'Platform Dental',
      platform: 'Platform',
      forPatients: 'Untuk Pasien',
      forDentists: 'Untuk Dokter Gigi',
      pricing: 'Harga',
      clinicalResearch: 'Riset Klinis',
      more: 'Lainnya',
      toggleTheme: 'Ganti tema',
      signIn: 'Masuk',
      tryFreeAnalysis: 'Coba Analisis Gratis',
      tryAI: 'Coba AI',
      darkMode: 'Mode Gelap',
      lightMode: 'Mode Terang'
    },
    footer: {
      brand: 'Serene AI',
      brandAlt: 'Logo Serene AI',
      dentalIntelligence: 'Intelijen Dental',
      description: 'Mendorong masa depan diagnostik gigi dengan computer vision dan generative AI. Menjembatani pasien dan tenaga kesehatan gigi.',
      newsletterTitle: 'Tetap terdepan',
      newsletterDescription: 'Ikuti newsletter kami untuk pembaruan riset AI dan produk terbaru.',
      emailPlaceholder: 'Masukkan email Anda',
      subscribe: 'Berlangganan',
      medicalDisclaimerTitle: 'Disclaimer Medis:',
      medicalDisclaimerBody: 'Serene AI adalah alat pendukung keputusan klinis untuk tujuan edukasi dan informasi. Sistem ini tidak memberikan diagnosis medis atau saran perawatan. Selalu konsultasikan keluhan gigi dengan tenaga kesehatan yang qualified. Software ini dirancang untuk membantu, bukan menggantikan, penilaian manusia.',
      location: 'Jakarta, Indonesia',
      systemOperational: 'Sistem Operasional',
      sections: {
        platform: 'Platform',
        company: 'Perusahaan',
        resources: 'Sumber Daya',
        legal: 'Legal'
      },
      links: {
        howItWorks: 'Cara Kerja',
        forPatients: 'Untuk Pasien',
        forDentists: 'Untuk Dokter Gigi',
        pricingPlans: 'Harga & Paket',
        ourStory: 'Cerita Kami',
        careers: 'Karier',
        pressKit: 'Media Kit',
        contactUs: 'Hubungi Kami',
        clinicalResearch: 'Riset Klinis',
        developerApi: 'API Developer',
        helpCenter: 'Pusat Bantuan',
        systemStatus: 'Status Sistem',
        privacyPolicy: 'Kebijakan Privasi',
        termsOfService: 'Syarat Layanan',
        hipaaCompliance: 'Kepatuhan HIPAA',
        medicalDisclaimer: 'Disclaimer Medis'
      },
      certifications: {
        hipaa: 'Patuh HIPAA',
        fda: 'Terdaftar FDA',
        iso: 'ISO 27001',
        soc: 'SOC 2 Type II'
      },
      socials: {
        email: 'Email',
        instagram: 'Instagram',
        twitter: 'Twitter',
        linkedin: 'LinkedIn'
      }
    }
  },
  dentistPatient: {
    appointments: {
      summary: {
        treatment: 'Tindakan'
      }
    },
    billing: {
      invoices: {
        empty: 'Belum ada invoice'
      }
    },
    profile: {
      contact: {
        defaultPreferred: 'Kontak pilihan'
      }
    }
  },
  reports: {
    pdfDescription: 'Paling cocok untuk ringkasan cetak dan berbagi formal',
    excelDescription: 'Paling cocok untuk analisis spreadsheet dan pivot table',
    csvDescription: 'Paling cocok untuk impor data mentah ke tool lain',
    pngDescription: 'Paling cocok untuk berbagi grafik sebagai gambar',
    exportData: 'Export Data',
    exportFormat: 'Format Export',
    exportOptions: 'Opsi Export',
    includeCharts: 'Sertakan grafik',
    includeChartsDescription: 'Export gambar grafik bersama laporan',
    includeRawData: 'Sertakan data mentah',
    includeRawDataDescription: 'Export data tabel sumber',
    includeSummary: 'Sertakan ringkasan',
    includeSummaryDescription: 'Tambahkan bagian ringkasan eksekutif',
    includeFilters: 'Sertakan filter',
    includeFiltersDescription: 'Tampilkan filter aktif di export',
    estimatedSize: 'Estimasi ukuran',
    exporting: 'Mengexport...',
    exportNow: 'Export sekarang',
    cancel: 'Batal'
  },
  schedule: {
    today: 'Hari ini'
  },
  settings: {
    scheduleSaveSuccess: 'Pengaturan jadwal berhasil disimpan',
    scheduleSaveError: 'Gagal menyimpan pengaturan jadwal'
  }
};

export default { en, id };
