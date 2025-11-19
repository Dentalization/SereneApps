import admin from 'firebase-admin';
import { isPushConfigured, notificationConfig } from '../config.js';

let firebaseApp = null;

function initFirebaseApp() {
  if (firebaseApp || !isPushConfigured()) {
    return firebaseApp;
  }

  firebaseApp = admin.initializeApp(
    {
      credential: admin.credential.cert(notificationConfig.fcm.serviceAccount)
    },
    'notifications-app'
  );

  return firebaseApp;
}

function chunkTokens(tokens, size = 500) {
  const chunks = [];
  for (let i = 0; i < tokens.length; i += size) {
    chunks.push(tokens.slice(i, i + size));
  }
  return chunks;
}

export async function sendPushNotification({ tokens = [], notification, data = {}, apnsOptions = {} }) {
  if (!isPushConfigured()) {
    throw new Error('Push notifications are not configured');
  }
  if (!tokens?.length) {
    throw new Error('No device tokens registered for push channel');
  }

  const messaging = initFirebaseApp().messaging();
  const batches = chunkTokens(tokens);
  let totalSuccess = 0;
  let totalFailure = 0;
  let lastError = null;

  for (const chunk of batches) {
    const message = {
      tokens: chunk,
      notification,
      data,
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            ...apnsOptions.aps
          }
        }
      }
    };

    const response = await messaging.sendEachForMulticast(message);
    totalSuccess += response.successCount;
    totalFailure += response.failureCount;
    response.responses.forEach((res) => {
      if (!res.success) {
        lastError = res.error;
      }
    });
  }

  if (totalFailure > 0 && totalSuccess === 0) {
    const error = new Error(`Push notification failed for ${totalFailure} device(s)`);
    if (lastError) {
      error.details = lastError.message;
    }
    throw error;
  }

  return { success: totalSuccess, failed: totalFailure };
}
