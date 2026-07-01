import 'dotenv/config';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { signAccess } from '../src/utils/tokens.js';
import appointmentsRouter from '../src/routes/appointments.js';
import clinicRouter from '../src/routes/clinic.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'cross-portal-authorization-test-secret';

const prisma = new PrismaClient();
const fixture = {
  appointmentIds: [],
  branchIds: [],
  clinicIds: [],
  userIds: [],
};

function uniqueValue(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/appointments', appointmentsRouter);
  app.use('/v1/clinic', clinicRouter);
  return app;
}

async function withServer(run) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function httpJson(baseUrl, path, token, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {},
  };
}

async function createUser(label, roles) {
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `${uniqueValue(label.toLowerCase().replaceAll(' ', '-'))}@cross-portal-auth.test`,
      password_hash: 'hash',
      roles,
    },
  });
  fixture.userIds.push(user.id);
  return user;
}

async function createClinic(label) {
  const profileOwner = await createUser(`${label} Profile Owner`, ['clinic_owner']);
  const unique = uniqueValue(label.toLowerCase().replaceAll(' ', '-'));
  const clinic = await prisma.clinicProfile.create({
    data: {
      userId: profileOwner.id,
      legalName: `${label} Legal`,
      brandName: label,
      facilityType: 'Dental Clinic',
      streetAddress: 'Jl. Test 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
      phone: '+6281000000000',
      email: `${unique}@cross-portal-auth.test`,
      operatingHours: { monday: '09:00-17:00' },
      ownerName: `${label} Owner`,
      ownerPosition: 'Owner',
      ownerEmail: `${unique}-owner@cross-portal-auth.test`,
      ownerWhatsapp: '+6281000000000',
      ownerNik: uniqueValue('nik'),
      ktpFilePath: 'uploads/test/ktp.png',
      nibNumber: uniqueValue('nib'),
      nibFilePath: 'uploads/test/nib.pdf',
      npwpNumber: uniqueValue('npwp'),
      npwpFilePath: 'uploads/test/npwp.pdf',
      operationalLicenseFilePath: 'uploads/test/license.pdf',
      termsAccepted: true,
      privacyAccepted: true,
      status: 'verified',
    },
  });
  fixture.clinicIds.push(clinic.id);
  return clinic;
}

async function createBranch(clinic, label) {
  const branch = await prisma.clinicBranch.create({
    data: {
      clinicProfileId: clinic.id,
      branchName: label,
      branchCode: uniqueValue('branch'),
      streetAddress: 'Jl. Test 2',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
      treatmentRoomsCount: 2,
    },
  });
  fixture.branchIds.push(branch.id);
  return branch;
}

async function addStaff(user, clinic, role, assignedBranchId = null) {
  return prisma.clinicStaff.create({
    data: {
      userId: user.id,
      clinicProfileId: clinic.id,
      role,
      assignedBranchId,
      isActive: true,
      permissions: {},
    },
  });
}

async function createAppointment({ patient, dentist, clinic, branch, reason }) {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      dentistId: dentist.id,
      ownerType: 'clinic',
      ownerClinicId: clinic.id,
      clinicBranchId: branch.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      status: 'scheduled',
      reason,
    },
  });
  fixture.appointmentIds.push(appointment.id);
  return appointment;
}

