export const MAX_DEEPDENTAL_IMAGE_BYTES = 12 * 1024 * 1024;
export const MIN_DEEPDENTAL_IMAGE_EDGE = 480;
export const SUPPORTED_DEEPDENTAL_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function buildImageQualityCoach(file, dimensions = null) {
  const type = String(file?.type || '').toLowerCase();
  const size = Number(file?.size || 0);
  const issues = [];
  const suggestions = [];

  if (!file) {
    return {
      status: 'idle',
      canAnalyze: false,
      issues: ['no_image_selected'],
      suggestions: [],
    };
  }

  if (!SUPPORTED_DEEPDENTAL_IMAGE_TYPES.has(type)) {
    issues.push('unsupported_type');
    suggestions.push('Gunakan file JPG, PNG, atau WebP.');
  }

  if (size > MAX_DEEPDENTAL_IMAGE_BYTES) {
    issues.push('file_too_large');
    suggestions.push('Kompres gambar hingga maksimal 12 MB sebelum dianalisis.');
  }

  if (dimensions?.width && dimensions?.height) {
    const shortestEdge = Math.min(dimensions.width, dimensions.height);
    if (shortestEdge < MIN_DEEPDENTAL_IMAGE_EDGE) {
      issues.push('low_resolution');
      suggestions.push('Ambil ulang foto dengan jarak lebih dekat dan fokus lebih tajam.');
    }
  }

  if (issues.includes('unsupported_type') || issues.includes('file_too_large')) {
    return {
      status: 'blocked',
      canAnalyze: false,
      issues,
      suggestions,
    };
  }

  if (issues.length > 0) {
    return {
      status: 'warning',
      canAnalyze: true,
      issues,
      suggestions,
    };
  }

  return {
    status: 'ready',
    canAnalyze: true,
    issues: [],
    suggestions: ['Kualitas awal cukup untuk analisis. Dokter tetap perlu memverifikasi hasil AI.'],
  };
}

export function readImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file || typeof URL === 'undefined') {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}
