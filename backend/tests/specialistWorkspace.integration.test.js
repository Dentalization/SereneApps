import 'dotenv/config';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { signAccess } from '../src/utils/tokens.js';
import specialistWorkspaceRouter from '../src/routes/specialistWorkspace.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'specialist-workspace-test-secret';

const prisma = new PrismaClient();
const fixture = {
  appointmentIds: [],
  branchIds: [],
  clinicIds: [],
  studyIds: [],
  userIds: [],
};

function uniqueValue(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/v1/specialist-workspace', specialistWorkspaceRouter);
  return app;
}

async function withServer(run) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const address = server.address();
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
      email: `${uniqueValue(label.toLowerCase().replaceAll(' ', '-'))}@specialist-workspace.test`,
      password_hash: 'hash',
      roles,
    },
  });
  fixture.userIds.push(user.id);
  return user;
}

async function createClinic(label) {
  const owner = await createUser(`${label} Owner`, ['clinic_owner']);
  const unique = uniqueValue(label.toLowerCase().replaceAll(' ', '-'));
  const clinic = await prisma.clinicProfile.create({
    data: {
      userId: owner.id,
      legalName: `${label} Legal`,
      brandName: label,
      facilityType: 'Dental Clinic',
      streetAddress: 'Jl. Specialist 1',
      city: 'Jakarta',
      province: 'DKI Jakarta',
      postalCode: '10110',
      phone: '+6281000000000',
      email: `${unique}@specialist-workspace.test`,
      operatingHours: { monday: '09:00-17:00' },
      ownerName: `${label} Owner`,
      ownerPosition: 'Owner',
      ownerEmail: `${unique}-owner@specialist-workspace.test`,
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
      branchCode: uniqueValue('specialist-branch'),
      streetAddress: 'Jl. Specialist 2',
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
      assignedBranchId,
      role,
      isActive: true,
      permissions: {},
    },
  });
}

async function createAppointment({ patient, dentist, clinic, branch }) {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      dentistId: dentist.id,
      clinicBranchId: branch.id,
      ownerType: 'clinic',
      ownerClinicId: clinic.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
      reason: 'Radiology review',
      status: 'scheduled',
    },
  });
  fixture.appointmentIds.push(appointment.id);
  await prisma.appointmentPreSessionHealthForm.create({
    data: {
      appointmentId: appointment.id,
      patientId: patient.id,
      symptoms: 'Nyeri saat mengunyah',
      painLevel: 5,
      allergies: 'Latex',
      medications: 'Ibuprofen',
      notes: 'Perlu verifikasi dokter',
    },
  });
  return appointment;
}

async function createImagingStudy({ patient, dentist }) {
  const study = await prisma.imagingStudy.create({
    data: {
      patientId: patient.id,
      dentistId: dentist.id,
      studyDate: new Date('2026-06-15T00:00:00.000Z'),
      description: 'Panoramic radiograph',
      modality: 'PAN',
      folderName: uniqueValue('specialist-xcore-study'),
      originalName: 'patient-panoramic',
      status: 'processed',
      metadata: {},
      series: {
        create: {
          modality: 'PAN',
          description: 'Panoramic series',
          bodyPart: 'Jaw',
          numSlices: 1,
          folderPath: 'uploads/x-core/test',
        },
      },
    },
    include: { series: true },
  });
  fixture.studyIds.push(study.id);
  return study;
}

async function cleanupFixtures() {
  if (prisma.specialistCase) {
    await prisma.specialistCase.deleteMany({
      where: { dentistId: { in: fixture.userIds } },
    }).catch(() => {});
  }
  const appointmentIds = fixture.appointmentIds.splice(0);
  if (appointmentIds.length) {
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  }
  const studyIds = fixture.studyIds.splice(0);
  if (studyIds.length) {
    await prisma.imagingStudy.deleteMany({ where: { id: { in: studyIds } } });
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

after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});

