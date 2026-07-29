import 'dotenv/config';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const {
  assignStudyPatient,
  createStudyShare,
  getClinicStudies,
  getEligibleStudyShareDentists,
  getStudies,
  getStudyAnnotations,
  uploadStudy,
} = await import('../src/controllers/xCoreController.js');
const { analyzeStudy } = await import('../src/controllers/xCoreAIController.js');
const { streamSlice } = await import('../src/controllers/xCoreStreamController.js');

let authUserId = null;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: String(authUserId) };
    next();
  });
  app.get('/v1/x-core/studies', getStudies);
  app.get('/v1/x-core/clinic/studies', getClinicStudies);
  app.get('/v1/x-core/studies/:id/annotations', getStudyAnnotations);
  app.get('/v1/x-core/studies/:id/share/eligible-dentists', getEligibleStudyShareDentists);
  app.post('/v1/x-core/studies/:id/share', createStudyShare);
  app.patch('/v1/x-core/studies/:id/patient', assignStudyPatient);
  app.get('/v1/x-core/stream-slice/:studyId/:viewType/:index', streamSlice);
  app.post('/v1/x-core/analyze', analyzeStudy);
  return app;
}

async function withServer(run) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function httpJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    redirect: options.redirect || 'manual',
  });

  const text = await response.text();
  return {
    status: response.status,
    json: text ? JSON.parse(text) : {},
    headers: response.headers,
  };
}

