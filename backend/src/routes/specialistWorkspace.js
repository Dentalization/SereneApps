import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import {
  assertCanAddSpecialistCaseNote,
  assertCanCreateSpecialistCase,
  assertCanEditSpecialistCase,
  assertCanViewSpecialistCase,
  assertCanViewSpecialistCaseAggregate,
  resolveSpecialistCaseClinicSummaryScope,
  SPECIALIST_CASE_STATUSES,
  SPECIALIST_CASE_STATUS_TRANSITIONS,
  SPECIALIST_CASE_TYPES,
  specialistWorkspaceError,
  specialistWorkspaceId,
} from '../services/specialistWorkspaceAuthorization.js';
import {
  activeDentistClinicIds,
  clinicStudyScopeWhereForClinicIds,
  requireXCoreStudyReadAccess,
  sameBigInt,
} from '../services/xCoreAccessPolicyService.js';
import { ENDO_FDI_TEETH } from '../services/endoCorePolicy.js';
import { createEndoCoreRouter } from './endoCore.js';

const prisma = new PrismaClient();
const CLINIC_SUMMARY_ROLES = [
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'clinic_admin',
  'clinic_staff',
  'front_office',
  'nurse',
  'staff',
];

function asId(value) {
  return value === null || value === undefined ? null : value.toString();
}

function textValue(value, fieldName, { required = false, maxLength = 10_000 } = {}) {
  const normalized = value === null || value === undefined ? '' : String(value).trim();
  if (required && !normalized) {
    throw specialistWorkspaceError(400, `${fieldName}_required`, `${fieldName} is required.`);
  }
  if (normalized.length > maxLength) {
    throw specialistWorkspaceError(400, `${fieldName}_too_long`, `${fieldName} is too long.`);
  }
  return normalized || null;
}

function serializeCaseSummary(caseRecord) {
  const summary = {
    id: asId(caseRecord.id),
    patientId: asId(caseRecord.patientId),
    dentistId: asId(caseRecord.dentistId),
    clinicProfileId: asId(caseRecord.clinicProfileId),
    clinicBranchId: asId(caseRecord.clinicBranchId),
    originAppointmentId: asId(caseRecord.originAppointmentId),
    xcoreStudyId: asId(caseRecord.xcoreStudyId),
    xcoreVerifiedCaseId: caseRecord.xcoreVerifiedCaseId || null,
    caseType: caseRecord.caseType,
    status: caseRecord.status,
    title: caseRecord.title,
    summary: caseRecord.summary || null,
    completionSummary: caseRecord.completionSummary || null,
    completedAt: caseRecord.completedAt || null,
    archivedAt: caseRecord.archivedAt || null,
    createdAt: caseRecord.createdAt,
    updatedAt: caseRecord.updatedAt,
  };
  if (caseRecord.patient) {
    summary.patient = {
      id: asId(caseRecord.patient.id),
      name: caseRecord.patient.name || null,
    };
  }
  if (caseRecord.endoCaseDetail) {
    summary.toothNumber = caseRecord.endoCaseDetail.toothNumber;
  }
  return summary;
}

