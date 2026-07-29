/**
 * Shared clinic/dentist data collaboration contract.
 *
 * Realtime messages are invalidation signals only. They intentionally contain
 * no patient, clinical, or financial payload; each portal refetches data through
 * its authenticated, tenant-scoped API after receiving a signal.
 */

export const PORTAL_DATA_DOMAINS = Object.freeze({
  APPOINTMENTS: 'appointments',
  BILLING: 'billing',
  BRANCHES: 'branches',
  CLINICAL: 'clinical',
  DASHBOARD: 'dashboard',
  IMAGING: 'imaging',
  PATIENTS: 'patients',
  SCHEDULE: 'schedule',
  STAFF: 'staff',
  TELEDENTISTRY: 'teledentistry'
});

const ALL_OPERATIONAL_DOMAINS = Object.freeze([
  PORTAL_DATA_DOMAINS.APPOINTMENTS,
  PORTAL_DATA_DOMAINS.BILLING,
  PORTAL_DATA_DOMAINS.CLINICAL,
  PORTAL_DATA_DOMAINS.DASHBOARD,
  PORTAL_DATA_DOMAINS.PATIENTS,
  PORTAL_DATA_DOMAINS.SCHEDULE
]);

const TREATMENT_PLAN_DOMAINS = Object.freeze([
  PORTAL_DATA_DOMAINS.BILLING,
  PORTAL_DATA_DOMAINS.CLINICAL,
  PORTAL_DATA_DOMAINS.DASHBOARD,
  PORTAL_DATA_DOMAINS.PATIENTS
]);

export const PORTAL_EVENT_DOMAINS = Object.freeze({
  'notification:new': ALL_OPERATIONAL_DOMAINS,
  'appointment:created': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS,
    PORTAL_DATA_DOMAINS.SCHEDULE
  ],
  'appointment:updated': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS,
    PORTAL_DATA_DOMAINS.SCHEDULE,
    PORTAL_DATA_DOMAINS.TELEDENTISTRY
  ],
  'appointment:cancelled': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS,
    PORTAL_DATA_DOMAINS.SCHEDULE
  ],
  'payment:status_updated': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'billing:invoice_updated': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'clinic:billing_updated': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'dashboard:metrics_updated': [PORTAL_DATA_DOMAINS.DASHBOARD],
  'patient:updated': [
    PORTAL_DATA_DOMAINS.CLINICAL,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'emr:updated': [PORTAL_DATA_DOMAINS.CLINICAL, PORTAL_DATA_DOMAINS.PATIENTS],
  'treatment_plan:created': TREATMENT_PLAN_DOMAINS,
  'treatment_plan:updated': TREATMENT_PLAN_DOMAINS,
  'treatment_plan:sent': TREATMENT_PLAN_DOMAINS,
  'treatment_plan:approved': TREATMENT_PLAN_DOMAINS,
  'treatment_plan:rejected': TREATMENT_PLAN_DOMAINS,
  'clinic:staff_updated': [
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.SCHEDULE,
    PORTAL_DATA_DOMAINS.STAFF
  ],
  'clinic:profile_updated': [
    PORTAL_DATA_DOMAINS.BRANCHES,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.SCHEDULE,
    PORTAL_DATA_DOMAINS.STAFF
  ],
  'clinic:branches_updated': [
    PORTAL_DATA_DOMAINS.BILLING,
    PORTAL_DATA_DOMAINS.BRANCHES,
    PORTAL_DATA_DOMAINS.DASHBOARD,
    PORTAL_DATA_DOMAINS.SCHEDULE,
    PORTAL_DATA_DOMAINS.STAFF
  ],
  'dentist:availability_updated': [
    PORTAL_DATA_DOMAINS.SCHEDULE,
    PORTAL_DATA_DOMAINS.STAFF
  ],
  'teledentistry:session_updated': [
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.TELEDENTISTRY
  ],
  'specialist:case_updated': [
    PORTAL_DATA_DOMAINS.CLINICAL,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'xcore:case_updated': [
    PORTAL_DATA_DOMAINS.CLINICAL,
    PORTAL_DATA_DOMAINS.IMAGING,
    PORTAL_DATA_DOMAINS.PATIENTS
  ],
  'xcore:study_updated': [
    PORTAL_DATA_DOMAINS.CLINICAL,
    PORTAL_DATA_DOMAINS.IMAGING,
    PORTAL_DATA_DOMAINS.PATIENTS
  ]
});

const unique = (values) => [...new Set(values)];

export function getPortalRealtimeEvents(domains) {
  const requested = new Set(Array.isArray(domains) ? domains : [domains].filter(Boolean));
  return Object.entries(PORTAL_EVENT_DOMAINS)
    .filter(([, eventDomains]) => eventDomains.some((domain) => requested.has(domain)))
    .map(([eventName]) => eventName);
}

