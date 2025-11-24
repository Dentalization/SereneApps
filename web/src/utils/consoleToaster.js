/* eslint-disable no-console */
import { emitToastEvent } from './toastBus';

const ENABLE_CONSOLE_TOASTS = import.meta.env.VITE_ENABLE_CONSOLE_TOASTS !== 'false';
const ENABLE_ALERT_TOASTS = import.meta.env.VITE_ENABLE_ALERT_TOASTS !== 'false';
const FORCE_ALL_LOGS = import.meta.env.VITE_CONSOLE_TOAST_ALL === 'true';
const DUPLICATE_WINDOW_MS = 1200;

const KEYWORDS = [
  'success',
  'berhasil',
  'completed',
  'selesai',
  'done',
  'approved',
  'verified',
  'gagal',
  'failed',
  'error',
  'invalid',
  'denied',
  'warning',
  'perhatian',
  'hati-hati',
  'alert',
  'butuh perhatian',
  'cta',
  'info',
  'notifikasi',
  'update',
];

const EMOJIS = ['✅', '⚠', '❌', 'ℹ', '🚨', '⚡', '📢', '📣', '🔥', '🎉', '💡', '📝', '🛡️', '💬'];

let lastToastMessage = '';
let lastToastTimestamp = 0;

const isDuplicateMessage = (message) => {
  const now = Date.now();
  if (message === lastToastMessage && now - lastToastTimestamp < DUPLICATE_WINDOW_MS) {
    return true;
  }
  lastToastMessage = message;
  lastToastTimestamp = now;
  return false;
};

const safeStringify = (value) => {
  const cache = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (typeof val === 'bigint') return `${val.toString()}n`;
      if (typeof val === 'object' && val !== null) {
        if (cache.has(val)) return '[Circular]';
        cache.add(val);
      }
      return val;
    },
    2,
  );
};

const formatArg = (arg) => {
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') {
    return String(arg);
  }
  if (arg instanceof Error) return arg.message || arg.toString();
  if (arg === undefined) return 'undefined';
  if (arg === null) return 'null';
  if (typeof arg === 'function') return `[Function ${arg.name || 'anonymous'}]`;

  try {
    return safeStringify(arg);
  } catch (error) {
    return String(arg);
  }
};

const formatArgs = (args) => {
  if (!Array.isArray(args) || !args.length) return '';
  const raw = args.map(formatArg).join(' ');
  const MAX_LENGTH = 420;
  return raw.length > MAX_LENGTH ? `${raw.slice(0, MAX_LENGTH)}…` : raw;
};

const containsKeyword = (message) => {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const containsEmoji = (message) => EMOJIS.some((emoji) => message.includes(emoji));

const shouldToastLog = (level, message) => {
  if (!message) return false;
  if (FORCE_ALL_LOGS) return true;
  if (level === 'error' || level === 'warn') return true;
  return containsKeyword(message) || containsEmoji(message);
};

const detectStatus = (level, message) => {
  const normalized = (message || '').toLowerCase();

  if (level === 'error' || normalized.includes('error') || normalized.includes('gagal') || normalized.includes('failed')) {
    return 'error';
  }

  if (level === 'warn' || normalized.includes('warning') || normalized.includes('perhatian') || normalized.includes('alert')) {
    return 'warning';
  }

  if (
    normalized.includes('success') ||
    normalized.includes('berhasil') ||
    normalized.includes('selesai') ||
    normalized.includes('approved') ||
    normalized.includes('verified') ||
    message.includes('✅') ||
    message.includes('🎉')
  ) {
    return 'success';
  }

  return 'info';
};

const emitFromLog = (level, args, source) => {
  const message = formatArgs(args);
  if (!message || !shouldToastLog(level, message) || isDuplicateMessage(message)) {
    return;
  }

  emitToastEvent({
    message,
    status: detectStatus(level, message),
    duration: level === 'error' ? 7000 : 5000,
    meta: { source, level },
  });
};

const patchConsole = () => {
  if (typeof window === 'undefined' || window.__CONSOLE_TOAST_PATCHED__ || !ENABLE_CONSOLE_TOASTS) {
    return;
  }

  const original = {
    log: console.log.bind(console),
    info: console.info ? console.info.bind(console) : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
    error: console.error ? console.error.bind(console) : console.log.bind(console),
  };

  window.__TOAST_ORIGINAL_CONSOLE__ = original;

  ['log', 'info', 'warn', 'error'].forEach((level) => {
    console[level] = (...args) => {
      original[level](...args);
      emitFromLog(level, args, 'console');
    };
  });

  window.__CONSOLE_TOAST_PATCHED__ = true;
};

const patchAlert = () => {
  if (typeof window === 'undefined' || window.__ALERT_TOAST_PATCHED__ || !ENABLE_ALERT_TOASTS) {
    return;
  }

  const originalAlert = window.alert ? window.alert.bind(window) : null;

  window.alert = (message) => {
    emitFromLog('info', [message], 'alert');
    if (import.meta.env.DEV && window.__TOAST_KEEP_NATIVE_ALERT__) {
      originalAlert?.(message);
    }
  };

  window.__ALERT_TOAST_PATCHED__ = true;
};

patchConsole();
patchAlert();
