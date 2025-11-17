import { NEARBY_DENTISTS } from './dentists';

const enrich = (base, extra) => ({
  ...base,
  ...extra,
  price: extra.price ?? base.price,
});

const BASE_BIO =
  'Menggabungkan kedokteran gigi berbasis bukti dengan pendekatan yang hangat sehingga pasien merasa percaya diri dengan kesehatan mulutnya. Berfokus pada perawatan minimal invasif dan pencegahan.';

export const DENTIST_DETAILS = [
  enrich(NEARBY_DENTISTS[0], {
    experience: '12 tahun',
    languages: ['Inggris', 'Bahasa Indonesia'],
    bio: BASE_BIO,
    specialties: ['Behel transparan', 'Terapi TMJ', 'Desain senyum'],
    services: [
      { name: 'Konsultasi ortodonti', price: 350000 },
      { name: 'Pemasangan clear aligner', price: 2200000 },
      { name: 'Rencana retainer', price: 900000 },
    ],
    availability: [
      { day: 'Senin - Selasa', slots: ['09:00', '13:00', '16:00'] },
      { day: 'Kamis - Jumat', slots: ['10:00', '14:00'] },
      { day: 'Sabtu', slots: ['09:00', '11:30'] },
    ],
    achievements: [
      { title: 'Invisalign Diamond Provider', year: 2023 },
      { title: 'Pembicara SEA Orthodontic Summit', year: 2022 },
    ],
    stories: [
      { patient: 'Amelia P.', summary: 'Setiap langkah perawatan aligner dijelaskan dengan detail, bikin tenang.', rating: 5 },
      { patient: 'Jonathan R.', summary: 'Jadwal fleksibel dan hasil terlihat dalam 4 bulan.', rating: 4.8 },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=800',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    ],
    contact: {
      phone: '+62 812-3344-5566',
      email: 'hello@glowdental.id',
      address: 'Jl. Senopati No. 88, Jakarta Selatan',
    },
    patientsHelped: 1800,
    responseTime: '1 jam',
  }),
  enrich(NEARBY_DENTISTS[1], {
    experience: '9 tahun',
    languages: ['Inggris', 'Bahasa Indonesia', 'Melayu'],
    bio: 'Dokter gigi anak yang membantu si kecil mengatasi rasa takut lewat kunjungan yang fun dan penuh teknologi.',
    specialties: ['Perawatan preventif', 'Terapi fluoride', 'Kenyamanan pasien anak'],
    services: [
      { name: 'Konsultasi gigi anak', price: 280000 },
      { name: 'Perawatan fluoride', price: 180000 },
      { name: 'Aplikasi sealant', price: 320000 },
    ],
    availability: [
      { day: 'Selasa - Kamis', slots: ['10:00', '13:00', '15:00'] },
      { day: 'Sabtu', slots: ['09:00', '11:00'] },
    ],
    achievements: [{ title: 'Kids Dentist of the Year Jakarta', year: 2021 }],
    stories: [
      { patient: 'Orang tua Fara', summary: 'Putri saya akhirnya suka kontrol gigi.', rating: 5 },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
    ],
    contact: {
      phone: '+62 813-5566-7788',
      email: 'care@littlesmiles.id',
      address: 'Jl. Wijaya II No. 12, Jakarta Selatan',
    },
    patientsHelped: 950,
    responseTime: '45 menit',
  }),
  // Add extended mock entries for remaining dentists
  ...NEARBY_DENTISTS.slice(2).map((d, index) =>
    enrich(d, {
      experience: `${8 + index} tahun`,
      languages: ['Inggris', 'Bahasa Indonesia'],
      bio: BASE_BIO,
      specialties: ['Perawatan preventif', 'Kedokteran gigi digital'],
      services: [
        { name: 'Pemeriksaan menyeluruh', price: d.price },
        { name: 'Rontgen digital', price: 180000 },
        { name: 'Sesi pemutihan gigi', price: 750000 },
      ],
      availability: [
        { day: 'Senin - Jumat', slots: ['10:00', '14:00', '18:00'] },
      ],
      achievements: [{ title: 'Dokter gigi dengan ulasan terbaik', year: 2022 }],
      stories: [
        { patient: 'Maya L.', summary: 'Peralatan modern dan prosesnya efisien.', rating: 4.7 },
      ],
      gallery: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'],
      contact: {
        phone: '+62 817-8899-000',
        email: 'info@sereneclinic.id',
        address: 'Jl. Kemang Raya No. 7, Jakarta',
      },
      patientsHelped: 1200 + index * 120,
      responseTime: '2 jam',
    })
  ),
];

export const getDentistDetail = (id) =>
  DENTIST_DETAILS.find((d) => d.id === id) || DENTIST_DETAILS[0];
