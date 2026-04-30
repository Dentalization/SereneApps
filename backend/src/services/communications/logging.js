function serializeValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code
    };
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)])
    );
  }
  return value;
}

export function logCommunicationEvent(event, details = {}, level = 'info') {
  const payload = {
    event,
    component: 'communications',
    ...serializeValue(details)
  };
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logger(JSON.stringify(payload));
}

