import { PrismaClient } from '@prisma/client';
import { notificationConfig, isEmailConfigured, isPushConfigured, isSmsConfigured } from './config.js';
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS, getTemplate } from './templates.js';
import { calculateBackoffSeconds, nowPlusSeconds, buildRecipientSnapshot } from './utils.js';
import { sendExpoPushNotification, sendPushNotification } from './providers/push.js';
import { sendEmailNotification } from './providers/email.js';
import { sendSmsNotification } from './providers/sms.js';

import { emitToUserRooms } from '../../sockets/chat.js';

const prisma = new PrismaClient();

const CHANNEL_AVAILABILITY = {
  push: isPushConfigured,
  email: isEmailConfigured,
  sms: isSmsConfigured
};

const EVENT_CHANNEL_DEFAULTS = {
  appointment_confirmed: { push: true, email: true, sms: false },
  appointment_payment_failed: { push: true, email: true, sms: true },
  appointment_cancelled: { push: true, email: true, sms: true },
  appointment_rescheduled: { push: true, email: true, sms: true },
  chat_invite: { push: true, email: true, sms: false },
  appointment_reminder: { push: true, email: true, sms: true }
};

let workerHandle = null;
const WORKER_INTERVAL_MS = 5000;

function isChannelAvailable(channel) {
  return CHANNEL_AVAILABILITY[channel]?.() ?? false;
}

function defaultPreference(eventType, channel) {
  return EVENT_CHANNEL_DEFAULTS[eventType]?.[channel] ?? false;
}

