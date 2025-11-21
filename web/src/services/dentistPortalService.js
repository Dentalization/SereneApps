import { authHttp } from '../utils/httpClient';

export async function getDentistServicesContext() {
  const { data } = await authHttp.get('/dentist/services/context');
  return data;
}

export async function getIndependentServices() {
  const { data } = await authHttp.get('/dentist/practice/services');
  return data.services || [];
}

export async function createIndependentService(payload) {
  const { data } = await authHttp.post('/dentist/practice/services', payload);
  return data.service;
}

export async function updateIndependentService(serviceId, payload) {
  const { data } = await authHttp.put(`/dentist/practice/services/${serviceId}`, payload);
  return data.service;
}

export async function deleteIndependentService(serviceId) {
  const { data } = await authHttp.delete(`/dentist/practice/services/${serviceId}`);
  return data;
}

export async function getClinicDentistServices() {
  const { data } = await authHttp.get('/dentist/clinic/services');
  return data;
}
