import api from './api';

export async function getNearbyClinics(params) {
  const {
    latitude,
    longitude,
    radius = 10,
    limit = 12,
    offset = 0,
  } = params;

  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius: radius.toString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  console.log('🌐 [clinicService] Calling API:', `/clinics/nearby?${query.toString()}`);
  const response = await api.get(`/clinics/nearby?${query.toString()}`);
  console.log('🌐 [clinicService] Raw response.data:', response.data);
  console.log('🌐 [clinicService] response.data.data:', response.data?.data);
  console.log('🌐 [clinicService] response.data.data.clinics:', response.data?.data?.clinics);
  
  const result = response.data?.data ?? response.data;
  console.log('🌐 [clinicService] Returning:', result);
  return result;
}

export async function getClinics(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const response = await api.get(`/clinics${query.toString() ? `?${query.toString()}` : ''}`);
  return response.data;
}

export async function getClinicById(id) {
  console.log('🌐 [clinicService] Fetching clinic by ID:', id);
  const response = await api.get(`/clinics/${id}`);
  console.log('🌐 [clinicService] Clinic detail response:', response.data);
  return response.data?.data ?? response.data;
}

export async function getClinicDentists(id, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  const url = `/clinics/${id}/dentists${query.toString() ? `?${query.toString()}` : ''}`;
  console.log('🌐 [clinicService] Fetching clinic dentists via', url);
  const response = await api.get(url);
  return response.data?.data ?? response.data;
}

export default {
  getNearbyClinics,
  getClinics,
  getClinicById,
  getClinicDentists,
};
