import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PORTAL_DATA_DOMAINS,
  PORTAL_EVENT_DOMAINS,
  PORTAL_REFRESH_PROFILES,
  createPortalRefreshCoordinator,
  publishPortalInvalidation
} from '../src/collaboration/portalCollaboration.mjs';
import {
  normalizePortalAppointmentChannel,
  normalizePortalAppointmentStatus
} from '../src/collaboration/appointmentCollaborationModel.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');

test('shared collaboration profiles cover the backend events used by both portals', () => {
  for (const eventName of [
    'notification:new',
    'appointment:updated',
    'payment:status_updated',
    'billing:invoice_updated',
    'clinic:billing_updated',
    'dashboard:metrics_updated',
    'clinic:profile_updated',
    'clinic:branches_updated',
    'treatment_plan:created',
    'treatment_plan:sent',
    'treatment_plan:approved',
    'treatment_plan:rejected'
  ]) {
    assert.ok(PORTAL_EVENT_DOMAINS[eventName], `${eventName} must be part of the shared contract`);
  }

  assert.ok(PORTAL_REFRESH_PROFILES.SCHEDULE.includes('appointment:updated'));
  assert.ok(PORTAL_REFRESH_PROFILES.PATIENTS.includes('billing:invoice_updated'));
  assert.ok(PORTAL_REFRESH_PROFILES.BILLING.includes('payment:status_updated'));
  assert.ok(PORTAL_REFRESH_PROFILES.DASHBOARD.includes('dashboard:metrics_updated'));
  assert.ok(PORTAL_REFRESH_PROFILES.BRANCHES.includes('clinic:branches_updated'));
  assert.ok(PORTAL_REFRESH_PROFILES.PATIENTS.includes('treatment_plan:approved'));
});

test('appointment status and care channel are identical in clinic and dentist views', () => {
  assert.equal(normalizePortalAppointmentStatus('scheduled'), 'pending');
  assert.equal(normalizePortalAppointmentStatus('rescheduled'), 'pending');
  assert.equal(normalizePortalAppointmentStatus('no_show'), 'no-show');
  assert.equal(normalizePortalAppointmentStatus('in_progress'), 'in-chair');
  assert.equal(normalizePortalAppointmentChannel({ consultationType: 'virtual' }), 'tele');
  assert.equal(normalizePortalAppointmentChannel({ metadata: { channel: 'online' } }), 'tele');
  assert.equal(normalizePortalAppointmentChannel({}), 'clinic');
});

test('refresh coordinator collapses bursts and retains one trailing refresh', async () => {
  let nextTimerId = 1;
  const timers = new Map();
  const setTimer = (callback) => {
    const id = nextTimerId++;
    timers.set(id, callback);
    return id;
  };
  const clearTimer = (id) => timers.delete(id);
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const calls = [];
  const coordinator = createPortalRefreshCoordinator({
    debounceMs: 0,
    minIntervalMs: 0,
    setTimer,
    clearTimer,
    refresh: async ({ reasons }) => {
      calls.push(reasons);
      if (calls.length === 1) await firstGate;
    }
  });

  coordinator.schedule('socket:appointment:updated');
  coordinator.schedule('socket:billing:invoice_updated');
  assert.equal(timers.size, 1);

  const firstCallback = timers.values().next().value;
  timers.clear();
  const firstRun = firstCallback();
  await Promise.resolve();
  coordinator.schedule('local:appointment:updated');
  coordinator.schedule('local:appointment:updated');
  assert.equal(timers.size, 0, 'no concurrent fetch should be scheduled');

  releaseFirst();
  await firstRun;
  assert.equal(timers.size, 1, 'one trailing refresh must be retained');
  const trailingCallback = timers.values().next().value;
  timers.clear();
  await trailingCallback();

  assert.equal(calls.length, 2);
  assert.deepEqual(new Set(calls[0]), new Set([
    'socket:appointment:updated',
    'socket:billing:invoice_updated'
  ]));
  assert.ok(calls[1].includes('local:appointment:updated'));
  coordinator.dispose();
});

test('local invalidation is PHI-free and only carries contract metadata', () => {
  const signal = publishPortalInvalidation('appointment:updated', { source: 'test' });
  assert.deepEqual(
    Object.keys(signal).sort(),
    ['domains', 'eventName', 'id', 'occurredAt', 'source']
  );
  assert.ok(signal.domains.includes(PORTAL_DATA_DOMAINS.PATIENTS));
  assert.equal(JSON.stringify(signal).includes('patientName'), false);
});

test('both portals consume the shared refresh hook and clinic staff has no direct localhost API', () => {
  const pages = [
    'src/pages/clinic-portal/home/index.jsx',
    'src/pages/clinic-portal/schedule/index.jsx',
    'src/pages/clinic-portal/patients/index.jsx',
    'src/pages/clinic-portal/billing/index.jsx',
    'src/pages/clinic-portal/branches/index.jsx',
    'src/pages/dentist-portal/home/index.jsx',
    'src/pages/dentist-portal/schedule/index.jsx',
    'src/pages/dentist-portal/patient/index.jsx'
  ];
  pages.forEach((page) => assert.match(readSource(page), /usePortalRealtimeRefresh/));

  const staffPage = readSource('src/pages/clinic-portal/staff/index.jsx');
  assert.doesNotMatch(staffPage, /fetch\(['"`]http:\/\/localhost:4000/);
  assert.match(staffPage, /staffService\.getStaff\(\)/);
  assert.match(staffPage, /staffService\.removeStaffMember\(userId\)/);

  const clinicNotifications = readSource('src/pages/clinic-portal/ui/NotificationScreenClinic.jsx');
  assert.match(clinicNotifications, /useNotifications\(\)/);
  assert.doesNotMatch(clinicNotifications, /getClinicNotificationsForRoles/);

  const clinicService = readSource('src/services/clinicService.js');
  assert.match(clinicService, /publishPortalInvalidation\('clinic:profile_updated'/);
  assert.equal((clinicService.match(/publishPortalInvalidation\('clinic:branches_updated'/g) || []).length, 3);
});

test('dentist clinic assignment and branch context refresh after clinic staff mutations', () => {
  const schedule = readSource('src/pages/dentist-portal/schedule/index.jsx');
  const clinicServices = readSource('src/pages/dentist-portal/profile/ClinicServices.jsx');
  const branchList = readSource('src/components/clinic/BranchList.jsx');
  const staffList = readSource('src/components/clinic/StaffList.jsx');
  const clinicDetail = readSource('src/pages/admin-portal/clinic-management/components/ClinicDetail.jsx');

  assert.match(schedule, /Promise\.all\(\[loadAppointments\(\), loadDentistProfile\(\)\]\)/);
  assert.match(clinicServices, /PORTAL_REFRESH_PROFILES\.STAFF/);
  assert.match(clinicServices, /usePortalRealtimeRefresh/);
  assert.match(branchList, /onClick=\{\(\) => onSelect\(branch\)\}/);
  assert.match(branchList, /aria-pressed=\{isSelected\}/);
  assert.match(staffList, /aria-expanded=\{isExpanded\}/);
  assert.match(staffList, /dentistProfile\.primarySpecialization/);
  assert.match(clinicDetail, /<BranchList/);
  assert.match(clinicDetail, /onSelect=\{\(branch\) =>/);
});
