import api from './api';

export async function getNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return data;
}

export async function markNotificationAsRead(id) {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data;
}
