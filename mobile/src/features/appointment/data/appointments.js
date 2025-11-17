const now = new Date();
const todayISO = now.toISOString().split('T')[0];

const makeDate = (dayOffset, hour, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const addMinutesISO = (iso, minutes) => {
  const base = new Date(iso);
  return new Date(base.getTime() + minutes * 60000).toISOString();
};

export const CLINICS = [
  {
    id: 'clinic-001',
    name: 'SereneAI Dental Sudirman',
    tagline: 'Studio senyum berbasis digital',
    address: 'Jl. Jend. Sudirman No. 12, Jakarta Pusat',
    distance: '1.2 km',
    rating: 4.9,
    reviews: 276,
    phone: '+62 812-3344-5566',
    email: 'hello@sudirmandental.id',
    operationalHours: 'Setiap hari · 08:00 - 21:00',
    stats: { dentists: 6, patients: '2,1 rb', rooms: '8 ruang pintar' },
    highlights: ['Pemindaian 3D digital', 'Siap sedasi', 'Ramah anak'],
    services: [
      { name: 'Konsultasi ortodonti', price: 280000, description: 'Penilaian komprehensif + rencana aligner' },
      { name: 'Scaling dan polishing', price: 480000, description: 'Pembersihan ultrasonik + fluor' },
      { name: 'Whitening laser ekspres', price: 950000, description: '60 menit, aman untuk enamel sensitif' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900',
      'https://images.unsplash.com/photo-1487412720507-e75fd3b8d278?w=900',
    ],
    dentists: ['dentist-001', 'dentist-003', 'dentist-004'],
  },
  {
    id: 'clinic-002',
    name: 'Glow Dental Menteng',
    tagline: 'Klinik kosmetik butik',
    address: 'Jl. Menteng Raya No. 22, Jakarta Pusat',
    distance: '2.5 km',
    rating: 4.7,
    reviews: 198,
    phone: '+62 813-7788-9922',
    email: 'cs@glowdental.id',
    operationalHours: 'Senin - Sabtu · 09:00 - 20:00',
    stats: { dentists: 4, patients: '1,4 rb', rooms: '5 ruang pintar' },
    highlights: ['Konsultasi virtual', 'Studio pemutihan', 'Zona anak'],
    services: [
      { name: 'Konsultasi desain senyum', price: 350000, description: 'Simulasi digital & rencana perawatan' },
      { name: 'Whitening premium', price: 1250000, description: 'Whitening LED dual-light' },
    ],
    gallery: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1000',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1000',
    ],
    dentists: ['dentist-002'],
  },
];

const DENTIST_SEED = [
  {
    id: 'dentist-001',
    name: 'Dr. Sarah Johnson',
    specialty: 'Spesialis ortodonti',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200',
    rating: 4.9,
    clinicId: 'clinic-001',
  },
  {
    id: 'dentist-002',
    name: 'Dr. Thomas Mitchell',
    specialty: 'Spesialis periodonti',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200',
    rating: 4.8,
    clinicId: 'clinic-002',
  },
  {
    id: 'dentist-003',
    name: 'Dr. Amelia Santoso',
    specialty: 'Dokter gigi kosmetik',
    avatar: 'https://images.unsplash.com/photo-1544723795-432537f06021?w=200',
    rating: 4.9,
    clinicId: 'clinic-001',
  },
  {
    id: 'dentist-004',
    name: 'Dr. Daniel Wirawan',
    specialty: 'Spesialis implan',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
    rating: 4.7,
    clinicId: 'clinic-001',
  },
];

export const DENTISTS = DENTIST_SEED.map((dentist) => ({
  ...dentist,
  clinic: CLINICS.find((clinic) => clinic.id === dentist.clinicId),
}));

export const APPOINTMENTS = [
  {
    id: 'apt-001',
    status: 'upcoming',
    type: 'virtual',
    startsAt: makeDate(0, now.getHours() + 1),
    endsAt: addMinutesISO(makeDate(0, now.getHours() + 1), 30),
    reason: 'Kontrol aligner',
    clinic: DENTISTS[0].clinic,
    dentist: DENTISTS[0],
    actions: { canJoinCall: true, canReschedule: true, canCancel: true },
    billing: { fee: 280000, method: 'card' },
  },
  {
    id: 'apt-002',
    status: 'upcoming',
    type: 'onsite',
    startsAt: makeDate(2, 10, 0),
    endsAt: addMinutesISO(makeDate(2, 10, 0), 45),
    reason: 'Scaling dan polishing',
    clinic: DENTISTS[1].clinic,
    dentist: DENTISTS[1],
    actions: { canJoinCall: false, canReschedule: true, canCancel: true },
    billing: { fee: 480000, method: 'cash' },
  },
  {
    id: 'apt-003',
    status: 'completed',
    type: 'onsite',
    startsAt: makeDate(-10, 15, 0),
    endsAt: addMinutesISO(makeDate(-10, 15, 0), 30),
    reason: 'Pembersihan karang gigi',
    clinic: DENTISTS[0].clinic,
    dentist: DENTISTS[0],
    actions: { canJoinCall: false, canReschedule: false, canCancel: false },
    billing: { fee: 350000, method: 'wallet' },
  },
];

export const SLOT_AVAILABILITY = [
  {
    dentistId: 'dentist-001',
    date: todayISO,
    slots: [
      { time: '09:00', duration: 30, type: 'onsite', isAvailable: true },
      { time: '09:30', duration: 30, type: 'virtual', isAvailable: false },
      { time: '10:00', duration: 30, type: 'onsite', isAvailable: true },
      { time: '14:30', duration: 30, type: 'virtual', isAvailable: true },
      { time: '15:00', duration: 30, type: 'onsite', isAvailable: true },
    ],
  },
  {
    dentistId: 'dentist-001',
    date: new Date(new Date(todayISO).getTime() + 86400000).toISOString().split('T')[0],
    slots: [
      { time: '10:30', duration: 30, type: 'virtual', isAvailable: true },
      { time: '11:00', duration: 30, type: 'virtual', isAvailable: true },
      { time: '13:00', duration: 30, type: 'onsite', isAvailable: true },
      { time: '16:00', duration: 30, type: 'onsite', isAvailable: false },
    ],
  },
  {
    dentistId: 'dentist-002',
    date: todayISO,
    slots: [
      { time: '08:30', duration: 45, type: 'onsite', isAvailable: true },
      { time: '11:15', duration: 45, type: 'onsite', isAvailable: true },
      { time: '13:45', duration: 45, type: 'virtual', isAvailable: true },
    ],
  },
];

export const REMINDER_MINUTES = [15, 30, 60, 120];

export const getAppointmentsByStatus = (status) =>
  APPOINTMENTS.filter((apt) => (status === 'all' ? true : apt.status === status));

export const getAppointmentById = (id) => APPOINTMENTS.find((apt) => apt.id === id);

export const getDentistById = (id) => DENTISTS.find((doc) => doc.id === id);

export const getSlotsForDate = (dentistId, date) =>
  SLOT_AVAILABILITY.find((entry) => entry.dentistId === dentistId && entry.date === date);

export const getClinicById = (id) => CLINICS.find((clinic) => clinic.id === id);
