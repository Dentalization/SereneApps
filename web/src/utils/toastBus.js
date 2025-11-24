const listeners = new Set();
const queuedEvents = [];
const MAX_QUEUE_SIZE = 25;

const logInternalError = (...args) => {
  if (typeof window !== 'undefined' && window.__TOAST_ORIGINAL_CONSOLE__?.error) {
    window.__TOAST_ORIGINAL_CONSOLE__.error(...args);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(...args);
};

const normalizeEvent = (event = {}) => {
  if (!event.message) {
    return null;
  }

  return {
    message: String(event.message),
    status: event.status || 'info',
    duration: typeof event.duration === 'number' ? event.duration : 5000,
    meta: event.meta || {},
  };
};

export const emitToastEvent = (event) => {
  const payload = normalizeEvent(event);
  if (!payload) {
    return;
  }

  if (!listeners.size) {
    queuedEvents.push(payload);

    if (queuedEvents.length > MAX_QUEUE_SIZE) {
      queuedEvents.shift();
    }
    return;
  }

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      logInternalError('Toast listener error:', error);
    }
  });
};

export const subscribeToToastEvents = (listener) => {
  if (!listener) return () => {};

  listeners.add(listener);

  if (queuedEvents.length) {
    queuedEvents.splice(0).forEach((event) => {
      try {
        listener(event);
      } catch (error) {
        logInternalError('Toast listener error during replay:', error);
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const toastService = {
  show: (options) => emitToastEvent(options),
  success: (message, duration, meta) =>
    emitToastEvent({ message, status: 'success', duration, meta }),
  error: (message, duration, meta) =>
    emitToastEvent({ message, status: 'error', duration, meta }),
  warning: (message, duration, meta) =>
    emitToastEvent({ message, status: 'warning', duration, meta }),
  info: (message, duration, meta) =>
    emitToastEvent({ message, status: 'info', duration, meta }),
};

export default toastService;
