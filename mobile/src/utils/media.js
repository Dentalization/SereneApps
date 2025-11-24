import { API_BASE_URL } from '../services/api';

export const resolveMediaUrl = (input) => {
  if (!input) return null;
  const path = typeof input === 'string' ? input.trim() : '';
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:image')) return path;
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
};

export default resolveMediaUrl;
