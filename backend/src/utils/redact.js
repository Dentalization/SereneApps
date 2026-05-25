export function redactSensitiveData(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'signature_key', 'server_key', 'client_key', 'authorization', 'token',
    'password', 'password_hash', 'otp', 'card_number', 'cvv', 'cvn', 'pin',
    'auth_token', 'private_key', 'secret', 'api_key', 'jwt', 'security_code'
  ];

  const redact = (item) => {
    if (item === null || item === undefined) return item;
    if (Array.isArray(item)) {
      return item.map(redact);
    }
    if (typeof item === 'object') {
      const copy = {};
      for (const [key, value] of Object.entries(item)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          copy[key] = '[REDACTED]';
        } else {
          copy[key] = redact(value);
        }
      }
      return copy;
    }
    return item;
  };

  return redact(obj);
}
