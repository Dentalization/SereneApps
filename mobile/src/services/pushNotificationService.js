import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import api from './api';

const REMINDER_CHANNEL_ID = 'appointment-reminders';

const getExpoProjectId = () => (
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId ||
  Constants.manifest2?.extra?.eas?.projectId ||
  Constants.manifest?.extra?.eas?.projectId ||
  null
);

export async function registerAppointmentReminderPushToken() {
  if (Constants.isDevice === false) {
    if (__DEV__) console.log('[PushNotifications] Skipping push registration on simulator/emulator');
    return { registered: false, reason: 'not_physical_device' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Appointment reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return { registered: false, reason: 'permission_denied' };
  }

  const projectId = getExpoProjectId();
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResult?.data;
  if (!token) {
    return { registered: false, reason: 'token_unavailable' };
  }

  await api.post('/notifications/devices', {
    token,
    provider: 'expo',
    platform: Platform.OS,
    metadata: {
      channelId: REMINDER_CHANNEL_ID,
      appOwnership: Constants.appOwnership || null,
      projectId: projectId || null,
      source: 'mobile_appointment_reminders',
    },
  });

  return { registered: true, token };
}

export function subscribeAppointmentReminderResponses(navigation) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    const appointmentId = data.appointment_id || data.appointmentId;
    if (!appointmentId || data.event_type !== 'appointment_reminder') return;

    navigation?.navigate?.('AppointmentTab', {
      screen: data.screen === 'PatientTeledentistry' ? 'PatientTeledentistry' : 'DetailAppointment',
      params: {
        appointmentId: appointmentId.toString(),
        dentistName: data.dentist_name || undefined,
        appointmentDate: data.starts_at || undefined,
      },
    });
  });

  return () => subscription.remove();
}

export default {
  registerAppointmentReminderPushToken,
  subscribeAppointmentReminderResponses,
};
