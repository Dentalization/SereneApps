function maskPhoneNumber(phoneNumber = '') {
  if (!phoneNumber) return '';
  if (phoneNumber.length <= 6) return `${phoneNumber.slice(0, 2)}***`;
  return `${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-3)}`;
}

function maskEmail(email = '') {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visible = localPart.slice(0, 1);
  return `${visible || '*'}***@${domain}`;
}

export function maskIdentifier(identifier = '', channel = 'sms') {
  return channel === 'email' ? maskEmail(identifier) : maskPhoneNumber(identifier);
}

export function logOtpEvent({
  level = 'info',
  event,
  correlationId,
  userId = null,
  identifier,
  channel,
  outcome,
  reason,
  metadata = {}
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    domain: 'otp',
    event,
    correlationId: correlationId || null,
    userId: userId ? userId.toString() : null,
    identifier: maskIdentifier(identifier, channel),
    channel,
    outcome,
    reason: reason || null,
    ...metadata
  };

  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  writer(JSON.stringify(payload));
}
