export const PATIENT_EMR_DATA = [
  {
    id: 'pt-001',
    rmNumber: 'RM-2024-001',
    nik: '3273025601920001',
    name: 'Anindita Sasmita',
    gender: 'Female',
    dob: '1992-01-16',
    age: 32,
    lastVisit: '2024-01-13',
    avatar: '/assets/images/patients/patient-01.jpg',
    profilePicture: '/assets/images/patients/patient-01.jpg',
    preferredLanguage: 'id',
    contact: {
      phone: '+62-812-3456-7890',
      email: 'anindita.sasmita@email.com',
    },
    address: {
      line1: 'Jl. Braga No. 17',
      line2: 'Blok B, Apartemen Skyline',
      city: 'Bandung',
      province: 'Jawa Barat',
      postalCode: '40111',
    },
    medicalDetails: {
      allergies: ['Amoxicillin'],
      chronicConditions: ['Diabetes Mellitus'],
      medications: ['Metformin 500mg', 'Insulin glargine'],
      notes: 'Kontrol gula rutin, edukasi diet rendah gula.',
    },
    emergencyContact: {
      name: 'Brahma Sasmita',
      phone: '+62-818-9901-223',
      relationship: 'Suami',
    },
    insurance: {
      provider: 'BPJS Kesehatan',
      number: 'BPJS-887712',
      memberId: 'JKS-230-455',
    },
    alerts: {
      allergies: ['Amoxicillin'],
      systemic: ['Diabetes Mellitus'],
    },
    chiefComplaint: 'Nyeri berdenyut pada gigi geraham kiri bawah sejak 3 hari.',
    medicalHistory:
      'Riwayat penambalan gigi 36 dua tahun lalu. Kontrol gula darah rutin, HbA1c 6.8%. Tidak ada riwayat operasi besar.',
    vitals: {
      bloodPressure: '128/82 mmHg',
      heartRate: '78 bpm',
      temperature: '36.7 °C',
      spo2: '99%',
    },
    extraOral: [
      'Wajah simetris, tidak ada pembengkakan',
      'Kelenjar limfe tidak teraba',
      'TMJ tanpa klik, rentang gerak normal',
    ],
    intraOral: [
      'Mukosa bukal lembab, tidak ada ulcer',
      'Lidah bersih, papila normal',
      'Pada gigi 36 terlihat kavitas besar dengan dentin lunak',
    ],
    odontogramMarks: [
      { code: 'CARIES', pos: '36-M' },
      { code: 'AMF', pos: '16-M' },
    ],
    diagnoses: {
      working: 'Irreversible pulpitis pada gigi 36',
      icd10: 'K04.0',
    },
    plan: {
      treatmentPlan: [
        'Root canal treatment gigi 36',
        'Pembuatan mahkota PFM setelah obturasi',
      ],
      procedures: [
        {
          label: 'Root canal therapy - molar',
          icd9: '23.09',
          status: 'Scheduled',
        },
        {
          label: 'Mahkota PFM permanen',
          icd9: '23.52',
          status: 'Planned',
        },
      ],
      medications: [
        { name: 'Ibuprofen 400mg', dosage: '3x1 jika nyeri' },
        { name: 'CHX 0.2% mouthrinse', dosage: 'Kumur 2x sehari' },
      ],
      kie: [
        'Hindari mengunyah sisi kiri sampai perawatan selesai',
        'Kontrol gula darah tetap dijaga sebelum tindakan',
      ],
    },
    documents: [
      { type: 'E-Prescription', name: 'Rx-PT001-130124.pdf' },
      { type: 'Informed Consent', name: 'Consent-RCT-PT001.pdf' },
    ],
    consent: {
      status: 'Signed electronically on 13 Jan 2024 16:45 WIB',
      witness: 'Perawat Widia',
    },
    doctorSignature: 'drg. Maya Adi, Sp.KG',
    lastUpdated: '13 Jan 2024 · 17:22 WIB',
  },
  {
    id: 'pt-002',
    rmNumber: 'RM-2024-014',
    nik: '3174091201850003',
    name: 'Bagus Pratama',
    gender: 'Male',
    dob: '1985-12-12',
    age: 38,
    lastVisit: '2024-01-08',
    avatar: '/assets/images/patients/patient-02.jpg',
    profilePicture: '/assets/images/patients/patient-02.jpg',
    preferredLanguage: 'id',
    contact: {
      phone: '+62-813-5566-7785',
      email: 'bagus.pratama@email.com',
    },
    address: {
      line1: 'Jl. Kemang Utara No. 5',
      line2: '',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12730',
    },
    medicalDetails: {
      allergies: [],
      chronicConditions: ['Hypertension'],
      medications: ['Amlodipine 5mg'],
      notes: 'Catat tekanan darah sebelum tindakan. Edukasi berhenti merokok.',
    },
    emergencyContact: {
      name: 'Ratna Pratama',
      phone: '+62-819-8880-221',
      relationship: 'Istri',
    },
    insurance: {
      provider: 'Prudential',
      number: 'PRU-442210',
      memberId: 'PRU-PLAT-003',
    },
    alerts: {
      allergies: [],
      systemic: ['Hypertension'],
    },
    chiefComplaint: 'Gusi sering berdarah dan bau mulut.',
    medicalHistory:
      'Merokok 5 batang/hari. Mengonsumsi Amlodipine 5mg setiap hari.',
    vitals: {
      bloodPressure: '140/90 mmHg',
      heartRate: '80 bpm',
      temperature: '36.5 °C',
      spo2: '98%',
    },
    extraOral: [
      'Tidak ada pembengkakan',
      'TMJ sedikit krepitasi kanan',
    ],
    intraOral: [
      'Kalkulus subgingiva pada regio anterior bawah',
      'Periodontal pocket 5-6 mm pada gigi 31-33',
    ],
    odontogramMarks: [
      { code: 'CARIES', pos: '31-M' },
      { code: 'CARIES', pos: '32-M' },
      { code: 'CARIES', pos: '41-M' },
    ],
    diagnoses: {
      working: 'Generalized chronic periodontitis',
      icd10: 'K05.3',
    },
    plan: {
      treatmentPlan: [
        'Full mouth scaling dan root planing dua sesi',
        'Evaluasi periodontal 6 minggu',
      ],
      procedures: [
        {
          label: 'Scaling & root planing - quadrant',
          icd9: '23.33',
          status: 'In progress',
        },
      ],
      medications: [
        { name: 'CHX 0.12% rinse', dosage: 'Kumur 2x sehari selama 14 hari' },
      ],
      kie: [
        'Stop merokok minimal selama perawatan',
        'Instruksi flossing dan sikat gigi dua kali sehari',
      ],
    },
    documents: [
      { type: 'Treatment Log', name: 'Perio-SRP-Session1.pdf' },
    ],
    consent: {
      status: 'Signed on 08 Jan 2024',
      witness: 'Perawat Dimas',
    },
    doctorSignature: 'drg. Hanif Rezano',
    lastUpdated: '08 Jan 2024 · 14:05 WIB',
  },
  {
    id: 'pt-003',
    rmNumber: 'RM-2024-027',
    nik: '3201020403950005',
    name: 'Claudia Putri',
    gender: 'Female',
    dob: '1995-03-04',
    age: 29,
    lastVisit: '2024-01-05',
    avatar: '/assets/images/patients/patient-03.jpg',
    profilePicture: '/assets/images/patients/patient-03.jpg',
    preferredLanguage: 'en',
    contact: {
      phone: '+62-812-7788-6633',
      email: 'claudia.putri@email.com',
    },
    address: {
      line1: 'Jl. Darmo Indah 21',
      line2: '',
      city: 'Surabaya',
      province: 'Jawa Timur',
      postalCode: '60232',
    },
    medicalDetails: {
      allergies: ['Latex'],
      chronicConditions: [],
      medications: [],
      notes: 'Pasien disiplin aligner, hindari latex-glove saat tindakan.',
    },
    emergencyContact: {
      name: 'Livia Putri',
      phone: '+62-817-6600-553',
      relationship: 'Kakak',
    },
    insurance: {
      provider: 'Allianz',
      number: 'ALZ-009811',
      memberId: 'ALZ-DENT-221',
    },
    alerts: {
      allergies: ['Latex'],
      systemic: [],
    },
    chiefComplaint: 'Ingin melanjutkan perawatan aligner kontrol ke-3.',
    medicalHistory: 'Tidak ada penyakit sistemik. Tidak merokok.',
    vitals: {
      bloodPressure: '112/74 mmHg',
      heartRate: '72 bpm',
      temperature: '36.4 °C',
      spo2: '99%',
    },
    extraOral: [
      'Profil wajah convex ringan',
      'Tidak ada pembesaran limfe',
    ],
    intraOral: [
      'Aligner set ke-6 terpasang',
      'Overjet 3mm, overbite 10%',
    ],
    odontogramMarks: [
      { code: 'BRIDGE', pos: '13' },
      { code: 'BRIDGE', pos: '23' },
    ],
    diagnoses: {
      working: 'Mild crowding anterior rahang atas',
      icd10: 'K07.3',
    },
    plan: {
      treatmentPlan: [
        'Monitoring aligner tiap 4 minggu',
        'Retainer permanen setelah siklus aligner selesai',
      ],
      procedures: [
        {
          label: 'Clear aligner adjustment visit',
          icd9: '89.23',
          status: 'Ongoing',
        },
      ],
      medications: [],
      kie: [
        'Gunakan aligner 22 jam/hari',
        'Bersihkan aligner dengan air dingin dan sabun',
      ],
    },
    documents: [
      { type: 'Treatment Timeline', name: 'Aligner-Timeline-PT003.pdf' },
      { type: 'Photo Set', name: 'Progress-Photos-Jan.pdf' },
    ],
    consent: {
      status: 'Digital consent signed 05 Jan 2024',
      witness: 'Perawat Nisa',
    },
    doctorSignature: 'drg. Nadine Aprilia, Sp.Ort',
    lastUpdated: '05 Jan 2024 · 10:45 WIB',
  },
];

export const getPatientEmrById = (id) =>
  PATIENT_EMR_DATA.find((patient) => patient.id === id);