function serializeNote(note) {
  return {
    id: asId(note.id),
    content: note.content,
    isAmendment: note.isAmendment,
    authorDentistId: asId(note.authorDentistId),
    authorName: note.authorDentist?.name || null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function serializeTimelineEvent(event) {
  return {
    id: asId(event.id),
    eventType: event.eventType,
    actorUserId: asId(event.actorUserId),
    actorRole: event.actorRole || null,
    metadata: event.metadata || {},
    createdAt: event.createdAt,
  };
}

function serializePatient(patient) {
  const profile = patient?.patientProfile;
  return {
    id: asId(patient?.id),
    name: patient?.name || null,
    email: patient?.email || null,
    phone: patient?.phone_number || null,
    dateOfBirth: profile?.dateOfBirth || null,
    gender: profile?.gender || null,
    medicalContext: profile?.medicalDetails || null,
    insurance: {
      provider: profile?.insuranceProvider || null,
      number: profile?.insuranceNumber || null,
      memberId: profile?.insuranceMemberId || null,
    },
    emergencyContact: profile?.emergencyContact || null,
  };
}

function serializeAppointment(appointment) {
  if (!appointment) return null;
  const healthForm = appointment.preSessionHealthForm;
  return {
    id: asId(appointment.id),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    reason: appointment.reason || null,
    clinicBranchId: asId(appointment.clinicBranchId),
    healthForm: healthForm
      ? {
          symptoms: healthForm.symptoms || null,
          painLevel: healthForm.painLevel ?? null,
          allergies: healthForm.allergies || null,
          medications: healthForm.medications || null,
          notes: healthForm.notes || null,
          submittedAt: healthForm.submittedAt,
        }
      : null,
  };
}

function rawTableUnavailable(error) {
  return error?.code === 'P2010' && String(error?.meta?.code) === '42P01';
}

function serializeXcoreStudy(study, { includeSource = false } = {}) {
  return {
    ...(includeSource ? { available: true, source: 'study', referenceId: asId(study.id) } : {}),
    id: asId(study.id),
    patientId: asId(study.patientId),
    studyDate: study.studyDate?.toISOString?.() || study.studyDate || null,
    description: study.description || null,
    modality: study.modality,
    status: study.status,
    seriesCount: study.series?.length || 0,
    series: (study.series || []).map((series) => ({
      id: asId(series.id),
      modality: series.modality,
      description: series.description || null,
      bodyPart: series.bodyPart || null,
      numSlices: series.numSlices,
    })),
    ...(includeSource
      ? { openPath: `/dentist-portal/x-core?studyId=${asId(study.id)}` }
      : {}),
  };
}

async function loadXcoreStudyPreview(
  db,
  { studyId, patientId, user, strict = false },
) {
  if (!studyId) return null;
  try {
    const access = await requireXCoreStudyReadAccess({
      studyId,
      user,
      prismaClient: db,
    });
    if (!sameBigInt(access.study.patientId, patientId)) {
      throw specialistWorkspaceError(
        403,
        'xcore_study_patient_mismatch',
        'The selected X-Core study does not belong to this patient.',
      );
    }
    const study = await db.imagingStudy.findUnique({
      where: { id: access.study.id },
      select: {
        id: true,
        patientId: true,
        studyDate: true,
        description: true,
        modality: true,
        status: true,
        series: {
          select: {
            id: true,
            modality: true,
            description: true,
            bodyPart: true,
            numSlices: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!study) {
      throw specialistWorkspaceError(404, 'xcore_study_not_found');
    }
    return serializeXcoreStudy(study, { includeSource: true });
  } catch (error) {
    if (error?.code === 'xcore_study_patient_mismatch') throw error;
    if (strict) {
      throw specialistWorkspaceError(
        error?.status || 500,
        error?.status === 404 ? 'xcore_study_not_found' : 'xcore_study_access_denied',
        error?.status >= 500
          ? 'Unable to validate the selected X-Core study.'
          : 'The selected X-Core study is unavailable or not accessible.',
      );
    }
    return {
      available: false,
      source: 'study',
      referenceId: asId(studyId),
    };
  }
}

// verified_cases is owned by the separately migrated Verified Case/X-Core
// repository and has no Prisma model. Keep this dentist-scoped, parameterized
// cross-system read here until that storage contract is formally unified.
// NOTE: radiology/general specialist cases link to 'verified_cases' via xcoreVerifiedCaseId.
// This represents a completed/verified radiology analysis workflow from X-Core.
// It differs from endoCore's direct linkage to raw imaging studies ('imagingStudy' via xcoreStudyId).
async function loadXcorePreview(
  db,
  { referenceId, patientId, dentistId, strict = false },
) {
  if (!referenceId) return null;
  try {
    const rows = await db.$queryRaw`
      SELECT
        id::text AS id,
        title,
        status,
        verified_at AS "verifiedAt",
        updated_at AS "updatedAt"
      FROM verified_cases
      WHERE id::text = ${String(referenceId)}
        AND patient_id = ${patientId}
        AND created_by = ${dentistId}
      LIMIT 1
    `;
    if (!rows.length) {
      if (strict) {
        throw specialistWorkspaceError(403, 'xcore_reference_access_denied');
      }
      return {
        available: false,
        source: 'verified_case',
        referenceId: String(referenceId),
      };
    }
    return {
      available: true,
      source: 'verified_case',
      referenceId: rows[0].id,
      title: rows[0].title,
      status: rows[0].status,
      verifiedAt: rows[0].verifiedAt,
      updatedAt: rows[0].updatedAt,
      openPath: '/dentist-portal/x-core',
    };
  } catch (error) {
    if (error?.code === 'xcore_reference_access_denied') throw error;
    if (strict) {
      throw specialistWorkspaceError(
        rawTableUnavailable(error) ? 503 : 500,
        rawTableUnavailable(error) ? 'xcore_source_unavailable' : 'xcore_reference_check_failed',
      );
    }
    return {
      available: false,
      source: 'verified_case',
      referenceId: String(referenceId),
    };
  }
}

const caseDetailInclude = {
  patient: {
    select: {
      id: true,
      name: true,
      email: true,
      phone_number: true,
      patientProfile: {
        select: {
          dateOfBirth: true,
          gender: true,
          insuranceProvider: true,
          insuranceNumber: true,
          insuranceMemberId: true,
          medicalDetails: true,
          emergencyContact: true,
        },
      },
    },
  },
  originAppointment: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      reason: true,
      clinicBranchId: true,
      preSessionHealthForm: {
        select: {
          symptoms: true,
          painLevel: true,
          allergies: true,
          medications: true,
          notes: true,
          submittedAt: true,
        },
      },
    },
  },
  notes: {
    orderBy: { createdAt: 'asc' },
    include: {
      authorDentist: {
        select: { name: true },
      },
    },
  },
  timelineEvents: {
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
  },
};

function sendWorkspaceError(res, error) {
  const status = error?.status || 500;
  const code = error?.code || 'specialist_workspace_failed';
  if (status >= 500) {
    console.error('[SpecialistWorkspace] request failed', { status, code });
  }
  return res.status(status).json({
    error: {
      code,
      message: status >= 500 ? 'Specialist Workspace request failed.' : error.message,
      ...(error?.existingCaseId
        ? { existingCaseId: asId(error.existingCaseId) }
        : {}),
    },
  });
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendWorkspaceError(res, error);
    }
  };
}

export function createSpecialistWorkspaceRouter({ prismaClient = prisma } = {}) {
  const router = express.Router();

  router.use('/endo', createEndoCoreRouter({ prismaClient }));

  router.get(
    '/xcore/studies',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const authorization = await assertCanCreateSpecialistCase(
        req.user,
        { patientId: req.query.patientId },
        { prismaClient },
      );
      const activeClinicIds = await activeDentistClinicIds(
        authorization.dentistId,
        { prismaClient },
      );
      const sharedStudyWhere = activeClinicIds.length
        ? {
            AND: [
              {
                dentistShares: {
                  some: {
                    recipientDentistId: authorization.dentistId,
                    revokedAt: null,
                  },
                },
              },
              clinicStudyScopeWhereForClinicIds(activeClinicIds),
            ],
          }
        : null;
      const studies = await prismaClient.imagingStudy.findMany({
        where: {
          patientId: authorization.patientId,
          ...(sharedStudyWhere
            ? { OR: [{ dentistId: authorization.dentistId }, sharedStudyWhere] }
            : { dentistId: authorization.dentistId }),
        },
        select: {
          id: true,
          patientId: true,
          studyDate: true,
          description: true,
          modality: true,
          status: true,
          series: {
            select: {
              id: true,
              modality: true,
              description: true,
              bodyPart: true,
              numSlices: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [
          { studyDate: 'desc' },
          { createdAt: 'desc' },
        ],
      });
      res.json({ studies: studies.map((study) => serializeXcoreStudy(study)) });
    }),
  );

  router.post(
    '/cases',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const caseType = req.body?.caseType || 'radiology';
      if (!SPECIALIST_CASE_TYPES.includes(caseType)) {
        throw specialistWorkspaceError(400, 'unsupported_specialist_case_type');
      }

      const authorization = await assertCanCreateSpecialistCase(
        req.user,
        {
          patientId: req.body?.patientId,
          originAppointmentId: req.body?.originAppointmentId,
        },
        { prismaClient },
      );
      const title = textValue(req.body?.title, 'title', { required: true, maxLength: 240 });
      const summary = textValue(req.body?.summary, 'summary', { maxLength: 4_000 });
      const xcoreVerifiedCaseId = textValue(
        req.body?.xcoreVerifiedCaseId,
        'xcore_verified_case_id',
        { maxLength: 64 },
      );
      const rawXcoreStudyId = req.body?.xcoreStudyId;
      const xcoreStudyId = rawXcoreStudyId === undefined
        || rawXcoreStudyId === null
        || rawXcoreStudyId === ''
        ? null
        : specialistWorkspaceId(rawXcoreStudyId, 'xcore_study_id');
      if (xcoreStudyId && xcoreVerifiedCaseId) {
        throw specialistWorkspaceError(
          400,
          'multiple_xcore_references_not_allowed',
          'Select either an X-Core study or a verified case, not both.',
        );
      }
      if (xcoreStudyId) {
        const duplicateStudyCase = await prismaClient.specialistCase.findFirst({
          where: {
            xcoreStudyId,
            status: { not: 'archived' },
          },
        });
        if (duplicateStudyCase) {
          throw specialistWorkspaceError(
            409,
            'xcore_study_duplicate_case',
            'A Specialist Case has already been created for this X-Core study.',
          );
        }

        await loadXcoreStudyPreview(prismaClient, {
          studyId: xcoreStudyId,
          patientId: authorization.patientId,
          user: req.user,
          strict: true,
        });
      }
      if (xcoreVerifiedCaseId) {
        await loadXcorePreview(prismaClient, {
          referenceId: xcoreVerifiedCaseId,
          patientId: authorization.patientId,
          dentistId: authorization.dentistId,
          strict: true,
        });
      }

      const sourceAppointment = authorization.appointment || authorization.relationshipAppointment;
      const clinicProfileId =
        sourceAppointment.ownerClinicId || sourceAppointment.clinicBranch?.clinicProfileId || null;
      const created = await prismaClient.$transaction(async (tx) => {
        if (authorization.appointment) {
          await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(${authorization.appointment.id})
          `;
          const existingCase = await tx.specialistCase.findFirst({
            where: {
              dentistId: authorization.dentistId,
              patientId: authorization.patientId,
              caseType,
              originAppointmentId: authorization.appointment.id,
              status: { not: 'archived' },
            },
            orderBy: { createdAt: 'asc' },
          });
          if (existingCase) {
            const duplicateError = specialistWorkspaceError(
              409,
              'specialist_case_duplicate',
              'An active Specialist Case already exists for this appointment.',
            );
            duplicateError.existingCaseId = existingCase.id;
            throw duplicateError;
          }
        }
        const specialistCase = await tx.specialistCase.create({
          data: {
            patientId: authorization.patientId,
            dentistId: authorization.dentistId,
            clinicProfileId,
            clinicBranchId: sourceAppointment.clinicBranchId,
            originAppointmentId: authorization.appointment?.id || null,
            xcoreStudyId,
            xcoreVerifiedCaseId,
            caseType,
            status: 'draft',
            title,
            summary,
          },
        });
        await tx.specialistCaseTimelineEvent.create({
          data: {
            specialistCaseId: specialistCase.id,
            eventType: 'case_created',
            actorUserId: authorization.dentistId,
            actorRole: 'dentist',
            metadata: {
              hasOriginAppointment: Boolean(authorization.appointment),
              hasXcoreEvidence: Boolean(xcoreStudyId || xcoreVerifiedCaseId),
            },
          },
        });
        if (xcoreStudyId || xcoreVerifiedCaseId) {
          await tx.specialistCaseTimelineEvent.create({
            data: {
              specialistCaseId: specialistCase.id,
              eventType: 'xcore_result_linked',
              actorUserId: authorization.dentistId,
              actorRole: 'dentist',
              metadata: {
                source: xcoreStudyId ? 'study' : 'verified_case',
                referenceId: asId(xcoreStudyId) || xcoreVerifiedCaseId,
              },
            },
          });
        }
        return specialistCase;
      });

      res.status(201).json({ case: serializeCaseSummary(created) });
    }),
  );

  router.get(
    '/cases',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const dentistId = specialistWorkspaceId(req.user.id, 'user_id');
      const where = { dentistId };
      if (req.query.patientId) {
        where.patientId = specialistWorkspaceId(req.query.patientId, 'patient_id');
      }
      if (req.query.originAppointmentId) {
        where.originAppointmentId = specialistWorkspaceId(
          req.query.originAppointmentId,
          'origin_appointment_id',
        );
      }
      if (req.query.status) {
        if (!SPECIALIST_CASE_STATUSES.includes(req.query.status)) {
          throw specialistWorkspaceError(400, 'invalid_specialist_case_status');
        }
        where.status = req.query.status;
      }
      if (req.query.caseType) {
        if (!SPECIALIST_CASE_TYPES.includes(req.query.caseType)) {
          throw specialistWorkspaceError(400, 'unsupported_specialist_case_type');
        }
        where.caseType = req.query.caseType;
      }
      const cases = await prismaClient.specialistCase.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
          endoCaseDetail: {
            select: {
              toothNumber: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ cases: cases.map(serializeCaseSummary) });
    }),
  );

  router.get(
    '/cases/:caseId',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const caseId = specialistWorkspaceId(req.params.caseId, 'case_id');
      const specialistCase = await prismaClient.specialistCase.findUnique({
        where: { id: caseId },
        include: caseDetailInclude,
      });
      if (!specialistCase) {
        throw specialistWorkspaceError(404, 'specialist_case_not_found');
      }
      assertCanViewSpecialistCase(req.user, specialistCase);
      const xcore = specialistCase.xcoreStudyId
        ? await loadXcoreStudyPreview(prismaClient, {
            studyId: specialistCase.xcoreStudyId,
            patientId: specialistCase.patientId,
            user: req.user,
          })
        : await loadXcorePreview(prismaClient, {
            referenceId: specialistCase.xcoreVerifiedCaseId,
            patientId: specialistCase.patientId,
            dentistId: specialistCase.dentistId,
          });
      res.json({
        case: {
          ...serializeCaseSummary(specialistCase),
          patient: serializePatient(specialistCase.patient),
          appointment: serializeAppointment(specialistCase.originAppointment),
          xcore,
          notes: specialistCase.notes.map(serializeNote),
          timelineEvents: specialistCase.timelineEvents.map(serializeTimelineEvent),
        },
      });
    }),
  );

  router.post(
    '/cases/:caseId/notes',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const caseId = specialistWorkspaceId(req.params.caseId, 'case_id');
      const content = textValue(req.body?.content, 'content', {
        required: true,
        maxLength: 10_000,
      });
      const specialistCase = await prismaClient.specialistCase.findUnique({
        where: { id: caseId },
      });
      if (!specialistCase) {
        throw specialistWorkspaceError(404, 'specialist_case_not_found');
      }
      assertCanAddSpecialistCaseNote(req.user, specialistCase);
      const dentistId = specialistWorkspaceId(req.user.id, 'user_id');

      const note = await prismaClient.$transaction(async (tx) => {
        const createdNote = await tx.specialistCaseNote.create({
          data: {
            specialistCaseId: caseId,
            authorDentistId: dentistId,
            content,
          },
          include: {
            authorDentist: { select: { name: true } },
          },
        });
        await tx.specialistCaseTimelineEvent.create({
          data: {
            specialistCaseId: caseId,
            eventType: 'note_added',
            actorUserId: dentistId,
            actorRole: 'dentist',
            metadata: { noteId: createdNote.id.toString() },
          },
        });
        await tx.specialistCase.update({
          where: { id: caseId },
          data: { updatedAt: new Date() },
        });
        return createdNote;
      });
      res.status(201).json({ note: serializeNote(note) });
    }),
  );

  router.patch(
    '/cases/:caseId/status',
    authenticateToken,
    requireRoles(['dentist']),
    asyncRoute(async (req, res) => {
      const caseId = specialistWorkspaceId(req.params.caseId, 'case_id');
      const nextStatus = String(req.body?.status || '');
      if (!SPECIALIST_CASE_STATUSES.includes(nextStatus)) {
        throw specialistWorkspaceError(400, 'invalid_specialist_case_status');
      }
      const dentistId = specialistWorkspaceId(req.user.id, 'user_id');

      const updated = await prismaClient.$transaction(async (tx) => {
        const specialistCase = await tx.specialistCase.findUnique({
          where: { id: caseId },
          include: { endoCaseDetail: true },
        });
        if (!specialistCase) {
          throw specialistWorkspaceError(404, 'specialist_case_not_found');
        }
        assertCanEditSpecialistCase(req.user, specialistCase);
        if (!SPECIALIST_CASE_STATUS_TRANSITIONS[specialistCase.status]?.includes(nextStatus)) {
          throw specialistWorkspaceError(409, 'invalid_specialist_case_transition');
        }
        if (specialistCase.caseType === 'endodontic' && nextStatus === 'active') {
          const detail = specialistCase.endoCaseDetail;
          if (
            !detail
            || !ENDO_FDI_TEETH.includes(detail.toothNumber)
            || !String(detail.chiefComplaint || '').trim()
          ) {
            throw specialistWorkspaceError(400, 'endo_activation_requirements_missing');
          }
        }
        if (specialistCase.caseType === 'endodontic' && nextStatus === 'completed') {
          const detail = specialistCase.endoCaseDetail;
          if (
            !String(detail?.pulpDiagnosis || '').trim()
            || !String(detail?.periapicalDiagnosis || '').trim()
          ) {
            throw specialistWorkspaceError(400, 'endo_completion_diagnosis_required');
          }
        }
        const completionSummary = nextStatus === 'completed'
          ? textValue(req.body?.completionSummary, 'completion_summary', {
              required: true,
              maxLength: 4_000,
            })
          : null;
        const now = new Date();
        const changed = await tx.specialistCase.updateMany({
          where: {
            id: caseId,
            status: specialistCase.status,
          },
          data: {
            status: nextStatus,
            ...(nextStatus === 'completed'
              ? { completedAt: now, completionSummary }
              : {}),
            ...(nextStatus === 'archived' ? { archivedAt: now } : {}),
          },
        });
        if (changed.count !== 1) {
          throw specialistWorkspaceError(409, 'specialist_case_transition_conflict');
        }
        await tx.specialistCaseTimelineEvent.create({
          data: {
            specialistCaseId: caseId,
            eventType: 'status_changed',
            actorUserId: dentistId,
            actorRole: 'dentist',
            metadata: {
              fromStatus: specialistCase.status,
              toStatus: nextStatus,
            },
          },
        });
        if (nextStatus === 'archived') {
          await tx.specialistCaseTimelineEvent.create({
            data: {
              specialistCaseId: caseId,
              eventType: 'case_archived',
              actorUserId: dentistId,
              actorRole: 'dentist',
              metadata: { previousStatus: specialistCase.status },
            },
          });
        }
        return tx.specialistCase.findUnique({ where: { id: caseId } });
      });
      res.json({ case: serializeCaseSummary(updated) });
    }),
  );

  router.get(
    '/clinic/patients/:patientId/case-summary',
    authenticateToken,
    requireRoles(CLINIC_SUMMARY_ROLES),
    asyncRoute(async (req, res) => {
      const patientId = specialistWorkspaceId(req.params.patientId, 'patient_id');
      const staff = await resolveSpecialistCaseClinicSummaryScope(req.user, { prismaClient });
      const clinicCases = await prismaClient.specialistCase.findMany({
        where: {
          patientId,
          clinicProfileId: staff.clinicProfileId,
        },
        orderBy: { updatedAt: 'desc' },
      });
      const visibleCases = clinicCases.filter((caseRecord) => (
        staff.isClinicOwner
        || !staff.assignedBranchId
        || caseRecord.clinicBranchId === staff.assignedBranchId
      ));
      if (clinicCases.length && !visibleCases.length) {
        throw specialistWorkspaceError(403, 'specialist_case_branch_scope_denied');
      }
      res.json({
        cases: visibleCases.map((caseRecord) => ({
          id: asId(caseRecord.id),
          caseType: caseRecord.caseType,
          status: caseRecord.status,
          safeLabel: caseRecord.caseType === 'radiology'
            ? 'Radiology specialist case'
            : caseRecord.caseType === 'endodontic'
              ? 'Endodontic specialist case'
              : 'Specialist case',
          updatedAt: caseRecord.updatedAt,
          hasXcoreEvidence: Boolean(
            caseRecord.xcoreStudyId || caseRecord.xcoreVerifiedCaseId,
          ),
        })),
      });
    }),
  );

  router.get(
    '/admin/analytics',
    authenticateToken,
    requireRoles(['admin', 'super_admin']),
    asyncRoute(async (req, res) => {
      assertCanViewSpecialistCaseAggregate(req.user);
      const [totalCases, byStatus, byType, byClinic] = await Promise.all([
        prismaClient.specialistCase.count(),
        prismaClient.specialistCase.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prismaClient.specialistCase.groupBy({
          by: ['caseType'],
          _count: { _all: true },
        }),
        prismaClient.specialistCase.groupBy({
          by: ['clinicProfileId'],
          _count: { _all: true },
        }),
      ]);
      const statusCounts = Object.fromEntries(
        SPECIALIST_CASE_STATUSES.map((status) => [status, 0]),
      );
      for (const row of byStatus) statusCounts[row.status] = row._count._all;
      res.json({
        totalCases,
        casesByStatus: statusCounts,
        casesByType: Object.fromEntries(
          byType.map((row) => [row.caseType, row._count._all]),
        ),
        casesByClinic: byClinic.map((row) => ({
          clinicProfileId: asId(row.clinicProfileId),
          count: row._count._all,
        })),
        completedCount: statusCounts.completed,
        archivedCount: statusCounts.archived,
      });
    }),
  );

  return router;
}

export default createSpecialistWorkspaceRouter();
