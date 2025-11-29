import { authHttp } from '../utils/httpClient';

export const fetchEmrList = async () => {
  const { data } = await authHttp.get('/emr');
  return data;
};

export const createEmrRecord = async (payload) => {
  const { data } = await authHttp.post('/emr', payload);
  return data;
};

export const fetchEmrById = async (id) => {
  const { data } = await authHttp.get(`/emr/${id}`);
  return data;
};