test('Specialist Workspace enforces dentist lifecycle, clinic summary, and admin aggregate boundaries', async () => {
  const clinic = await createClinic('Specialist Clinic');
  const branchA = await createBranch(clinic, 'Specialist Branch A');
  const branchB = await createBranch(clinic, 'Specialist Branch B');
  const patient = await createUser('Specialist Patient', ['patient']);
  await prisma.patientProfile.create({
    data: {
      userId: patient.id,
      gender: 'female',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      insuranceProvider: 'Test Insurance',
      medicalDetails: {
        allergies: ['Latex'],
        conditions: ['Hypertension'],
        medications: ['Ibuprofen'],
      },
      emergencyContact: { name: 'Emergency Contact', phone: '+6281000000001' },
    },
  });
  const dentistA = await createUser('Specialist Dentist A', ['dentist']);
  const dentistB = await createUser('Specialist Dentist B', ['dentist']);
  const frontOfficeA = await createUser('Specialist Front Office A', ['front_office']);
  const frontOfficeB = await createUser('Specialist Front Office B', ['front_office']);
  const admin = await createUser('Specialist Admin', ['admin']);
  await addStaff(dentistA, clinic, 'dentist', branchA.id);
  await addStaff(dentistB, clinic, 'dentist', branchB.id);
  await addStaff(frontOfficeA, clinic, 'front_office', branchA.id);
  await addStaff(frontOfficeB, clinic, 'front_office', branchB.id);
  const appointment = await createAppointment({ patient, dentist: dentistA, clinic, branch: branchA });
  const imagingStudy = await createImagingStudy({ patient, dentist: dentistA });
  const otherPatient = await createUser('Other Specialist Patient', ['patient']);
  const otherAppointment = await createAppointment({
    patient: otherPatient,
    dentist: dentistA,
    clinic,
    branch: branchA,
  });
  const otherPatientStudy = await createImagingStudy({
    patient: otherPatient,
    dentist: dentistA,
  });

  const tokens = {
    patient: signAccess({ id: patient.id.toString(), roles: patient.roles }),
    dentistA: signAccess({ id: dentistA.id.toString(), roles: dentistA.roles }),
    dentistB: signAccess({ id: dentistB.id.toString(), roles: dentistB.roles }),
    frontOfficeA: signAccess({ id: frontOfficeA.id.toString(), roles: frontOfficeA.roles }),
    frontOfficeB: signAccess({ id: frontOfficeB.id.toString(), roles: frontOfficeB.roles }),
    admin: signAccess({ id: admin.id.toString(), roles: admin.roles }),
  };

  await withServer(async (baseUrl) => {
    const patientStudies = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/xcore/studies?patientId=${patient.id}`,
      tokens.dentistA,
    );
    assert.equal(patientStudies.status, 200, JSON.stringify(patientStudies.json));
    assert.equal(patientStudies.json.studies.length, 1);
    assert.deepEqual(patientStudies.json.studies[0], {
      id: imagingStudy.id.toString(),
      patientId: patient.id.toString(),
      studyDate: '2026-06-15T00:00:00.000Z',
      description: 'Panoramic radiograph',
      modality: 'PAN',
      status: 'processed',
      seriesCount: 1,
      series: [{
        id: imagingStudy.series[0].id.toString(),
        modality: 'PAN',
        description: 'Panoramic series',
        bodyPart: 'Jaw',
        numSlices: 1,
      }],
    });

    const inaccessibleStudies = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/xcore/studies?patientId=${patient.id}`,
      tokens.dentistB,
    );
    assert.equal(inaccessibleStudies.status, 403, JSON.stringify(inaccessibleStudies.json));

    const patientMismatch = await httpJson(
      baseUrl,
      '/v1/specialist-workspace/cases',
      tokens.dentistA,
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id.toString(),
          xcoreStudyId: otherPatientStudy.id.toString(),
          title: 'Mismatched evidence must fail',
          caseType: 'radiology',
        }),
      },
    );
    assert.equal(patientMismatch.status, 403, JSON.stringify(patientMismatch.json));
    assert.equal(patientMismatch.json.error.code, 'xcore_study_patient_mismatch');

    const multipleReferences = await httpJson(
      baseUrl,
      '/v1/specialist-workspace/cases',
      tokens.dentistA,
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id.toString(),
          xcoreStudyId: imagingStudy.id.toString(),
          xcoreVerifiedCaseId: 'verified-case-reference',
          title: 'Ambiguous evidence must fail',
          caseType: 'radiology',
        }),
      },
    );
    assert.equal(multipleReferences.status, 400, JSON.stringify(multipleReferences.json));
    assert.equal(
      multipleReferences.json.error.code,
      'multiple_xcore_references_not_allowed',
    );

    const created = await httpJson(baseUrl, '/v1/specialist-workspace/cases', tokens.dentistA, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        originAppointmentId: appointment.id.toString(),
        caseType: 'radiology',
        xcoreStudyId: imagingStudy.id.toString(),
        title: 'Radiology review - tooth 36',
        summary: 'Evaluate existing radiology evidence.',
      }),
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const caseId = created.json.case.id;
    assert.equal(created.json.case.status, 'draft');
    assert.equal(created.json.case.caseType, 'radiology');
    assert.equal(created.json.case.xcoreStudyId, imagingStudy.id.toString());

    // Guard check: creating duplicate case for same xcoreStudyId must be rejected
    const duplicateStudy = await httpJson(
      baseUrl,
      '/v1/specialist-workspace/cases',
      tokens.dentistA,
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id.toString(),
          originAppointmentId: appointment.id.toString(),
          caseType: 'radiology',
          xcoreStudyId: imagingStudy.id.toString(),
          title: 'Duplicate study case must be rejected',
        }),
      },
    );
    assert.equal(duplicateStudy.status, 409, JSON.stringify(duplicateStudy.json));
    assert.equal(duplicateStudy.json.error.code, 'xcore_study_duplicate_case');

    const duplicate = await httpJson(
      baseUrl,
      '/v1/specialist-workspace/cases',
      tokens.dentistA,
      {
        method: 'POST',
        body: JSON.stringify({
          patientId: patient.id.toString(),
          originAppointmentId: appointment.id.toString(),
          caseType: 'radiology',
          title: 'Duplicate radiology case must be rejected',
        }),
      },
    );
    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.json));
    assert.equal(duplicate.json.error.code, 'specialist_case_duplicate');
    assert.equal(duplicate.json.error.existingCaseId, caseId);
    assert.equal(
      await prisma.specialistCase.count({
        where: {
          dentistId: dentistA.id,
          patientId: patient.id,
          originAppointmentId: appointment.id,
          status: { not: 'archived' },
        },
      }),
      1,
    );

    const concurrentCreates = await Promise.all([
      httpJson(baseUrl, '/v1/specialist-workspace/cases', tokens.dentistA, {
        method: 'POST',
        body: JSON.stringify({
          patientId: otherPatient.id.toString(),
          originAppointmentId: otherAppointment.id.toString(),
          caseType: 'radiology',
          title: 'Concurrent radiology case A',
        }),
      }),
      httpJson(baseUrl, '/v1/specialist-workspace/cases', tokens.dentistA, {
        method: 'POST',
        body: JSON.stringify({
          patientId: otherPatient.id.toString(),
          originAppointmentId: otherAppointment.id.toString(),
          caseType: 'radiology',
          title: 'Concurrent radiology case B',
        }),
      }),
    ]);
    assert.deepEqual(
      concurrentCreates.map((response) => response.status).sort(),
      [201, 409],
    );
    const concurrentCreated = concurrentCreates.find((response) => response.status === 201);
    const concurrentConflict = concurrentCreates.find((response) => response.status === 409);
    assert.equal(
      concurrentConflict.json.error.existingCaseId,
      concurrentCreated.json.case.id,
    );

    const createdEvents = await prisma.specialistCaseTimelineEvent.findMany({
      where: { specialistCaseId: BigInt(caseId) },
    });
    assert.deepEqual(
      createdEvents.map((event) => event.eventType),
      ['case_created', 'xcore_result_linked'],
    );

    const ownList = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases?patientId=${patient.id}&caseType=radiology`,
      tokens.dentistA,
    );
    assert.equal(ownList.status, 200);
    assert.equal(ownList.json.cases.length, 1);
    assert.deepEqual(ownList.json.cases[0].patient, {
      id: patient.id.toString(),
      name: patient.name,
    });

    const appointmentFilteredList = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases?originAppointmentId=${appointment.id}`,
      tokens.dentistA,
    );
    assert.equal(appointmentFilteredList.status, 200, JSON.stringify(appointmentFilteredList.json));
    assert.equal(appointmentFilteredList.json.cases.length, 1);
    assert.equal(
      appointmentFilteredList.json.cases[0].originAppointmentId,
      appointment.id.toString(),
    );
    const unrelatedAppointmentFilter = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases?originAppointmentId=${appointment.id + 999999n}`,
      tokens.dentistA,
    );
    assert.equal(unrelatedAppointmentFilter.status, 200);
    assert.deepEqual(unrelatedAppointmentFilter.json.cases, []);

    const detail = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}`, tokens.dentistA);
    assert.equal(detail.status, 200, JSON.stringify(detail.json));
    assert.equal(detail.json.case.patient.name, patient.name);
    assert.deepEqual(detail.json.case.patient.medicalContext.allergies, ['Latex']);
    assert.equal(detail.json.case.patient.insurance.provider, 'Test Insurance');
    assert.equal(detail.json.case.appointment.healthForm.allergies, 'Latex');
    assert.deepEqual(detail.json.case.notes, []);
    assert.equal(detail.json.case.xcore.source, 'study');
    assert.equal(detail.json.case.xcore.referenceId, imagingStudy.id.toString());
    assert.equal(detail.json.case.xcore.description, 'Panoramic radiograph');
    assert.equal(detail.json.case.xcore.seriesCount, 1);
    assert.equal(
      detail.json.case.xcore.openPath,
      `/dentist-portal/x-core?studyId=${imagingStudy.id}`,
    );

    for (const token of [tokens.dentistB, tokens.frontOfficeA, tokens.admin, tokens.patient]) {
      const denied = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}`, token);
      assert.equal(denied.status, 403, JSON.stringify(denied.json));
    }

    const note = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases/${caseId}/notes`,
      tokens.dentistA,
      { method: 'POST', body: JSON.stringify({ content: 'Review radiolucency around tooth 36.' }) },
    );
    assert.equal(note.status, 201, JSON.stringify(note.json));
    assert.equal(note.json.note.content, 'Review radiolucency around tooth 36.');

    const summary = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/clinic/patients/${patient.id}/case-summary`,
      tokens.frontOfficeA,
    );
    assert.equal(summary.status, 200, JSON.stringify(summary.json));
    assert.equal(summary.json.cases.length, 1);
    assert.deepEqual(Object.keys(summary.json.cases[0]).sort(), [
      'caseType',
      'hasXcoreEvidence',
      'id',
      'safeLabel',
      'status',
      'updatedAt',
    ]);
    assert.equal(summary.json.cases[0].safeLabel, 'Radiology specialist case');
    assert.doesNotMatch(
      JSON.stringify(summary.json),
      /Radiology review - tooth 36|note|radiolucency|findings|rawAi/i,
    );

    const crossBranchSummary = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/clinic/patients/${patient.id}/case-summary`,
      tokens.frontOfficeB,
    );
    assert.equal(crossBranchSummary.status, 403, JSON.stringify(crossBranchSummary.json));

    const invalidTransition = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases/${caseId}/status`,
      tokens.dentistA,
      { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) },
    );
    assert.equal(invalidTransition.status, 409, JSON.stringify(invalidTransition.json));

    for (const status of ['active', 'completed', 'archived']) {
      if (status === 'completed') {
        const missingCompletionSummary = await httpJson(
          baseUrl,
          `/v1/specialist-workspace/cases/${caseId}/status`,
          tokens.dentistA,
          { method: 'PATCH', body: JSON.stringify({ status }) },
        );
        assert.equal(
          missingCompletionSummary.status,
          400,
          JSON.stringify(missingCompletionSummary.json),
        );
        assert.equal(
          missingCompletionSummary.json.error.code,
          'completion_summary_required',
        );
      }
      const transition = await httpJson(
        baseUrl,
        `/v1/specialist-workspace/cases/${caseId}/status`,
        tokens.dentistA,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            ...(status === 'completed'
              ? { completionSummary: 'Dentist-approved radiology completion summary.' }
              : {}),
          }),
        },
      );
      assert.equal(transition.status, 200, JSON.stringify(transition.json));
      assert.equal(transition.json.case.status, status);
      if (status === 'completed') {
        assert.ok(transition.json.case.completedAt);
        assert.equal(
          transition.json.case.completionSummary,
          'Dentist-approved radiology completion summary.',
        );
      }
      if (status === 'archived') assert.ok(transition.json.case.archivedAt);

      if (status === 'completed') {
        const completedNote = await httpJson(
          baseUrl,
          `/v1/specialist-workspace/cases/${caseId}/notes`,
          tokens.dentistA,
          {
            method: 'POST',
            body: JSON.stringify({ content: 'This note must be rejected after completion.' }),
          },
        );
        assert.equal(completedNote.status, 409, JSON.stringify(completedNote.json));
        assert.equal(completedNote.json.error.code, 'specialist_case_not_editable');
      }
    }

    const timeline = await prisma.specialistCaseTimelineEvent.findMany({
      where: { specialistCaseId: BigInt(caseId) },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
    assert.deepEqual(timeline.map((event) => event.eventType), [
      'case_created',
      'xcore_result_linked',
      'note_added',
      'status_changed',
      'status_changed',
      'status_changed',
      'case_archived',
    ]);

    const analytics = await httpJson(
      baseUrl,
      '/v1/specialist-workspace/admin/analytics',
      tokens.admin,
    );
    assert.equal(analytics.status, 200, JSON.stringify(analytics.json));
    assert.ok(analytics.json.totalCases >= 1);
    assert.ok(analytics.json.archivedCount >= 1);
    assert.doesNotMatch(JSON.stringify(analytics.json), /patientId|patientName|dentistName|note|radiolucency/i);
  });
});

test('Endo-Core MVP enforces FDI, duplicates, ownership, workflow, lifecycle, and PHI boundaries', async () => {
  const clinic = await createClinic('Endo Core Clinic');
  const branch = await createBranch(clinic, 'Endo Core Branch');
  const patient = await createUser('Endo Core Patient', ['patient']);
  const unrelatedPatient = await createUser('Endo Unrelated Patient', ['patient']);
  const dentist = await createUser('Endo Core Dentist', ['dentist']);
  const unrelatedDentist = await createUser('Endo Other Dentist', ['dentist']);
  const frontOffice = await createUser('Endo Front Office', ['front_office']);
  const admin = await createUser('Endo Admin', ['admin']);
  await addStaff(dentist, clinic, 'dentist', branch.id);
  await addStaff(unrelatedDentist, clinic, 'dentist', branch.id);
  await addStaff(frontOffice, clinic, 'front_office', branch.id);
  const appointment = await createAppointment({ patient, dentist, clinic, branch });
  const study = await createImagingStudy({ patient, dentist });
  const tokens = {
    dentist: signAccess({ id: dentist.id.toString(), roles: dentist.roles }),
    unrelatedDentist: signAccess({ id: unrelatedDentist.id.toString(), roles: unrelatedDentist.roles }),
    frontOffice: signAccess({ id: frontOffice.id.toString(), roles: frontOffice.roles }),
    admin: signAccess({ id: admin.id.toString(), roles: admin.roles }),
  };

  await withServer(async (baseUrl) => {
    const invalidTooth = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        title: 'Invalid tooth',
        toothNumber: '99',
        chiefComplaint: 'Pain',
      }),
    });
    assert.equal(invalidTooth.status, 400);
    assert.equal(invalidTooth.json.error.code, 'invalid_endo_tooth_number');

    const missingComplaint = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        title: 'Missing complaint',
        toothNumber: '36',
      }),
    });
    assert.equal(missingComplaint.status, 400);
    assert.equal(missingComplaint.json.error.code, 'chief_complaint_required');

    const unrelated = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.unrelatedDentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        title: 'Forbidden',
        toothNumber: '36',
        chiefComplaint: 'Pain',
      }),
    });
    assert.equal(unrelated.status, 403);

    const created = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        originAppointmentId: appointment.id.toString(),
        xcoreStudyId: study.id.toString(),
        title: 'Endodontic case - tooth 36',
        toothNumber: '36',
        odontogramPosition: '36-M',
        odontogramCodeAtCreation: 'CARIES',
        chiefComplaint: 'Nyeri berdenyut gigi 36 sejak 3 hari',
      }),
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const caseId = created.json.case.id;
    assert.equal(created.json.case.caseType, 'endodontic');
    assert.equal(created.json.case.endo.toothNumber, '36');

    const duplicateTooth = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        title: 'Duplicate tooth',
        toothNumber: '36',
        chiefComplaint: 'Pain',
      }),
    });
    assert.equal(duplicateTooth.status, 409);
    assert.equal(duplicateTooth.json.error.code, 'endo_tooth_duplicate_case');
    assert.equal(duplicateTooth.json.error.existingCaseId, caseId);

    const duplicateStudy = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        xcoreStudyId: study.id.toString(),
        title: 'Duplicate evidence',
        toothNumber: '35',
        chiefComplaint: 'Pain',
      }),
    });
    assert.equal(duplicateStudy.status, 409);
    assert.equal(duplicateStudy.json.error.code, 'endo_xcore_duplicate_case');
    assert.equal(duplicateStudy.json.error.existingCaseId, caseId);

    const detail = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}`, tokens.dentist);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.case.patient.name, patient.name);
    assert.equal(detail.json.case.xcore.referenceId, study.id.toString());
    for (const token of [tokens.unrelatedDentist, tokens.frontOffice, tokens.admin]) {
      const denied = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}`, token);
      assert.equal(denied.status, 403);
    }

    const badTest = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/diagnostic-tests`, tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({ testType: 'ept', result: 'positive' }),
    });
    assert.equal(badTest.status, 400);
    const diagnostic = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/diagnostic-tests`, tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({ testType: 'cold', result: 'positive lingering', notes: 'Over 10 seconds' }),
    });
    assert.equal(diagnostic.status, 201);
    const diagnosticUpdate = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/diagnostic-tests/${diagnostic.json.test.id}`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ result: 'positive lingering confirmed' }),
    });
    assert.equal(diagnosticUpdate.status, 200);

    const badStage = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/treatment-stages`, tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({ stageType: 'surgery', status: 'completed' }),
    });
    assert.equal(badStage.status, 400);
    const badStatus = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/treatment-stages`, tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({ stageType: 'assessment', status: 'done' }),
    });
    assert.equal(badStatus.status, 400);
    const stage = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/treatment-stages`, tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        stageType: 'assessment',
        status: 'completed',
        appointmentId: appointment.id.toString(),
        notes: 'Assessment documented',
      }),
    });
    assert.equal(stage.status, 201);
    const stageUpdate = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/treatment-stages/${stage.json.stage.id}`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'in_progress' }),
    });
    assert.equal(stageUpdate.status, 200);

    const active = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    });
    assert.equal(active.status, 200);

    const missingDiagnosis = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', completionSummary: 'Summary' }),
    });
    assert.equal(missingDiagnosis.status, 400);
    assert.equal(missingDiagnosis.json.error.code, 'endo_completion_diagnosis_required');

    const pulpDiagnosis = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({
        pulpDiagnosis: 'Symptomatic irreversible pulpitis',
      }),
    });
    assert.equal(pulpDiagnosis.status, 200);

    const missingPeriapicalDiagnosis = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', completionSummary: 'Summary' }),
    });
    assert.equal(missingPeriapicalDiagnosis.status, 400);
    assert.equal(missingPeriapicalDiagnosis.json.error.code, 'endo_completion_diagnosis_required');

    const diagnosis = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({
        periapicalDiagnosis: 'Symptomatic apical periodontitis',
        difficultyLevel: 'moderate',
      }),
    });
    assert.equal(diagnosis.status, 200);

    const missingSummary = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(missingSummary.status, 400);
    assert.equal(missingSummary.json.error.code, 'completion_summary_required');

    const completed = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed', completionSummary: 'RCT documentation completed by dentist.' }),
    });
    assert.equal(completed.status, 200);

    for (const suffix of ['diagnostic-tests', 'treatment-stages']) {
      const blocked = await httpJson(baseUrl, `/v1/specialist-workspace/endo/cases/${caseId}/${suffix}`, tokens.dentist, {
        method: 'POST',
        body: JSON.stringify(suffix === 'diagnostic-tests'
          ? { testType: 'cold' }
          : { stageType: 'follow_up' }),
      });
      assert.equal(blocked.status, 409);
    }

    const detailAfterWorkflow = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/endo/cases/${caseId}`,
      tokens.dentist,
    );
    assert.equal(detailAfterWorkflow.status, 200);
    const endoTimelineEvents = detailAfterWorkflow.json.case.timelineEvents.map(
      (event) => event.eventType,
    );
    assert.ok(endoTimelineEvents.includes('endo_diagnostic_test_added'));
    assert.ok(endoTimelineEvents.includes('endo_diagnostic_test_updated'));
    assert.ok(endoTimelineEvents.includes('endo_treatment_stage_added'));
    assert.ok(endoTimelineEvents.includes('endo_treatment_stage_updated'));

    const clinicSummary = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/clinic/patients/${patient.id}/case-summary`,
      tokens.frontOffice,
    );
    assert.equal(clinicSummary.status, 200);
    const serializedSummary = JSON.stringify(clinicSummary.json);
    assert.match(serializedSummary, /Endodontic specialist case/);
    assert.doesNotMatch(serializedSummary, /36|pulp|periapical|diagnostic|Assessment documented|completionSummary/i);

    const analytics = await httpJson(baseUrl, '/v1/specialist-workspace/admin/analytics', tokens.admin);
    assert.equal(analytics.status, 200);
    assert.doesNotMatch(JSON.stringify(analytics.json), /tooth|diagnosis|patientId|patientName/i);

    const archived = await httpJson(baseUrl, `/v1/specialist-workspace/cases/${caseId}/status`, tokens.dentist, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' }),
    });
    assert.equal(archived.status, 200);
    const replacement = await httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
      method: 'POST',
      body: JSON.stringify({
        patientId: patient.id.toString(),
        title: 'Replacement Endo case',
        toothNumber: '36',
        chiefComplaint: 'Reassessment after archived case',
      }),
    });
    assert.equal(replacement.status, 201, JSON.stringify(replacement.json));

    const concurrentToothPayload = JSON.stringify({
      patientId: patient.id.toString(),
      title: 'Concurrent tooth case',
      toothNumber: '33',
      chiefComplaint: 'Concurrent duplicate prevention',
    });
    const concurrentToothCreates = await Promise.all([
      httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
        method: 'POST',
        body: concurrentToothPayload,
      }),
      httpJson(baseUrl, '/v1/specialist-workspace/endo/cases', tokens.dentist, {
        method: 'POST',
        body: concurrentToothPayload,
      }),
    ]);
    assert.deepEqual(
      concurrentToothCreates.map((response) => response.status).sort(),
      [201, 409],
    );

    const concurrentXcoreCreates = await Promise.all(
      ['34', '35'].map((toothNumber) => httpJson(
        baseUrl,
        '/v1/specialist-workspace/endo/cases',
        tokens.dentist,
        {
          method: 'POST',
          body: JSON.stringify({
            patientId: patient.id.toString(),
            xcoreStudyId: study.id.toString(),
            title: `Concurrent X-Core case ${toothNumber}`,
            toothNumber,
            chiefComplaint: 'Concurrent X-Core duplicate prevention',
          }),
        },
      )),
    );
    assert.deepEqual(
      concurrentXcoreCreates.map((response) => response.status).sort(),
      [201, 409],
    );

    const incompleteCase = await prisma.specialistCase.create({
      data: {
        patientId: unrelatedPatient.id,
        dentistId: dentist.id,
        caseType: 'endodontic',
        title: 'Incomplete raw Endo case',
      },
    });
    const activationBlocked = await httpJson(
      baseUrl,
      `/v1/specialist-workspace/cases/${incompleteCase.id}/status`,
      tokens.dentist,
      { method: 'PATCH', body: JSON.stringify({ status: 'active' }) },
    );
    assert.equal(activationBlocked.status, 400);
    assert.equal(activationBlocked.json.error.code, 'endo_activation_requirements_missing');
  });
});
