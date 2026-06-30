export const STATUS_TONE = {
  healthy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
};

export const BUCKET_BADGE = {
  healthy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
};

export const ERROR_MESSAGES = {
  APPOINTMENT_NOT_FOUND: 'No appointment found with that ID. Double-check the ID and try again.',
  COMMUNICATION_RECORD_NOT_FOUND: 'This appointment has no communication record yet. It may not have reached the stage that provisions Twilio resources.',
  RECONCILIATION_NOT_ALLOWED: 'Reconciliation is not available for this appointment in its current state.',
  TWILIO_PROVISIONING_FAILED: 'Twilio failed to provision a resource for this appointment. Check provider status and the readiness panel for details.',
  COMMUNICATIONS_PROVIDER_UNAVAILABLE: 'The communications provider is currently unavailable. Try again shortly.',
  COMMUNICATIONS_DIAGNOSTICS_FAILED: 'The diagnostics service could not complete this request. Try again or contact technical support.',
  EXPORT_FAILED: 'The audit export could not be generated. Try again, or narrow the date range for appointments with a long history.',
  NETWORK_ERROR: 'Could not reach the server. Check your connection and try again.'
};

export function describeError(code, fallback = 'The request could not be completed.') {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] || `${fallback} (code: ${code})`;
}
