const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function formatDate(date) {
  try {
    return DATE_FORMATTER.format(new Date(date));
  } catch (error) {
    return date;
  }
}

function counterpartName(recipientRole, appointment) {
  if (!appointment) return 'SereneAI';
  if (recipientRole === 'patient') {
    return appointment.dentist?.name || 'your dentist';
  }
  if (recipientRole === 'dentist') {
    return appointment.patient?.name || 'your patient';
  }
  return 'SereneAI Team';
}

export const NOTIFICATION_EVENTS = [
  'appointment_confirmed',
  'appointment_payment_failed',
  'appointment_cancelled',
  'appointment_rescheduled',
  'chat_invite',
  'appointment_reminder'
];
export const NOTIFICATION_CHANNELS = ['push', 'email', 'sms'];

export const templates = {
  appointment_confirmed: {
    channels: ['push', 'email', 'sms'],
    build: ({ appointment, recipientRole }) => {
      const start = formatDate(appointment.startsAt || appointment.starts_at);
      const partner = counterpartName(recipientRole, appointment);
      return {
        push: {
          title: 'Appointment Confirmed',
          body: `Your appointment with ${partner} is confirmed for ${start}.`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'appointment_confirmed'
          }
        },
        email: {
          subject: 'Your appointment is confirmed',
          text: `Hi ${partner},\n\nThis is a confirmation for your appointment scheduled on ${start}.\n\nSee you soon!\nSereneAI`,
          html: `<p>Hi ${partner},</p><p>This is a confirmation for your appointment scheduled on <strong>${start}</strong>.</p><p>See you soon!<br/>SereneAI</p>`
        },
        sms: {
          body: `Appointment confirmed with ${partner} on ${start}. Reply HELP for assistance.`
        }
      };
    }
  },
  appointment_payment_failed: {
    channels: ['push', 'email', 'sms'],
    build: ({ appointment, payload = {} }) => {
      const start = formatDate(appointment.startsAt || appointment.starts_at);
      const amount = payload.amount ? `IDR ${payload.amount}` : 'your recent payment';
      return {
        push: {
          title: 'Payment Issue',
          body: `${amount} for the appointment on ${start} could not be processed.`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'appointment_payment_failed'
          }
        },
        email: {
          subject: 'We could not process your payment',
          text: `Hello,\n\nWe were unable to process ${amount} for your appointment on ${start}. Please update your payment method or retry within the portal.\n\nThank you,\nSereneAI`,
          html: `<p>Hello,</p><p>We were unable to process <strong>${amount}</strong> for your appointment on <strong>${start}</strong>. Please update your payment method or retry within the portal.</p><p>Thank you,<br/>SereneAI</p>`
        },
        sms: {
          body: `Payment failed for appointment on ${start}. Update your payment method to keep the booking.`
        }
      };
    }
  },
  chat_invite: {
    channels: ['push', 'email'],
    build: ({ appointment, payload = {}, recipientRole }) => {
      const partner = counterpartName(recipientRole, appointment);
      const roomName = payload.roomName || 'your consultation room';
      return {
        push: {
          title: 'Teleconsult Chat Invitation',
          body: `${partner} invited you to join ${roomName}.`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'chat_invite'
          }
        },
        email: {
          subject: 'Join your teleconsultation chat',
          text: `Hi,\n\n${partner} invited you to join ${roomName}. Open the SereneAI app to start chatting.\n\nSereneAI`,
          html: `<p>Hi,</p><p>${partner} invited you to join <strong>${roomName}</strong>. Open the SereneAI app to start chatting.</p><p>SereneAI</p>`
        }
      };
    }
  },
  appointment_reminder: {
    channels: ['push', 'email', 'sms'],
    build: ({ appointment, payload = {}, recipientRole }) => {
      const start = formatDate(appointment.startsAt || appointment.starts_at);
      const partner = counterpartName(recipientRole, appointment);
      const lead = payload.leadTimeLabel || 'upcoming';
      return {
        push: {
          title: 'Appointment Reminder',
          body: `Reminder: ${partner} awaits you ${lead} (${start}).`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'appointment_reminder'
          }
        },
        email: {
          subject: 'Appointment reminder',
          text: `Hello,\n\nThis is a reminder for your appointment with ${partner} on ${start}.\n\nSee you soon,\nSereneAI`,
          html: `<p>Hello,</p><p>This is a reminder for your appointment with <strong>${partner}</strong> on <strong>${start}</strong>.</p><p>See you soon,<br/>SereneAI</p>`
        },
        sms: {
          body: `Reminder: appointment with ${partner} on ${start}. Reply HELP for assistance.`
        }
      };
    }
  },
  appointment_cancelled: {
    channels: ['push', 'email', 'sms'],
    build: ({ appointment, payload = {}, recipientRole }) => {
      const start = formatDate(appointment.startsAt || appointment.starts_at);
      const partner = counterpartName(recipientRole, appointment);
      const reason = payload.cancellationReason || 'No reason provided';
      return {
        push: {
          title: 'Appointment Cancelled',
          body: `The appointment on ${start} has been cancelled. Reason: ${reason}.`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'appointment_cancelled'
          }
        },
        email: {
          subject: 'Appointment cancelled',
          text: `Hello,\n\nThe appointment scheduled on ${start} has been cancelled. Reason: ${reason}.\n\nPlease contact support if you have questions.\nSereneAI`,
          html: `<p>Hello,</p><p>The appointment scheduled on <strong>${start}</strong> has been cancelled.</p><p><strong>Reason:</strong> ${reason}</p><p>Please contact support if you have questions.<br/>SereneAI</p>`
        },
        sms: {
          body: `Appointment on ${start} cancelled. Reason: ${reason}.`
        }
      };
    }
  },
  appointment_rescheduled: {
    channels: ['push', 'email', 'sms'],
    build: ({ appointment, payload = {}, recipientRole }) => {
      const newStart = formatDate(payload.newStartsAt || appointment.startsAt || appointment.starts_at);
      const partner = counterpartName(recipientRole, appointment);
      return {
        push: {
          title: 'Appointment Rescheduled',
          body: `Your appointment with ${partner} is now scheduled for ${newStart}.`,
          data: {
            appointment_id: appointment.id.toString(),
            event_type: 'appointment_rescheduled'
          }
        },
        email: {
          subject: 'Appointment rescheduled',
          text: `Hello,\n\nYour appointment with ${partner} has been rescheduled to ${newStart}.\n\nSee you soon,\nSereneAI`,
          html: `<p>Hello,</p><p>Your appointment with <strong>${partner}</strong> has been rescheduled to <strong>${newStart}</strong>.</p><p>See you soon,<br/>SereneAI</p>`
        },
        sms: {
          body: `Reminder: appointment with ${partner} moved to ${newStart}.`
        }
      };
    }
  }
};

export function getTemplate(eventType) {
  return templates[eventType] || null;
}
