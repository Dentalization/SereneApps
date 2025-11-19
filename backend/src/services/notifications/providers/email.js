import sgMail from '@sendgrid/mail';
import { isEmailConfigured, notificationConfig } from '../config.js';

let configured = false;

function ensureConfigured() {
  if (configured || !isEmailConfigured()) return;
  sgMail.setApiKey(notificationConfig.sendgridApiKey);
  configured = true;
}

export async function sendEmailNotification({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    throw new Error('Email notifications are not configured');
  }

  ensureConfigured();

  const message = {
    to,
    from: notificationConfig.sendgridFromEmail,
    subject,
    text: text || undefined,
    html: html || undefined
  };

  await sgMail.send(message);
  return { success: true };
}
