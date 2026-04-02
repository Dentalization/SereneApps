export const PY_API_BASE =
  import.meta.env.VITE_SERENE_AI_API_BASE_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000';

export const NODE_API_BASE =
  import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:4000';
