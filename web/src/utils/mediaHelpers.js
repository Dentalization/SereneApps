const AUTH_API_BASE = (import.meta.env.VITE_AUTH_API_BASE_URL || '').replace(/\/$/, '');

const buildAbsoluteUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (!AUTH_API_BASE) return value;
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${AUTH_API_BASE}${normalized}`;
};

const PATIENT_IMAGE_KEYS = [
  'profilePicture',
  'profile_image',
  'profile_pic',
  'avatar',
  'avatarUrl',
  'avatar_url',
  'photo',
  'photoUrl',
  'image',
  'imageUrl',
  'picture',
  'thumbnail',
  'mediaUrl',
];

export const resolvePatientAvatar = (patient = {}) => {
  if (!patient || typeof patient !== 'object') return null;
  for (const key of PATIENT_IMAGE_KEYS) {
    const candidate = patient[key];
    if (candidate) {
      const resolved = buildAbsoluteUrl(candidate);
      if (resolved) return resolved;
    }
  }
  return null;
};

export const resolveMediaUrl = buildAbsoluteUrl;
