import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getPatientDentistIds,
  resolveAnalyticsDateRange,
  scopeClinicPatientData,
} from '../src/pages/clinic-portal/patients/clinicPatientDataModel.mjs';
import { buildClinicPatientReport } from '../src/pages/clinic-portal/patients/patientReportModel.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const patients = [
  { id: 'p1', name: 'Ayu', status: 'active', doctorId: 'd1', doctorIds: ['d1', 'd2'], age: 32, gender: 'F' },
  { id: 'p2', name: 'Bima', status: 'inactive', doctorId: 'd2', doctorIds: ['d2'], age: null, gender: null },
];

const appointments = [
  { id: 'a1', patientId: 'p1', dentistId: 'd1', startsAt: '2026-07-10T03:00:00.000Z', status: 'completed', treatment: 'Scaling', isPaid: true, fee: 500000 },
  { id: 'a2', patientId: 'p1', dentistId: 'd2', startsAt: '2026-07-15T03:00:00.000Z', status: 'completed', treatment: 'Filling', isPaid: false, fee: 700000 },
  { id: 'a3', patientId: 'p2', dentistId: 'd2', startsAt: '2025-01-10T03:00:00.000Z', status: 'completed', treatment: 'Scaling', isPaid: true, fee: 250000 },
];

test('clinic patient scoping correlates patients through every dentist appointment', () => {
  assert.deepEqual(getPatientDentistIds(patients[0]), ['d1', 'd2']);
  const scoped = scopeClinicPatientData({ patients, appointments, selectedDentist: 'd2' });
  assert.deepEqual(scoped.patients.map((patient) => patient.id), ['p1', 'p2']);
  assert.deepEqual(scoped.appointments.map((appointment) => appointment.id), ['a2', 'a3']);
});

test('date, treatment, and patient lifecycle filters affect the same report scope', () => {
  const scoped = scopeClinicPatientData({
    patients,
    appointments,
    patientType: 'active',
    treatmentType: 'scaling',
    start: new Date('2026-07-01T00:00:00.000Z'),
    end: new Date('2026-07-31T23:59:59.999Z'),
  });
  assert.deepEqual(scoped.patients.map((patient) => patient.id), ['p1']);
  assert.deepEqual(scoped.appointments.map((appointment) => appointment.id), ['a1']);
});

test('generated reports contain real filtered CSV rows and escaped values', () => {
  const report = buildClinicPatientReport({
    type: 'visitSummary',
    patients,
    appointments: [{ ...appointments[0], patientName: 'Ayu, Sari' }],
    generatedAt: new Date('2026-07-24T00:00:00.000Z'),
  });
  assert.equal(report.filename, 'visit-summary-2026-07-24.csv');
  assert.equal(report.rowCount, 1);
  assert.match(report.content, /"Ayu, Sari"/);
  assert.match(report.content, /500000/);
});

test('analytics custom period resolves the full selected calendar month', () => {
  const range = resolveAnalyticsDateRange({ period: 'custom', year: 2026, month: 6 });
  assert.equal(range.start.getFullYear(), 2026);
  assert.equal(range.start.getMonth(), 6);
  assert.equal(range.start.getDate(), 1);
  assert.equal(range.end.getMonth(), 6);
  assert.equal(range.end.getDate(), 31);
});

test('backend patient contracts count completed visits and secure medical-history writes', () => {
  const clinicRoute = fs.readFileSync(path.resolve(here, '../../backend/src/routes/clinic.js'), 'utf8');
  const dentistRoute = fs.readFileSync(path.resolve(here, '../../backend/src/routes/dentist-portal.js'), 'utf8');
  assert.match(clinicRoute, /completedVisitStatuses = new Set\(\['completed'\]\)/);
  assert.match(clinicRoute, /nextAppointment/);
  assert.match(clinicRoute, /doctorIds/);
  assert.match(dentistRoute, /'\/patients\/:patientId\/medical-details'/);
  assert.match(dentistRoute, /ensureDentistPatientAccess\(dentistId, patientId\)/);
  assert.match(dentistRoute, /eventName: 'patient:updated'/);
});
