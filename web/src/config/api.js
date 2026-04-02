const explicitPyApiBase = import.meta.env.VITE_XCORE_API_BASE_URL?.replace(/\/$/, '');

export const PY_API_BASE =
  explicitPyApiBase ||
  '/py-api';

export const NODE_API_BASE =
  import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:4000';
