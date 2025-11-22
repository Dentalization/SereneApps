/**
 * Daftar Spesialisasi Dokter Gigi di Indonesia
 * Sesuai dengan Standar Ikatan Dokter Gigi Indonesia (PDGI)
 */

export const DENTAL_SPECIALIZATIONS = [
  {
    id: 'sp-ort',
    name: 'Ortodonti (Sp.Ort)',
    code: 'Sp.Ort',
    description: 'Mengatasi masalah gigi dan rahang yang tidak sejajar, menggunakan kawat gigi atau clear aligner',
    services: ['Pemasangan Behel', 'Clear Aligner', 'Retainer', 'Kontrol Behel']
  },
  {
    id: 'sp-kg',
    name: 'Konservasi Gigi (Sp.KG)',
    code: 'Sp.KG',
    description: 'Fokus pada perawatan gigi berlubang, saluran akar (endodontik), serta restorasi seperti penambalan atau pemasangan mahkota gigi',
    services: ['Perawatan Saluran Akar', 'Crown Porselen', 'Inlay/Onlay', 'Veneer']
  },
  {
    id: 'sp-bm',
    name: 'Bedah Mulut (Sp.BM)',
    code: 'Sp.BM',
    description: 'Melakukan pembedahan untuk masalah seperti gigi bungsu yang impaksi, bibir sumbing, atau operasi rahang',
    services: ['Cabut Gigi Bungsu Impaksi', 'Operasi Bibir Sumbing', 'Operasi Rahang', 'Odontektomi']
  },
  {
    id: 'sp-perio',
    name: 'Periodonsia (Sp.Perio)',
    code: 'Sp.Perio',
    description: 'Mendiagnosis dan mengobati penyakit yang menyerang jaringan pendukung gigi, seperti gusi dan tulang rahang',
    services: ['Kuretase Gusi', 'Flap Surgery', 'Gingivektomi', 'Bone Grafting']
  },
  {
    id: 'sp-pros',
    name: 'Prostodonsia (Sp.Pros)',
    code: 'Sp.Pros',
    description: 'Menangani masalah gigi yang hilang atau rusak dengan membuat dan memasang gigi tiruan, mahkota, atau implan',
    services: ['Gigi Tiruan Lepasan', 'Gigi Tiruan Lengkap', 'Implan Gigi', 'Bridge']
  },
  {
    id: 'sp-kga',
    name: 'Kedokteran Gigi Anak (Sp.KGA)',
    code: 'Sp.KGA',
    description: 'Memberikan perawatan gigi dan mulut khusus untuk anak-anak, mulai dari bayi hingga remaja',
    services: ['Perawatan Gigi Anak', 'Tambal Gigi Susu', 'Aplikasi Fluoride', 'Space Maintainer']
  },
  {
    id: 'sp-pm',
    name: 'Penyakit Mulut (Sp.PM)',
    code: 'Sp.PM',
    description: 'Menangani penyakit pada jaringan lunak mulut, seperti sariawan kronis, tumor, atau kanker mulut',
    services: ['Biopsi Jaringan Mulut', 'Pengobatan Sariawan Kronis', 'Terapi Lesi Mulut']
  },
  {
    id: 'sp-rkg',
    name: 'Radiologi Kedokteran Gigi (Sp.RKG)',
    code: 'Sp.RKG',
    description: 'Bertanggung jawab untuk menganalisis dan mendiagnosis penyakit menggunakan pencitraan, seperti rontgen, CT scan, atau MRI gigi',
    services: ['CT Scan Gigi', 'CBCT', 'Panoramik Digital', 'Radiologi Diagnostik']
  },
  {
    id: 'odonto-forensik',
    name: 'Odontologi Forensik',
    code: 'Odonto',
    description: 'Dokter gigi yang memiliki keahlian khusus dalam menggunakan ilmu kedokteran gigi untuk kepentingan hukum dan identifikasi dalam kasus pidana atau bencana',
    services: ['Identifikasi Jenazah', 'Analisis Bekas Gigitan', 'Estimasi Usia', 'Visum Forensik']
  },
  {
    id: 'umum',
    name: 'Dokter Gigi Umum',
    code: 'Umum',
    description: 'Dokter gigi yang menangani perawatan gigi umum dan pencegahan',
    services: ['Konsultasi Gigi', 'Scaling', 'Tambal Gigi', 'Cabut Gigi', 'Bleaching']
  }
];

// Export simple array untuk dropdown
export const SPECIALIZATION_OPTIONS = DENTAL_SPECIALIZATIONS.map(spec => spec.name);

// Export ke map untuk lookup cepat
export const SPECIALIZATION_MAP = DENTAL_SPECIALIZATIONS.reduce((acc, spec) => {
  acc[spec.id] = spec;
  return acc;
}, {});

// Helper function untuk get specialty by name
export const getSpecializationByName = (name) => {
  return DENTAL_SPECIALIZATIONS.find(spec => spec.name === name);
};

// Helper function untuk get specialty by code
export const getSpecializationByCode = (code) => {
  return DENTAL_SPECIALIZATIONS.find(spec => spec.code === code);
};
