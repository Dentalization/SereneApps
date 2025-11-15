# Clinic Detail Screen

This document defines the UX contract for `ClinicDetailScreen` (`mobile/src/features/appointment/screens/ClinicDetailScreen.jsx`) and the data it consumes from `mobile/src/features/appointment/data/appointments.js`.

## Hero section
- Gradient background with back button, name, rating, address, and distance.
- Quick stats pill row:
  - `tech` → example: `Digital 3D Scan`
  - `patients` → example: `2.1k pasien`
  - `operationalHours` short summary.

## Clinic entity shape
```ts
type Clinic = {
  id: string;
  name: string;
  tagline: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  phone: string;
  email: string;
  operationalHours: string;
  stats: { dentists: number; patients: string; rooms: string };
  highlights: string[];
  services: { name: string; price: number; description: string }[];
  gallery: string[];
  dentists: string[]; // array of dentist ids
};
```

## UI blocks
1. **Highlights chips** – use `clinic.tagline` + `clinic.highlights`.
2. **Services list** – show name, short description, formatted fee.
3. **Gallery carousel** – horizontal scroll of images.
4. **Dentist roster** – cards derived from `clinic.dentists` (call `getDentistById`). Each card:
   - Avatar (use `dentist.avatar`).
   - Name, specialty, rating.
   - CTA buttons: `Lihat profil` (→ DentistDetail) and `Pilih jadwal` (→ BookingSlot).
5. **Contact card** – phone + email + address button (open map later).
6. **Sticky CTA** – “Book onsite” (navigate to BookingSlot with first dentist) and “Chat clinic” placeholder.

## Data source
- `mobile/src/features/appointment/data/appointments.js` exports:
  - `CLINICS` array (see example below).
  - `getClinicById(id)` helper.
  - `getDentistById(id)` re-used for roster.

Example entry:
```js
{
  id: 'clinic-001',
  name: 'SereneAI Dental Sudirman',
  tagline: 'Digital-first smile studio',
  address: 'Jl. Jend. Sudirman No. 12, Jakarta Pusat',
  distance: '1.2 km',
  rating: 4.9,
  reviews: 276,
  phone: '+62 812-3344-5566',
  email: 'hello@sudirmandental.id',
  operationalHours: 'Setiap hari · 08:00 - 21:00',
  stats: { dentists: 6, patients: '2.1k', rooms: '8 Smart Rooms' },
  highlights: ['Digital 3D Scan', 'Sedation ready', 'Child-friendly'],
  services: [
    { name: 'Konsultasi Orthodontic', price: 280000, description: 'Penilaian komprehensif + rencana aligner' },
    { name: 'Scaling & polishing', price: 480000, description: 'Pembersihan ultrasonik + fluor' },
    { name: 'Laser whitening express', price: 950000, description: '60 menit, aman untuk enamel sensitif' },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900',
    'https://images.unsplash.com/photo-1487412720507-e75fd3b8d278?w=900',
  ],
  dentists: ['dentist-001', 'dentist-003', 'dentist-004'],
}
```

## Navigation
- Dentist cards: `navigation.navigate('DentistDetail', { dentistId, dentist })`.
- CTA “Book onsite” defaults to first dentist id.
- Hide bottom tab bar via `useFocusEffect`.
