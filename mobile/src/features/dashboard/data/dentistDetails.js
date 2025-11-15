import { NEARBY_DENTISTS } from './dentists';

const enrich = (base, extra) => ({
  ...base,
  ...extra,
  price: extra.price ?? base.price,
});

const BASE_BIO =
  'Combines evidence-based dentistry with a warm bedside manner, helping patients feel empowered about their oral health. Passionate about minimally invasive treatment plans and preventive care.';

export const DENTIST_DETAILS = [
  enrich(NEARBY_DENTISTS[0], {
    experience: '12 years',
    languages: ['English', 'Bahasa Indonesia'],
    bio: BASE_BIO,
    specialties: ['Clear Aligners', 'TMJ Therapy', 'Smile Design'],
    services: [
      { name: 'Orthodontic Consultation', price: 350000 },
      { name: 'Clear Aligner Fitting', price: 2200000 },
      { name: 'Retention Plan', price: 900000 },
    ],
    availability: [
      { day: 'Mon - Tue', slots: ['09:00', '13:00', '16:00'] },
      { day: 'Thu - Fri', slots: ['10:00', '14:00'] },
      { day: 'Sat', slots: ['09:00', '11:30'] },
    ],
    achievements: [
      { title: 'Invisalign Diamond Provider', year: 2023 },
      { title: 'Speaker, SEA Orthodontic Summit', year: 2022 },
    ],
    stories: [
      { patient: 'Amelia P.', summary: 'Explained every step of my aligner journey—super reassuring!', rating: 5 },
      { patient: 'Jonathan R.', summary: 'Flexible schedules and noticeable results in 4 months.', rating: 4.8 },
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
    responseTime: '1h',
  }),
  enrich(NEARBY_DENTISTS[1], {
    experience: '9 years',
    languages: ['English', 'Bahasa Indonesia', 'Malay'],
    bio: 'Pediatric-focused dentist helping little ones overcome dental anxiety with playful, tech-assisted visits.',
    specialties: ['Preventive Care', 'Fluoride Therapy', 'Comfort Dentistry'],
    services: [
      { name: 'Pediatric Consultation', price: 280000 },
      { name: 'Fluoride Treatment', price: 180000 },
      { name: 'Sealant Application', price: 320000 },
    ],
    availability: [
      { day: 'Tue - Thu', slots: ['10:00', '13:00', '15:00'] },
      { day: 'Sat', slots: ['09:00', '11:00'] },
    ],
    achievements: [{ title: 'Kids Dentist of the Year - Jakarta', year: 2021 }],
    stories: [
      { patient: 'Parent of Fara', summary: 'My daughter finally enjoys her check-ups.', rating: 5 },
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
    responseTime: '45m',
  }),
  // Add extended mock entries for remaining dentists
  ...NEARBY_DENTISTS.slice(2).map((d, index) =>
    enrich(d, {
      experience: `${8 + index} years`,
      languages: ['English', 'Bahasa Indonesia'],
      bio: BASE_BIO,
      specialties: ['Preventive Care', 'Digital Dentistry'],
      services: [
        { name: 'Comprehensive Check-up', price: d.price },
        { name: 'Digital X-Ray', price: 180000 },
        { name: 'Whitening Session', price: 750000 },
      ],
      availability: [
        { day: 'Mon - Fri', slots: ['10:00', '14:00', '18:00'] },
      ],
      achievements: [{ title: 'Top Reviewed Dentist', year: 2022 }],
      stories: [
        { patient: 'Maya L.', summary: 'Modern equipment and efficient visits.', rating: 4.7 },
      ],
      gallery: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800'],
      contact: {
        phone: '+62 817-8899-000',
        email: 'info@sereneclinic.id',
        address: 'Jl. Kemang Raya No. 7, Jakarta',
      },
      patientsHelped: 1200 + index * 120,
      responseTime: '2h',
    })
  ),
];

export const getDentistDetail = (id) =>
  DENTIST_DETAILS.find((d) => d.id === id) || DENTIST_DETAILS[0];
