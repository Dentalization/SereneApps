import { PrismaClient } from '@prisma/client';
import { notifyAppointmentReminder } from '../notifications/appointmentNotifier.js';

const prisma = new PrismaClient();
const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000; // Check every 15 minutes
const REMINDER_WINDOW_HOURS = 24;
const VIRTUAL_JOIN_REMINDER_MINUTES = 15;

let reminderHandle = null;

export async function processReminders() {
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);
  const virtualJoinWindow = new Date(now.getTime() + VIRTUAL_JOIN_REMINDER_MINUTES * 60 * 1000);

  const virtualAppointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['scheduled', 'confirmed'] },
      startsAt: {
        gt: now,
        lte: virtualJoinWindow
      },
      OR: [
        { consultationType: 'virtual' },
        { videoRoomRef: { not: null } }
      ],
      metadata: {
        path: ['teledentistryReminder15Sent'],
        equals: null
      }
    },
    include: {
      patient: true,
      dentist: true
    }
  });

  console.log(`[ReminderService] Found ${virtualAppointments.length} teledentistry appointments for 15-minute reminders.`);

  for (const appt of virtualAppointments) {
    try {
      await notifyAppointmentReminder(appt.id.toString(), {
        leadTimeLabel: 'dalam 15 menit',
        joinAvailable: true,
        recipientRoles: ['patient']
      });

      const currentMetadata = appt.metadata || {};
      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          metadata: {
            ...currentMetadata,
            teledentistryReminder15Sent: true,
            teledentistryReminder15SentAt: new Date().toISOString()
          }
        }
      });

      console.log(`[ReminderService] 15-minute teledentistry reminder queued for Appointment #${appt.id}`);
    } catch (error) {
      console.error(`[ReminderService] Failed to queue 15-minute reminder for Appointment #${appt.id}:`, error);
    }
  }

  // Find confirmed/scheduled appointments in the next 24 hours that haven't been reminded
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['scheduled', 'confirmed'] },
      startsAt: {
        gt: now,
        lt: reminderWindow
      },
      AND: [
        {
          metadata: {
            path: ['appointmentReminder24hSent'],
            equals: null
          }
        },
        {
          metadata: {
            path: ['reminderSent'],
            equals: null
          }
        }
      ]
    },
    include: {
      patient: true,
      dentist: true
    }
  });

  console.log(`[ReminderService] Found ${appointments.length} appointments for reminder processing.`);

  for (const appt of appointments) {
    try {
      // Use the existing notification orchestration
      await notifyAppointmentReminder(appt.id.toString(), {
        leadTimeLabel: 'besok' // "tomorrow" in Indonesian
      });

      // Mark as sent in metadata
      const currentMetadata = (appt.metadata || {});
      await prisma.appointment.update({
        where: { id: appt.id },
        data: {
          metadata: {
            ...currentMetadata,
            appointmentReminder24hSent: true,
            appointmentReminder24hSentAt: new Date().toISOString()
          }
        }
      });

      console.log(`[ReminderService] Reminder sent for Appointment #${appt.id}`);
    } catch (error) {
      console.error(`[ReminderService] Failed to send reminder for Appointment #${appt.id}:`, error);
    }
  }
}

export function startReminderWorker() {
  if (reminderHandle) return;
  
  console.log('[ReminderService] Starting automated reminder worker...');
  
  reminderHandle = setInterval(() => {
    processReminders().catch((error) => {
      console.error('[ReminderService] Worker error:', error);
    });
  }, REMINDER_CHECK_INTERVAL_MS);

  // Run immediately on start
  processReminders().catch((error) => {
    console.error('[ReminderService] Initial run error:', error);
  });
}

export default {
  startReminderWorker,
  processReminders
};
