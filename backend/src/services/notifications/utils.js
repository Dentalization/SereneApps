export function parseIntSafe(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function nowPlusSeconds(seconds) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + seconds);
  return date;
}

export function calculateBackoffSeconds(baseSeconds, attempt) {
  const exponent = Math.max(0, attempt - 1);
  const delay = baseSeconds * Math.pow(2, exponent);
  const jitter = Math.random() * baseSeconds;
  return Math.round(delay + jitter);
}

export function assertChannelContact(channel, recipient) {
  if (channel === 'email' && !recipient.email) {
    throw new Error('Recipient is missing email address');
  }
  if (channel === 'sms' && !recipient.phone_number) {
    throw new Error('Recipient is missing phone number');
  }
}

export function buildRecipientSnapshot(user) {
  if (!user) return null;
  return {
    id: user.id?.toString?.() ?? user.id,
    name: user.name,
    email: user.email,
    phone: user.phone_number ?? user.phoneNumber ?? null
  };
}