async function cleanupFixtures() {
  const appointmentIds = fixture.appointmentIds.splice(0);
  if (appointmentIds.length) {
    await prisma.domainEventOutbox.deleteMany({
      where: {
        aggregateType: 'appointment',
        aggregateId: { in: appointmentIds.map((id) => id.toString()) },
      },
    }).catch(() => {});
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }

  const userIds = fixture.userIds.splice(0);
  if (userIds.length) {
    await prisma.clinicStaff.deleteMany({ where: { userId: { in: userIds } } });
  }
  const branchIds = fixture.branchIds.splice(0);
  if (branchIds.length) {
    await prisma.clinicBranch.deleteMany({ where: { id: { in: branchIds } } });
  }
  const clinicIds = fixture.clinicIds.splice(0);
  if (clinicIds.length) {
    await prisma.clinicProfile.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

before(cleanupFixtures);
after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('runtime authorization aligns dentist cancellation and branch-scoped clinic patient access', async () => {
  const clinic = await createClinic('Cross Portal Clinic');
  const branchA = await createBranch(clinic, 'Branch A');
  const branchB = await createBranch(clinic, 'Branch B');
  const patient = await createUser('Cross Portal Patient', ['patient']);
  const otherPatient = await createUser('Cross Portal Other Patient', ['patient']);
  const dentistA = await createUser('Cross Portal Dentist A', ['dentist']);
  const dentistB = await createUser('Cross Portal Dentist B', ['dentist']);
  const frontOffice = await createUser('Cross Portal Front Office', ['front_office']);
  const nurse = await createUser('Cross Portal Nurse', ['nurse']);
  const staff = await createUser('Cross Portal Staff', ['staff']);
  const legacyCashier = await createUser('Cross Portal Legacy Cashier', ['clinic_staff']);
  await addStaff(dentistA, clinic, 'dentist', branchA.id);
  await addStaff(dentistB, clinic, 'dentist', branchB.id);
  await addStaff(frontOffice, clinic, 'front_office', branchA.id);
  await addStaff(nurse, clinic, 'nurse', branchA.id);
  await addStaff(staff, clinic, 'staff', branchA.id);
  await addStaff(legacyCashier, clinic, 'cashier', branchA.id);

  const patientOwn = await createAppointment({
    patient,
    dentist: dentistA,
    clinic,
    branch: branchA,
    reason: 'Patient cancellation',
  });
  const dentistOwn = await createAppointment({
    patient,
    dentist: dentistA,
    clinic,
    branch: branchA,
    reason: 'Dentist cancellation',
  });
  const staffOwnBranch = await createAppointment({
    patient,
    dentist: dentistA,
    clinic,
    branch: branchA,
    reason: 'Staff cancellation',
  });
  const branchBAppointment = await createAppointment({
    patient,
    dentist: dentistB,
    clinic,
    branch: branchB,
    reason: 'Other branch',
  });

  const dentistAToken = signAccess({ id: dentistA.id.toString(), roles: dentistA.roles });
  const dentistBToken = signAccess({ id: dentistB.id.toString(), roles: dentistB.roles });
  const frontOfficeToken = signAccess({ id: frontOffice.id.toString(), roles: frontOffice.roles });
  const nurseToken = signAccess({ id: nurse.id.toString(), roles: nurse.roles });
  const staffToken = signAccess({ id: staff.id.toString(), roles: staff.roles });
  const patientToken = signAccess({ id: patient.id.toString(), roles: patient.roles });
  const otherPatientToken = signAccess({ id: otherPatient.id.toString(), roles: otherPatient.roles });
  const legacyCashierToken = signAccess({ id: legacyCashier.id.toString(), roles: legacyCashier.roles });

  await withServer(async (baseUrl) => {
    const unrelatedPatientCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${patientOwn.id}/cancel`,
      otherPatientToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Unauthorized patient' }) },
    );
    assert.equal(unrelatedPatientCancel.status, 403, JSON.stringify(unrelatedPatientCancel.json));

    const patientCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${patientOwn.id}/cancel`,
      patientToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Patient unavailable' }) },
    );
    assert.equal(patientCancel.status, 200, JSON.stringify(patientCancel.json));

    const dentistCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${dentistOwn.id}/cancel`,
      dentistAToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Dentist unavailable' }) },
    );
    assert.equal(dentistCancel.status, 200, JSON.stringify(dentistCancel.json));

    const unrelatedDentistCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${staffOwnBranch.id}/cancel`,
      dentistBToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Unauthorized' }) },
    );
    assert.equal(unrelatedDentistCancel.status, 403, JSON.stringify(unrelatedDentistCancel.json));

    const staffCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${staffOwnBranch.id}/cancel`,
      frontOfficeToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Clinic reschedule' }) },
    );
    assert.equal(staffCancel.status, 200, JSON.stringify(staffCancel.json));

    const crossBranchCancel = await httpJson(
      baseUrl,
      `/v1/appointments/${branchBAppointment.id}/cancel`,
      frontOfficeToken,
      { method: 'PATCH', body: JSON.stringify({ reason: 'Unauthorized branch' }) },
    );
    assert.equal(crossBranchCancel.status, 403, JSON.stringify(crossBranchCancel.json));

    for (const token of [frontOfficeToken, nurseToken, staffToken]) {
      const patients = await httpJson(baseUrl, '/v1/clinic/patients', token);
      assert.equal(patients.status, 200, JSON.stringify(patients.json));
      assert.ok(patients.json.appointments.some((item) => item.id === staffOwnBranch.id.toString()));
      assert.ok(!patients.json.appointments.some((item) => item.id === branchBAppointment.id.toString()));
    }

    const cashierPatients = await httpJson(baseUrl, '/v1/clinic/patients', legacyCashierToken);
    assert.equal(cashierPatients.status, 403, JSON.stringify(cashierPatients.json));
  });

  const patientHistory = await prisma.appointmentStatusHistory.findFirst({
    where: { appointmentId: patientOwn.id, newStatus: 'cancelled' },
  });
  const dentistHistory = await prisma.appointmentStatusHistory.findFirst({
    where: { appointmentId: dentistOwn.id, newStatus: 'cancelled' },
  });
  const staffHistory = await prisma.appointmentStatusHistory.findFirst({
    where: { appointmentId: staffOwnBranch.id, newStatus: 'cancelled' },
  });
  assert.equal(patientHistory?.changedByRole, 'patient');
  assert.equal(dentistHistory?.changedByRole, 'dentist');
  assert.equal(staffHistory?.changedByRole, 'clinic_staff');
});
