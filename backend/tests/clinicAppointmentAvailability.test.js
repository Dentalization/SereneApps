import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClinicAvailability,
  resolveDailyWindow
} from '../src/services/clinicAppointmentAvailability.js';

test('daily window intersects clinic and dentist string schedules', () => {
  const window = resolveDailyWindow({
    date: '2026-06-30',
    clinicHours: { tuesday: '08:00-20:00' },
    dentistHours: { tuesday: '09:00-21:00' }
  });

  assert.deepEqual(window, {
    dayKey: 'tuesday',
    isOpen: true,
    openMinutes: 540,
    closeMinutes: 1200
  });
});

test('availability uses dentist user appointments and removes overlapping slots', () => {
  const slots = buildClinicAvailability({
    date: '2026-06-30',
    durationMinutes: 30,
    clinicHours: { tuesday: '08:00-20:00' },
    dentistHours: { tuesday: '09:00-21:00' },
    appointments: [{
      startsAt: new Date('2026-06-30T03:00:00.000Z'),
      endsAt: new Date('2026-06-30T03:30:00.000Z')
    }],
    now: new Date('2026-06-27T00:00:00.000Z')
  });

  assert.equal(slots.length, 21);
  assert.equal(slots[0].time, '09:00');
  assert.equal(slots.some((slot) => slot.time === '10:00'), false);
  assert.equal(slots.some((slot) => slot.time === '10:30'), true);
});

test('closed dentist day returns no slots with a useful reason', () => {
  const result = buildClinicAvailability({
    date: '2026-07-05',
    durationMinutes: 30,
    clinicHours: { sunday: '09:00-17:00' },
    dentistHours: { sunday: 'Closed' },
    appointments: [],
    now: new Date('2026-06-27T00:00:00.000Z'),
    includeMeta: true
  });

  assert.equal(result.slots.length, 0);
  assert.equal(result.reason, 'DENTIST_CLOSED');
});

test('elapsed clinic hours are distinct from fully booked slots', () => {
  const result = buildClinicAvailability({
    date: '2026-06-30',
    durationMinutes: 30,
    clinicHours: { tuesday: '08:00-20:00' },
    dentistHours: { tuesday: '09:00-17:00' },
    now: new Date('2026-06-30T11:00:00.000Z'),
    includeMeta: true
  });

  assert.deepEqual(result.slots, []);
  assert.equal(result.reason, 'NO_FUTURE_SLOTS');
});
