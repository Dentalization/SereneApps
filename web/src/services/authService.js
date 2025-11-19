import { authHttp } from 'utils/httpClient';

export async function loginApi({ email, password }) {
  const { data } = await authHttp.post('/auth/login', { email, password });
  return data; // expected: { accessToken, refreshToken, user }
}

export async function meApi() {
  const { data } = await authHttp.get('/auth/me');
  return data; // expected: { id, email, roles, ... }
}

export async function logoutApi() {
  try {
    await authHttp.post('/auth/logout');
  } catch {
    // ignore
  }
}

export async function registerApi(registrationData, config = {}) {
  // If registrationData is FormData, don't set content-type header
  // Browser will set it automatically with boundary for multipart/form-data
  const headers = registrationData instanceof FormData 
    ? {} 
    : { 'Content-Type': 'application/json' };
  
  const finalConfig = {
    headers: {
      ...headers,
      ...config.headers
    }
  };
  
  const { data } = await authHttp.post('/auth/register', registrationData, finalConfig);
  return data; // may return { accessToken, refreshToken, user } or { ok: true }
}

export async function getDentistProfileApi() {
  const { data } = await authHttp.get('/auth/dentist-profile');
  return data; // expected: { id, name, clinicWorkingHours, ... }
}

export async function updateUserProfileApi(profileData) {
  const { data } = await authHttp.put('/auth/user/profile', profileData);
  return data;
}

export async function changePasswordApi(passwordData) {
  const { data } = await authHttp.put('/auth/user/password', passwordData);
  return data;
}
