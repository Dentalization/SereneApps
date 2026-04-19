// Brand Colors (Primary di-set ke #62109F)
export const brandColors = {
  primary: {
    main: '#62109F',
    light: '#982BEA',   // tint lebih cerah utk hover/gradients
    dark:  '#450B71',   // shade untuk emphasis/dark mode
    contrast: '#FFFFFF' // teks/ikon di atas primary
  },
  secondary: {
    // Teal “medic & fresh” yang harmonis dengan ungu
    main: '#00BFA6',
    light: '#5DF2D6',
    dark:  '#008E76',
    contrast: '#FFFFFF',
  },
  accent: {
    // Aksen hangat untuk CTA sekunder/badge promosi
    main: '#FF6B9D',
    light: '#FFB4C8',
    dark:  '#C73E6E',
    contrast: '#FFFFFF',
  },
};

// Semantic Colors (standar klinis; stabil dan familiar)
export const semanticColors = {
  success: {
    main: '#4CAF50',
    light: '#80E27E',
    dark:  '#087F23',
    background: '#E8F5E9',
    border: '#A5D6A7',
    contrast: '#FFFFFF',
  },
  warning: {
    main: '#FF9800',
    light: '#FFD54F',
    dark:  '#EF6C00',
    background: '#FFF3E0',
    border: '#FFB74D',
    contrast: '#000000',
  },
  error: {
    main: '#F44336',
    light: '#FF7961',
    dark:  '#BA000D',
    background: '#FFEBEE',
    border: '#EF5350',
    contrast: '#FFFFFF',
  },
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark:  '#1565C0',
    background: '#E3F2FD',
    border: '#90CAF9',
    contrast: '#FFFFFF',
  },
};

// Neutral Colors (UI chrome, teks, divider)
export const neutralColors = {
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50:  '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

// Medical Alert Colors (untuk banner risiko klinis)
export const medicalAlertColors = {
  critical: {
    background: '#FFEBEE',
    text: '#BA000D',
    border: '#F44336',
    icon: '#D32F2F',
    badge: '#F44336',
  },
  high: {
    background: '#FFF3E0',
    text: '#EF6C00',
    border: '#FF9800',
    icon: '#F57C00',
    badge: '#FF9800',
  },
  medium: {
    background: '#FFF9C4',
    text: '#F57F17',
    border: '#FFEB3B',
    icon: '#FBC02D',
    badge: '#FFEB3B',
  },
  low: {
    background: '#E8F5E9',
    text: '#087F23',
    border: '#4CAF50',
    icon: '#388E3C',
    badge: '#4CAF50',
  },
};

// AI Diagnosis Colors (kartu hasil AI)
export const aiDiagnosisColors = {
  healthy: {
    background: '#E8F5E9',
    text: '#087F23',
    icon: '#4CAF50',
    progress: '#4CAF50',
  },
  warning: {
    background: '#FFF3E0',
    text: '#EF6C00',
    icon: '#FF9800',
    progress: '#FF9800',
  },
  critical: {
    background: '#FFEBEE',
    text: '#BA000D',
    icon: '#F44336',
    progress: '#F44336',
  },
  processing: {
    background: '#E3F2FD',
    text: '#1565C0',
    icon: '#2196F3',
    progress: '#2196F3',
  },
};

// E-commerce Colors (untuk tab Shop)
export const ecommerceColors = {
  price: {
    original: '#757575',
    discount: '#F44336',
    final: '#212121',
  },
  stock: {
    inStock: '#4CAF50',
    lowStock: '#FF9800',
    outOfStock: '#F44336',
  },
  rating: {
    filled: '#FFB300',
    empty: '#E0E0E0',
  },
  badge: {
    new: '#62109F',     // pakai primary brand
    sale: '#F44336',
    bestseller: '#FF9800',
    recommended: '#1976D2',
  },
};

// Appointment Status Colors (status janji temu)
export const appointmentColors = {
  scheduled: {
    background: '#E3F2FD',
    text: '#1565C0',
    border: '#90CAF9',
    icon: '#2196F3',
  },
  confirmed: {
    background: '#E8F5E9',
    text: '#087F23',
    border: '#A5D6A7',
    icon: '#4CAF50',
  },
  inProgress: {
    background: '#FFF3E0',
    text: '#EF6C00',
    border: '#FFB74D',
    icon: '#FF9800',
  },
  completed: {
    background: '#F1E8F8', // lembut, turunannya ungu
    text: '#450B71',
    border: '#D2B5F2',
    icon: '#62109F',       // pakai primary sebagai ikon selesai
  },
  cancelled: {
    background: '#FFEBEE',
    text: '#BA000D',
    border: '#EF5350',
    icon: '#F44336',
  },
};

// Gradients (gunakan primary baru untuk hero/CTA)
export const gradients = {
  primary:   ['#62109F', '#982BEA'],
  secondary: ['#00BFA6', '#5DF2D6'],
  success:   ['#4CAF50', '#80E27E'],
  warning:   ['#FF9800', '#FFD54F'],
  error:     ['#F44336', '#FF7961'],
  dark:      ['#212121', '#424242'],
  shimmer:   ['#F0F0F0', '#E0E0E0', '#F0F0F0'],
};

// Shadows (iOS + Android elevation)
export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Flattened Colors requested by audit
export const colors = {
  primary: '#7C3AED',
  primaryLight: '#A855F7',
  primaryDark: '#5B21B6',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#DC2626',
  border: '#E2E8F0',
};

/**
 * Utility to add opacity to a hex color
 * @param {string} hex - 6-digit or 3-digit hex color
 * @param {number} opacity - 0 to 1
 * @returns {string} - rgba color string for React Native
 */
export const withOpacity = (hex, opacity) => {
  if (!hex || typeof hex !== 'string') return hex;
  const cleanedHex = hex.replace('#', '');
  const r = parseInt(cleanedHex.length === 3 ? cleanedHex.slice(0, 1).repeat(2) : cleanedHex.slice(0, 2), 16);
  const g = parseInt(cleanedHex.length === 3 ? cleanedHex.slice(1, 2).repeat(2) : cleanedHex.slice(2, 4), 16);
  const b = parseInt(cleanedHex.length === 3 ? cleanedHex.slice(2, 3).repeat(2) : cleanedHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