export const PORTAL_REFRESH_PROFILES = Object.freeze({
  DASHBOARD: Object.freeze(getPortalRealtimeEvents([PORTAL_DATA_DOMAINS.DASHBOARD])),
  SCHEDULE: Object.freeze(getPortalRealtimeEvents([
    PORTAL_DATA_DOMAINS.APPOINTMENTS,
    PORTAL_DATA_DOMAINS.SCHEDULE
  ])),
  PATIENTS: Object.freeze(getPortalRealtimeEvents([
    PORTAL_DATA_DOMAINS.PATIENTS,
    PORTAL_DATA_DOMAINS.CLINICAL
  ])),
  BILLING: Object.freeze(getPortalRealtimeEvents([PORTAL_DATA_DOMAINS.BILLING])),
  BRANCHES: Object.freeze(getPortalRealtimeEvents([PORTAL_DATA_DOMAINS.BRANCHES])),
  STAFF: Object.freeze(getPortalRealtimeEvents([PORTAL_DATA_DOMAINS.STAFF]))
});

const LOCAL_EVENT_NAME = 'serene:portal-data-invalidated';
const CHANNEL_NAME = 'serene-portal-collaboration-v1';
let channel;

function createSignal(eventName, source) {
  return Object.freeze({
    id: globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    eventName,
    domains: unique(PORTAL_EVENT_DOMAINS[eventName] || []),
    source: typeof source === 'string' ? source.slice(0, 80) : 'web',
    occurredAt: new Date().toISOString()
  });
}

function getBroadcastChannel() {
  if (typeof globalThis.window === 'undefined') return null;
  if (typeof globalThis.BroadcastChannel !== 'function') return null;
  if (!channel) channel = new globalThis.BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Publish a PHI-free invalidation after a successful mutation. */
export function publishPortalInvalidation(eventName, { source = 'web' } = {}) {
  if (!PORTAL_EVENT_DOMAINS[eventName]) {
    throw new Error(`Unknown portal collaboration event: ${eventName}`);
  }

  const signal = createSignal(eventName, source);
  if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
    globalThis.dispatchEvent(new globalThis.CustomEvent(LOCAL_EVENT_NAME, { detail: signal }));
  }
  getBroadcastChannel()?.postMessage(signal);
  return signal;
}

export function subscribePortalInvalidations(listener) {
  if (typeof listener !== 'function') return () => {};

  const seen = new Set();
  const deliver = (signal) => {
    if (!signal?.id || seen.has(signal.id) || !PORTAL_EVENT_DOMAINS[signal.eventName]) return;
    seen.add(signal.id);
    if (seen.size > 200) seen.delete(seen.values().next().value);
    listener(signal);
  };
  const handleLocal = (event) => deliver(event?.detail);
  const handleBroadcast = (event) => deliver(event?.data);
  const broadcastChannel = getBroadcastChannel();

  globalThis.addEventListener?.(LOCAL_EVENT_NAME, handleLocal);
  broadcastChannel?.addEventListener('message', handleBroadcast);

  return () => {
    globalThis.removeEventListener?.(LOCAL_EVENT_NAME, handleLocal);
    broadcastChannel?.removeEventListener('message', handleBroadcast);
  };
}

/**
 * Coalesces event bursts and guarantees at most one fetch is in flight. If an
 * event arrives while fetching, one trailing refresh is retained.
 */
export function createPortalRefreshCoordinator({
  refresh,
  debounceMs = 100,
  minIntervalMs = 350,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  now = Date.now
}) {
  if (typeof refresh !== 'function') throw new TypeError('refresh must be a function');

  let timer = null;
  let running = false;
  let disposed = false;
  let lastStartedAt = Number.NEGATIVE_INFINITY;
  const pendingReasons = new Set();

  const run = async () => {
    timer = null;
    if (disposed || running || pendingReasons.size === 0) return;
    running = true;
    lastStartedAt = now();
    const reasons = [...pendingReasons];
    pendingReasons.clear();
    try {
      await refresh({ reasons });
    } finally {
      running = false;
      if (!disposed && pendingReasons.size > 0) schedule(null);
    }
  };

  function schedule(reason = 'collaboration') {
    if (disposed) return;
    if (reason) pendingReasons.add(reason);
    if (running || timer) return;
    const sinceLastRun = now() - lastStartedAt;
    const delay = Math.max(debounceMs, minIntervalMs - sinceLastRun, 0);
    timer = setTimer(run, delay);
  }

  return {
    schedule,
    async flush() {
      if (timer) {
        clearTimer(timer);
        timer = null;
      }
      await run();
    },
    dispose() {
      disposed = true;
      pendingReasons.clear();
      if (timer) clearTimer(timer);
      timer = null;
    }
  };
}