async function getPreferenceMap(userId) {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId: BigInt(userId) }
  });
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.eventType}:${row.channel}`;
    map.set(key, row.enabled);
  });
  return map;
}

function buildJobsPayload(template, { appointment, recipientRole, payload }) {
  return template.build({ appointment, recipientRole, payload });
}

function determineRecipients(eventType, appointment, payload) {
  const recipients = [];
  if (appointment.patient) {
    recipients.push({ user: appointment.patient, role: 'patient' });
  }
  if (appointment.dentist) {
    recipients.push({ user: appointment.dentist, role: 'dentist' });
  }

  if (eventType === 'appointment_payment_failed') {
    return recipients.filter((entry) => entry.role === 'patient');
  }

  if (eventType === 'chat_invite') {
    const initiatorId = payload?.initiatorId ? payload.initiatorId.toString() : null;
    if (!initiatorId) return recipients;
    return recipients.filter((entry) => entry.user.id.toString() !== initiatorId);
  }

  if (Array.isArray(payload?.recipientRoles) && payload.recipientRoles.length > 0) {
    return recipients.filter((entry) => payload.recipientRoles.includes(entry.role));
  }

  return recipients;
}

export async function queueNotificationEvent({ eventType, appointmentId, payload = {} }) {
  const template = getTemplate(eventType);
  if (!template) {
    return;
  }

  const apptId = BigInt(appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: apptId },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          avatar_url: true
        }
      },
      dentist: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          avatar_url: true,
          dentistProfile: {
            select: {
              avatar_url: true,
              clinicName: true,
              clinicAddress: true
            }
          }
        }
      },
      clinicBranch: {
        select: {
          id: true,
          branchName: true,
          streetAddress: true,
          phone: true
        }
      }
    }
  });

  if (!appointment) {
    console.warn('Notification skipped; appointment not found', appointmentId);
    return;
  }

  const recipients = determineRecipients(eventType, appointment, payload);
  if (recipients.length === 0) {
    return;
  }

  for (const recipient of recipients) {
    const userId = recipient.user.id;
    const preferenceMap = await getPreferenceMap(userId);
    const payloads = buildJobsPayload(template, {
      appointment,
      recipientRole: recipient.role,
      payload
    });

    // Create DB in-app notification first
    try {
      const pushPayload = payloads['push'];
      const dbData = {
        ...(pushPayload?.data || {}),
        appointmentId: appointment.id.toString(),
        startsAt: (appointment.startsAt || appointment.starts_at)?.toISOString?.() || null,
        clinicName: appointment.clinicBranch?.branchName || appointment.dentist?.dentistProfile?.[0]?.clinicName || null,
        clinicAddress: appointment.clinicBranch?.streetAddress || appointment.dentist?.dentistProfile?.[0]?.clinicAddress || null,
        clinicPhone: appointment.clinicBranch?.phone || null,
        dentist: appointment.dentist ? {
          id: appointment.dentist.id.toString(),
          name: appointment.dentist.name,
          avatar_url: appointment.dentist.avatar_url || appointment.dentist.dentistProfile?.[0]?.avatar_url || null
        } : null,
        dentistAvatar: appointment.dentist?.avatar_url || appointment.dentist?.dentistProfile?.[0]?.avatar_url || null,
        patient: appointment.patient ? {
          id: appointment.patient.id.toString(),
          name: appointment.patient.name,
          avatar_url: appointment.patient.avatar_url || null
        } : null,
        status: appointment.status
      };

      const notification = await prisma.notification.create({
        data: {
          user_id: BigInt(userId),
          type: eventType,
          title: pushPayload?.title || 'Notification',
          message: pushPayload?.body || '',
          data: dbData,
          is_read: false
        }
      });

      // Emit realtime socket event to user room
      try {
        emitToUserRooms({
          userIds: [userId],
          eventName: 'notification:new',
          payload: {
            ...notification,
            id: notification.id.toString(),
            user_id: notification.user_id.toString(),
            created_at: notification.created_at.toISOString(),
            read_at: notification.read_at ? notification.read_at.toISOString() : null
          }
        });
      } catch (socketErr) {
        console.error('Failed to emit realtime notification:', socketErr);
      }
    } catch (dbErr) {
      console.error('Failed to create DB notification:', dbErr);
    }

    for (const channel of template.channels) {
      const channelPayload = payloads[channel];
      if (!channelPayload) continue;
      if (!isChannelAvailable(channel)) continue;

      const key = `${eventType}:${channel}`;
      const allowed = preferenceMap.has(key) ? preferenceMap.get(key) : defaultPreference(eventType, channel);
      if (!allowed) continue;

      await prisma.notificationJob.create({
        data: {
          userId,
          channel,
          eventType,
          payload: {
            ...channelPayload,
            recipient: buildRecipientSnapshot(recipient.user),
            metadata: {
              appointmentId: appointment.id.toString(),
              recipientRole: recipient.role
            }
          },
          status: 'pending',
          maxAttempts: notificationConfig.queue.maxAttempts,
          nextAttemptAt: new Date()
        }
      });
    }
  }
}

async function dispatchJob(job) {
  const payload = (job.payload ?? {});
  const recipient = payload.recipient ?? {};

  if (job.channel === 'push') {
    const devices = await prisma.notificationDevice.findMany({
      where: {
        userId: job.userId,
        isActive: true
      }
    });
    const preferredProviders = payload.providers || null;
    const filteredDevices = devices.filter((device) => !preferredProviders || preferredProviders.includes(device.provider));
    const fcmTokens = filteredDevices
      .filter((device) => device.provider !== 'expo')
      .map((device) => device.deviceToken);
    const expoTokens = filteredDevices
      .filter((device) => device.provider === 'expo')
      .map((device) => device.deviceToken);

    if (!fcmTokens.length && !expoTokens.length) {
      throw new Error('No active push tokens for recipient');
    }

    const errors = [];
    if (fcmTokens.length) {
      try {
        await sendPushNotification({
          tokens: fcmTokens,
          notification: payload.notification,
          data: payload.data || {},
          apnsOptions: payload.apnsOptions || {}
        });
      } catch (error) {
        errors.push(error);
      }
    }
    if (expoTokens.length) {
      try {
        await sendExpoPushNotification({
          tokens: expoTokens,
          notification: payload.notification,
          data: payload.data || {}
        });
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length && errors.length === Number(Boolean(fcmTokens.length)) + Number(Boolean(expoTokens.length))) {
      throw errors[0];
    }
    return;
  }

  if (job.channel === 'email') {
    const email = payload.to || recipient.email;
    if (!email) {
      throw new Error('Recipient email not available');
    }
    await sendEmailNotification({
      to: email,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    });
    return;
  }

  if (job.channel === 'sms') {
    const phone = payload.to || recipient.phone;
    if (!phone) {
      throw new Error('Recipient phone not available');
    }
    await sendSmsNotification({
      to: phone,
      body: payload.body
    });
    return;
  }

  throw new Error(`Unsupported channel: ${job.channel}`);
}

async function markProcessing(job) {
  const updated = await prisma.notificationJob.updateMany({
    where: { id: job.id, status: job.status },
    data: { status: 'processing', updatedAt: new Date() }
  });
  return updated.count > 0;
}

async function processJob(job) {
  if (!(await markProcessing(job))) {
    return;
  }

  const attemptNumber = job.attempts + 1;
  try {
    await dispatchJob(job);
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: 'sent',
        attempts: attemptNumber,
        lastError: null,
        nextAttemptAt: null
      }
    });
  } catch (error) {
    const shouldRetry = attemptNumber < job.maxAttempts;
    const updateData = {
      status: shouldRetry ? 'retrying' : 'failed',
      attempts: attemptNumber,
      lastError: error.message || 'Dispatch failed'
    };
    if (shouldRetry) {
      const delaySeconds = calculateBackoffSeconds(notificationConfig.queue.retrySeconds, attemptNumber);
      updateData.nextAttemptAt = nowPlusSeconds(delaySeconds);
    } else {
      updateData.nextAttemptAt = null;
    }
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: updateData
    });
  }
}

async function processDueJobs() {
  const now = new Date();
  const jobs = await prisma.notificationJob.findMany({
    where: {
      status: { in: ['pending', 'retrying'] },
      OR: [
        { nextAttemptAt: null },
        { nextAttemptAt: { lte: now } }
      ]
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10
  });

  for (const job of jobs) {
    await processJob(job);
  }
}

export function startNotificationWorker() {
  if (workerHandle) return;
  workerHandle = setInterval(() => {
    processDueJobs().catch((error) => {
      console.error('Notification worker error:', error);
    });
  }, WORKER_INTERVAL_MS);
  processDueJobs().catch((error) => {
    console.error('Notification worker error:', error);
  });
}

export async function registerNotificationDevice({ userId, token, provider = 'fcm', platform = 'unknown', metadata = {} }) {
  if (!token) {
    throw new Error('Device token is required');
  }
  await prisma.notificationDevice.upsert({
    where: {
      deviceToken_provider: {
        deviceToken: token,
        provider
      }
    },
    update: {
      userId: BigInt(userId),
      platform,
      metadata,
      isActive: true,
      updatedAt: new Date()
    },
    create: {
      userId: BigInt(userId),
      provider,
      platform,
      deviceToken: token,
      metadata,
      isActive: true
    }
  });
}

export async function deactivateNotificationDevice({ token, provider = 'fcm' }) {
  if (!token) return;
  await prisma.notificationDevice.updateMany({
    where: { deviceToken: token, provider },
    data: { isActive: false, updatedAt: new Date() }
  });
}

export async function listNotificationPreferences(userId) {
  const map = await getPreferenceMap(userId);
  const response = [];
  NOTIFICATION_EVENTS.forEach((eventType) => {
    NOTIFICATION_CHANNELS.forEach((channel) => {
      const key = `${eventType}:${channel}`;
      response.push({
        eventType,
        channel,
        enabled: map.has(key) ? map.get(key) : defaultPreference(eventType, channel)
      });
    });
  });
  return response;
}

export async function updateNotificationPreferences(userId, preferences = []) {
  const userBigInt = BigInt(userId);
  const now = new Date();
  for (const pref of preferences) {
    if (!NOTIFICATION_EVENTS.includes(pref.eventType)) continue;
    if (!NOTIFICATION_CHANNELS.includes(pref.channel)) continue;
    await prisma.notificationPreference.upsert({
      where: {
        userId_channel_eventType: {
          userId: userBigInt,
          channel: pref.channel,
          eventType: pref.eventType
        }
      },
      update: {
        enabled: pref.enabled,
        metadata: pref.metadata ?? {},
        updatedAt: now
      },
      create: {
        userId: userBigInt,
        channel: pref.channel,
        eventType: pref.eventType,
        enabled: pref.enabled,
        metadata: pref.metadata ?? {}
      }
    });
  }
  return listNotificationPreferences(userId);
}
