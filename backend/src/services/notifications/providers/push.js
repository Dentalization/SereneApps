import admin from 'firebase-admin';
import { notificationConfig } from '../config.js';

let firebaseApp = null;

function initFirebaseApp() {
  if (firebaseApp || !notificationConfig.fcm.serviceAccount) {
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

function chunkExpoMessages(messages, size = 100) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size));
  }
  return chunks;
}

export async function sendExpoPushNotification({ tokens = [], notification, data = {} }) {
  if (!tokens?.length) {
    throw new Error('No Expo push tokens registered for push channel');
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title: notification?.title || 'SereneApps',
    body: notification?.body || '',
    data: data || {}
  }));

  let totalSuccess = 0;
  let totalFailure = 0;
  let lastError = null;

  for (const chunk of chunkExpoMessages(messages)) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      totalFailure += chunk.length;
      lastError = new Error(`Expo push API returned ${response.status}`);
      continue;
    }

    const body = await response.json();
    const receipts = Array.isArray(body?.data) ? body.data : [body?.data].filter(Boolean);
    receipts.forEach((receipt) => {
      if (receipt?.status === 'ok') {
        totalSuccess += 1;
      } else {
        totalFailure += 1;
        lastError = new Error(receipt?.message || receipt?.details?.error || 'Expo push ticket failed');
      }
    });
  }

  if (totalFailure > 0 && totalSuccess === 0) {
    const error = new Error(`Expo push notification failed for ${totalFailure} device(s)`);
    if (lastError) error.details = lastError.message;
    throw error;
  }

  return { success: totalSuccess, failed: totalFailure };
}

export async function sendPushNotification({ tokens = [], notification, data = {}, apnsOptions = {} }) {
  if (!notificationConfig.fcm.serviceAccount) {
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
