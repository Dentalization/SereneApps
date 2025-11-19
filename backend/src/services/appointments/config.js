import { parseIntSafe } from '../notifications/utils.js';

const DEFAULT_RESCHEDULE_CUTOFF_HOURS = 24;
const DEFAULT_CANCEL_CUTOFF_HOURS = 12;
const DEFAULT_CANCELLATION_FEE_PERCENT = 0;

export const appointmentConfig = {
  rescheduleCutoffHours: parseIntSafe(process.env.APPOINTMENT_RESCHEDULE_CUTOFF_HOURS, DEFAULT_RESCHEDULE_CUTOFF_HOURS),
  cancelCutoffHours: parseIntSafe(process.env.APPOINTMENT_CANCEL_CUTOFF_HOURS, DEFAULT_CANCEL_CUTOFF_HOURS),
  cancellationFeePercent: parseIntSafe(process.env.APPOINTMENT_CANCELLATION_FEE_PERCENT, DEFAULT_CANCELLATION_FEE_PERCENT)
};

export function millisecondsFromHours(hours) {
  return hours * 60 * 60 * 1000;
}
