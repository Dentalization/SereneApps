import { Platform } from 'react-native';

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
    return 'http://localhost:4000';
  }
  return 'https://api.dentalization.id';
};

export const resolveMediaUrl = (path) => {
  if (!path) return null;
  if (typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // If path is relative like '/uploads/avatars/...' or 'uploads/avatars/...'
  if (path.startsWith('/')) return `${getApiBaseUrl()}${path}`;
  return `${getApiBaseUrl()}/${path}`;
};

export default resolveMediaUrl;