function uniqueValue(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function ignoreMissingTable(promise) {
  try {
    return await promise;
  } catch (error) {
    if (error?.code === 'P2010' && String(error?.meta?.code) === '42P01') return null;
    if (String(error?.message || '').includes('does not exist')) return null;
    throw error;
  }
}

async function cleanupFixtures() {
  const studies = await prisma.imagingStudy.findMany({
    where: { folderName: { startsWith: 'xcore-access-test-' } },
    select: { id: true },
  });
  const studyIds = studies.map((study) => study.id);
  if (studyIds.length > 0) {
    await ignoreMissingTable(prisma.$executeRaw`
      DELETE FROM study_dentist_shares
      WHERE study_id IN (${Prisma.join(studyIds)})
    `);
    await prisma.studyShare.deleteMany({ where: { studyId: { in: studyIds } } });
    await prisma.imagingStudy.deleteMany({ where: { id: { in: studyIds } } });
  }

  const users = await prisma.user.findMany({
    where: { email: { endsWith: '@xcore-access.test' } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.specialistCase.deleteMany({
      where: {
        OR: [
          { patientId: { in: userIds } },
          { dentistId: { in: userIds } },
        ],
      },
    }).catch(() => {});
    await ignoreMissingTable(prisma.$executeRaw`
      DELETE FROM study_dentist_shares
      WHERE owner_dentist_id IN (${Prisma.join(userIds)})
         OR recipient_dentist_id IN (${Prisma.join(userIds)})
         OR created_by IN (${Prisma.join(userIds)})
    `);
    await prisma.clinicStaff.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.dentistProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.clinicProfile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.clinicProfile.deleteMany({
    where: { ownerEmail: { endsWith: '@xcore-access.test' } },
  });
}

async function createUser(label, roles = []) {
  return prisma.user.create({
    data: {
      name: label,
      email: `${uniqueValue(label.toLowerCase().replaceAll(' ', '-'))}@xcore-access.test`,
      password_hash: 'hash',
      roles,
    },
  });
}

async function createClinic(label) {
  const owner = await createUser(`${label} Owner`, ['clinic']);
  const unique = uniqueValue(label.toLowerCase().replaceAll(' ', '-'));
  const clinic = await prisma.clinicProfile.create({
    data: {
      userId: owner.id,
      legalName: `${label} Legal`,
      brandName: label,
      facilityType: 'Dental Clinic',
      streetAddress: 'Jl. Test 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
      phone: '+6281000000000',
      email: `${unique}@xcore-access.test`,
      operatingHours: { monday: '09:00-17:00' },
      ownerName: `${label} Owner`,
      ownerPosition: 'Owner',
      ownerEmail: `${unique}-owner@xcore-access.test`,
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

  return { owner, clinic };
}

async function addClinicStaff(user, clinic, role, isActive = true) {
  return prisma.clinicStaff.create({
    data: {
      userId: user.id,
      clinicProfileId: clinic.id,
      role,
      isActive,
      hireDate: new Date('2026-01-01T00:00:00.000Z'),
      permissions: {},
    },
  });
}

async function createDentist(label, clinic, isActive = true) {
  const user = await createUser(label, ['dentist']);
  await prisma.dentistProfile.create({
    data: {
      userId: user.id,
      title: 'drg.',
      licenseNumber: uniqueValue('lic'),
      licenseIssuingBody: 'Konsil Kedokteran Indonesia',
      licenseExpiryDate: new Date('2030-01-01T00:00:00.000Z'),
      registrationNumber: uniqueValue('reg'),
      primarySpecialization: 'General Dentistry',
      educationQualification: 'DDS',
      yearsOfExperience: 8,
      clinicName: clinic.brandName || clinic.legalName,
      clinicAddress: clinic.streetAddress,
      clinicWorkingHours: '09:00-17:00',
      consultationTypes: ['clinic'],
      servicesOffered: ['consultation'],
      dentist_type: 'clinic',
      clinic_id: clinic.id,
    },
  });
  await addClinicStaff(user, clinic, 'dentist', isActive);
  return user;
}

async function createStudy({ patient, dentist, clinic, folderSuffix = uniqueValue('study'), clinicId = clinic.id }) {
  return prisma.imagingStudy.create({
    data: {
      patientId: patient.id,
      dentistId: dentist.id,
      clinicId,
      studyDate: new Date('2026-02-01T00:00:00.000Z'),
      modality: 'CBCT',
      folderName: `xcore-access-test-${folderSuffix}`,
      originalName: 'Clinic CBCT',
      status: 'processed',
      metadata: {
        PatientName: 'Clinic^Patient',
        StudyDescription: 'Restricted clinic access test',
      },
      sizeInBytes: 0n,
    },
  });
}

async function createFixtureGraph() {
  const { clinic } = await createClinic('XCore Same Clinic');
  const { clinic: otherClinic } = await createClinic('XCore Other Clinic');
  const patient = await createUser('XCore Patient', ['patient']);
  const ownerDentist = await createDentist('XCore Owner Dentist', clinic, true);
  const recipientDentist = await createDentist('XCore Recipient Dentist', clinic, true);
  const inactiveDentist = await createDentist('XCore Inactive Dentist', clinic, false);
  const otherClinicDentist = await createDentist('XCore Other Dentist', otherClinic, true);
  const clinicOwner = await createUser('XCore Clinic Owner', ['clinic']);
  const clinicalDirector = await createUser('XCore Clinical Director', ['clinic']);
  const unauthorizedStaff = await createUser('XCore Front Office', ['clinic']);
  const inactiveClinicalDirector = await createUser('XCore Inactive Director', ['clinic']);
  await addClinicStaff(clinicOwner, clinic, 'clinic_owner', true);
  await addClinicStaff(clinicalDirector, clinic, 'clinical_director', true);
  await addClinicStaff(unauthorizedStaff, clinic, 'front_office', true);
  await addClinicStaff(inactiveClinicalDirector, clinic, 'clinical_director', false);

  const sameClinicStudy = await createStudy({ patient, dentist: ownerDentist, clinic, folderSuffix: uniqueValue('same') });
  const legacyStudy = await createStudy({
    patient,
    dentist: ownerDentist,
    clinic,
    folderSuffix: uniqueValue('legacy'),
    clinicId: null,
  });
  const crossClinicStudy = await createStudy({
    patient,
    dentist: otherClinicDentist,
    clinic: otherClinic,
    folderSuffix: uniqueValue('other'),
  });

  await prisma.$executeRaw`
    INSERT INTO study_annotations (
      id,
      study_id,
      series_uid,
      viewer_type,
      type,
      coordinates,
      metadata,
      created_by
    ) VALUES (
      ${uniqueValue('annotation')},
      ${sameClinicStudy.id},
      'series-1',
      '3d',
      'arrow',
      ${JSON.stringify({ start: [1, 2, 3], end: [4, 5, 6] })}::jsonb,
      ${JSON.stringify({ finding_type: 'other', severity: 'S1' })}::jsonb,
      ${ownerDentist.id}
    )
  `;

  return {
    clinic,
    otherClinic,
    patient,
    ownerDentist,
    recipientDentist,
    inactiveDentist,
    otherClinicDentist,
    clinicOwner,
    clinicalDirector,
    unauthorizedStaff,
    inactiveClinicalDirector,
    sameClinicStudy,
    legacyStudy,
    crossClinicStudy,
  };
}

beforeEach(async () => {
  await cleanupFixtures();
});

after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('clinical X-Core upload rejects an invalid patient assignment before parsing files', async () => {
  let statusCode = 200;
  let payload = null;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
      return this;
    },
  };

  await uploadStudy(
    {
      files: [{ path: '/tmp/nonexistent-xcore-upload', size: 1 }],
      body: { patientId: 'not-a-patient-id' },
      headers: {},
      user: { id: '1' },
    },
    response,
  );

  assert.equal(statusCode, 400);
  assert.equal(payload.code, 'invalid_patient_id');
});

test('clinic X-Core studies are visible only to active authorized clinical roles in the same clinic', async () => {
  const fixture = await createFixtureGraph();

  await withServer(async (baseUrl) => {
    authUserId = fixture.clinicOwner.id;
    const allowed = await httpJson(baseUrl, '/v1/x-core/clinic/studies');

    assert.equal(allowed.status, 200);
    const ids = allowed.json.map((study) => study.id);
    assert.ok(ids.includes(fixture.sameClinicStudy.id.toString()));
    assert.ok(ids.includes(fixture.legacyStudy.id.toString()));
    assert.ok(!ids.includes(fixture.crossClinicStudy.id.toString()));

    authUserId = fixture.clinicalDirector.id;
    const director = await httpJson(baseUrl, '/v1/x-core/clinic/studies');
    assert.equal(director.status, 200);

    authUserId = fixture.unauthorizedStaff.id;
    const unauthorized = await httpJson(baseUrl, '/v1/x-core/clinic/studies');
    assert.equal(unauthorized.status, 403);

    authUserId = fixture.inactiveClinicalDirector.id;
    const inactive = await httpJson(baseUrl, '/v1/x-core/clinic/studies');
    assert.equal(inactive.status, 403);
  });
});

test('authorized clinic X-Core roles can read study annotations but cannot cross clinic boundaries', async () => {
  const fixture = await createFixtureGraph();

  await withServer(async (baseUrl) => {
    authUserId = fixture.clinicOwner.id;
    const sameClinicAnnotations = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/annotations`);
    assert.equal(sameClinicAnnotations.status, 200);
    assert.equal(sameClinicAnnotations.json.annotations.length, 1);

    const crossClinicAnnotations = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.crossClinicStudy.id}/annotations`);
    assert.equal(crossClinicAnnotations.status, 403);

    const crossClinicStream = await httpJson(baseUrl, `/v1/x-core/stream-slice/${fixture.crossClinicStudy.id}/axial/1`);
    assert.equal(crossClinicStream.status, 403);

    const crossClinicAnalyze = await httpJson(baseUrl, '/v1/x-core/analyze', {
      method: 'POST',
      body: JSON.stringify({ studyId: fixture.crossClinicStudy.id.toString() }),
    });
    assert.equal(crossClinicAnalyze.status, 403);
  });
});

test('dentist sharing is limited to active dentists in the same clinic and grants recipient read access', async () => {
  const fixture = await createFixtureGraph();

  await withServer(async (baseUrl) => {
    authUserId = fixture.ownerDentist.id;
    const eligible = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/share/eligible-dentists`);
    assert.equal(eligible.status, 200);
    const eligibleIds = eligible.json.dentists.map((dentist) => dentist.id);
    assert.deepEqual(eligibleIds, [fixture.recipientDentist.id.toString()]);

    const missingRecipient = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ expiresInHours: 48 }),
    });
    assert.equal(missingRecipient.status, 400);

    const inactiveRecipient = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ recipientDentistId: fixture.inactiveDentist.id.toString() }),
    });
    assert.equal(inactiveRecipient.status, 403);

    const crossClinicRecipient = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ recipientDentistId: fixture.otherClinicDentist.id.toString() }),
    });
    assert.equal(crossClinicRecipient.status, 403);

    const shared = await httpJson(baseUrl, `/v1/x-core/studies/${fixture.sameClinicStudy.id}/share`, {
      method: 'POST',
      body: JSON.stringify({ recipientDentistId: fixture.recipientDentist.id.toString() }),
    });
    assert.equal(shared.status, 200);
    assert.equal(shared.json.share.recipientDentistId, fixture.recipientDentist.id.toString());
    assert.equal(shared.json.shareUrl, undefined);
    assert.equal(shared.json.token, undefined);

    const shareRows = await prisma.$queryRaw`
      SELECT study_id, owner_dentist_id, recipient_dentist_id, revoked_at
      FROM study_dentist_shares
      WHERE study_id = ${fixture.sameClinicStudy.id}
    `;
    assert.equal(shareRows.length, 1);
    assert.equal(shareRows[0].recipient_dentist_id, fixture.recipientDentist.id);
    assert.equal(shareRows[0].revoked_at, null);

    authUserId = fixture.recipientDentist.id;
    const recipientStudies = await httpJson(baseUrl, '/v1/x-core/studies');
    assert.equal(recipientStudies.status, 200);
    const recipientStudy = recipientStudies.json.find((study) => study.id === fixture.sameClinicStudy.id.toString());
    assert.ok(recipientStudy);
    assert.equal(recipientStudy.xcoreAccessScope, 'shared_with_me');
  });
});

test('study owner can assign an appointment-linked patient with audit history and case integrity guards', async () => {
  const fixture = await createFixtureGraph();
  const linkedPatient = await createUser('XCore Linked Patient', ['patient']);
  const unrelatedPatient = await createUser('XCore Unrelated Patient', ['patient']);
  const startsAt = new Date('2026-06-01T09:00:00.000Z');
  await prisma.appointment.create({
    data: {
      dentistId: fixture.ownerDentist.id,
      patientId: linkedPatient.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      status: 'completed',
      reason: 'X-Core assignment authorization',
    },
  });
  await prisma.appointment.create({
    data: {
      dentistId: fixture.ownerDentist.id,
      patientId: fixture.patient.id,
      startsAt: new Date('2026-05-01T09:00:00.000Z'),
      endsAt: new Date('2026-05-01T09:30:00.000Z'),
      status: 'completed',
      reason: 'Existing X-Core patient relationship',
    },
  });

  await withServer(async (baseUrl) => {
    authUserId = fixture.ownerDentist.id;
    const deniedPatient = await httpJson(
      baseUrl,
      `/v1/x-core/studies/${fixture.sameClinicStudy.id}/patient`,
      {
        method: 'PATCH',
        body: JSON.stringify({ patientId: unrelatedPatient.id.toString() }),
      },
    );
    assert.equal(deniedPatient.status, 403, JSON.stringify(deniedPatient.json));

    authUserId = fixture.recipientDentist.id;
    const deniedNonOwner = await httpJson(
      baseUrl,
      `/v1/x-core/studies/${fixture.sameClinicStudy.id}/patient`,
      {
        method: 'PATCH',
        body: JSON.stringify({ patientId: linkedPatient.id.toString() }),
      },
    );
    assert.equal(deniedNonOwner.status, 403, JSON.stringify(deniedNonOwner.json));

    authUserId = fixture.ownerDentist.id;
    const assigned = await httpJson(
      baseUrl,
      `/v1/x-core/studies/${fixture.sameClinicStudy.id}/patient`,
      {
        method: 'PATCH',
        body: JSON.stringify({ patientId: linkedPatient.id.toString() }),
      },
    );
    assert.equal(assigned.status, 200, JSON.stringify(assigned.json));
    assert.equal(assigned.json.study.patientId, linkedPatient.id.toString());
    assert.equal(assigned.json.study.patient.name, linkedPatient.name);

    const storedStudy = await prisma.imagingStudy.findUnique({
      where: { id: fixture.sameClinicStudy.id },
    });
    assert.equal(storedStudy.patientId, linkedPatient.id);

    const history = await prisma.imagingStudyPatientAssignment.findMany({
      where: { studyId: fixture.sameClinicStudy.id },
    });
    assert.equal(history.length, 1);
    assert.equal(history[0].previousPatientId, fixture.patient.id);
    assert.equal(history[0].patientId, linkedPatient.id);
    assert.equal(history[0].assignedByDentistId, fixture.ownerDentist.id);
    assert.equal(history[0].source, 'manual');

    await prisma.specialistCase.create({
      data: {
        patientId: linkedPatient.id,
        dentistId: fixture.ownerDentist.id,
        xcoreStudyId: fixture.sameClinicStudy.id,
        title: 'Linked radiology review',
      },
    });
    const linkedCaseConflict = await httpJson(
      baseUrl,
      `/v1/x-core/studies/${fixture.sameClinicStudy.id}/patient`,
      {
        method: 'PATCH',
        body: JSON.stringify({ patientId: fixture.patient.id.toString() }),
      },
    );
    assert.equal(linkedCaseConflict.status, 409, JSON.stringify(linkedCaseConflict.json));
    assert.equal(linkedCaseConflict.json.code, 'study_linked_to_specialist_case');
  });
});
