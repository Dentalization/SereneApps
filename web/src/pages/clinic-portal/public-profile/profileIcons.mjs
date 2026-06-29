const normalize = (value) => String(value || '').trim().toLowerCase();

export const HIGHLIGHT_ICON_OPTIONS = [
  { value: 'verified', label: 'Keunggulan terverifikasi', icon: 'BadgeCheck' },
  { value: '24h', label: 'Layanan 24 jam', icon: 'Clock3' },
  { value: 'parking', label: 'Area parkir', icon: 'CircleParking' },
  { value: 'wifi', label: 'Wi-Fi', icon: 'Wifi' },
  { value: 'card', label: 'Pembayaran non-tunai', icon: 'CreditCard' },
  { value: 'child', label: 'Ramah anak', icon: 'Baby' },
  { value: 'accessibility', label: 'Aksesibilitas', icon: 'Accessibility' },
  { value: 'emergency', label: 'Layanan darurat', icon: 'Siren' }
];

export const FACILITY_ICON_OPTIONS = [
  { value: 'hospital', label: 'Fasilitas klinik' },
  { value: 'waiting-room', label: 'Ruang tunggu' },
  { value: 'xray', label: 'Radiologi / X-ray' },
  { value: 'sterilization', label: 'Sterilisasi' },
  { value: 'laboratory', label: 'Laboratorium' },
  { value: 'pharmacy', label: 'Farmasi' },
  { value: 'parking', label: 'Area parkir' },
  { value: 'accessibility', label: 'Aksesibilitas' },
  { value: 'child', label: 'Fasilitas anak' }
];

export function resolveHighlightIcon(icon, text) {
  const source = `${normalize(icon)} ${normalize(text)}`;
  if (source.includes('24') || source.includes('jam')) return 'Clock3';
  if (source.includes('park')) return 'CircleParking';
  if (source.includes('wifi') || source.includes('wi-fi')) return 'Wifi';
  if (source.includes('card') || source.includes('kartu') || source.includes('payment')) return 'CreditCard';
  if (source.includes('child') || source.includes('anak')) return 'Baby';
  if (source.includes('access') || source.includes('difabel')) return 'Accessibility';
  if (source.includes('emergency') || source.includes('darurat')) return 'Siren';
  return HIGHLIGHT_ICON_OPTIONS.find((option) => option.value === normalize(icon))?.icon || 'BadgeCheck';
}

export function resolveFacilityIcon(icon, name) {
  const source = `${normalize(icon)} ${normalize(name)}`;
  if (source.includes('x-ray') || source.includes('xray') || source.includes('radiolog')) return 'ScanLine';
  if (source.includes('wait') || source.includes('tunggu') || source.includes('lounge')) return 'Armchair';
  if (source.includes('park')) return 'CircleParking';
  if (source.includes('access') || source.includes('difabel')) return 'Accessibility';
  if (source.includes('pharmacy') || source.includes('farmasi') || source.includes('obat')) return 'Pill';
  if (source.includes('lab')) return 'Microscope';
  if (source.includes('steril')) return 'ShieldCheck';
  if (source.includes('child') || source.includes('anak')) return 'Baby';
  return 'Hospital';
}
