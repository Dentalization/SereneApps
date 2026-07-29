import express from 'express';
import { authenticateToken, requireRoles } from '../utils/tokens.js';
import {
  assertCanCreateSpecialistCase,
  specialistWorkspaceError,
  specialistWorkspaceId,
} from '../services/specialistWorkspaceAuthorization.js';
import { requireXCoreStudyReadAccess, sameBigInt } from '../services/xCoreAccessPolicyService.js';
import {
  ENDO_DIAGNOSTIC_TEST_TYPES,
  ENDO_DIFFICULTY_FACTOR_GROUPS,
  ENDO_DIFFICULTY_LEVELS,
  ENDO_FDI_TEETH,
  ENDO_RADIOGRAPH_EVIDENCE_TYPES,
  ENDO_STAGE_STATUSES,
  ENDO_TREATMENT_STAGE_TYPES,
  parseOptionalDate,
  requireAllowed,
  requireEndoCase,
} from '../services/endoCorePolicy.js';
import { emitPortalInvalidation } from '../services/portalCollaboration.js';

const asId = (value) => value === null || value === undefined ? null : value.toString();
const emitEndoInvalidation = (req, record, action, { xcore = false } = {}) => {
  const common = {
    io: req.app?.get?.('io'),
    entity: 'specialist_case',
    entityId: record.id,
    action,
    status: record.status,
    patientId: record.patientId,
    dentistId: record.dentistId,
    clinicProfileId: record.clinicProfileId,
  };
  emitPortalInvalidation({ ...common, eventName: 'specialist:case_updated' });
  if (xcore) emitPortalInvalidation({ ...common, eventName: 'xcore:case_updated' });
};
const cleanText = (value, name, { required = false, max = 10_000 } = {}) => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (required && !text) throw specialistWorkspaceError(400, `${name}_required`, `${name} is required.`);
  if (text.length > max) throw specialistWorkspaceError(400, `${name}_too_long`, `${name} is too long.`);
  return text || null;
};
const booleanValue = (value, fallback = null) => typeof value === 'boolean' ? value : fallback;
const jsonStrings = (value, name) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw specialistWorkspaceError(400, `invalid_${name}`);
  }
  return value.map((item) => item.trim()).filter(Boolean).slice(0, 50);
};

function sendError(res, error) {
  const status = error?.status || 500;
  return res.status(status).json({
    error: {
      code: error?.code || 'endo_core_failed',
      message: status >= 500 ? 'Endo-Core request failed.' : error.message,
      ...(error?.existingCaseId ? { existingCaseId: asId(error.existingCaseId) } : {}),
    },
  });
}
const route = (handler) => async (req, res) => {
  try { await handler(req, res); } catch (error) {
    if (!error?.status) console.error('[EndoCore]', error);
    sendError(res, error);
  }
};

const caseInclude = {
  patient: {
    select: {
      id: true, name: true, email: true, phone_number: true,
      patientProfile: {
        select: {
          dateOfBirth: true, gender: true, medicalDetails: true,
          insuranceProvider: true, emergencyContact: true,
        },
      },
    },
  },
  originAppointment: {
    include: { preSessionHealthForm: true },
  },
  endoCaseDetail: {
    include: {
      diagnosticTests: { orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }] },
      treatmentStages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
      difficultyAssessment: true,
      radiographEvidence: { orderBy: [{ evidenceType: 'asc' }, { id: 'asc' }] },
    },
  },
  notes: {
    orderBy: { createdAt: 'asc' },
    include: { authorDentist: { select: { name: true } } },
  },
  timelineEvents: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] },
};

function baseSummary(record) {
  return {
    id: asId(record.id),
    patientId: asId(record.patientId),
    dentistId: asId(record.dentistId),
    originAppointmentId: asId(record.originAppointmentId),
    xcoreStudyId: asId(record.xcoreStudyId),
    caseType: record.caseType,
    status: record.status,
    title: record.title,
    summary: record.summary || null,
    completionSummary: record.completionSummary || null,
    completedAt: record.completedAt || null,
    archivedAt: record.archivedAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
function serializeEndo(detail) {
  if (!detail) return null;
  const {
    diagnosticTests = [],
    treatmentStages = [],
    difficultyAssessment: _difficultyAssessment,
    radiographEvidence: _radiographEvidence,
    ...base
  } = detail;
  return {
    ...base,
    id: asId(detail.id),
    specialistCaseId: asId(detail.specialistCaseId),
    diagnosticTests: diagnosticTests.map((test) => ({
      ...test, id: asId(test.id), endoCaseDetailId: asId(test.endoCaseDetailId),
    })),
    treatmentStages: treatmentStages.map((stage) => ({
      ...stage,
      id: asId(stage.id),
      endoCaseDetailId: asId(stage.endoCaseDetailId),
      appointmentId: asId(stage.appointmentId),
    })),
  };
}
function emptyDifficultyAssessment(endoCaseDetailId) {
  return {
    id: null,
    endoCaseDetailId: asId(endoCaseDetailId),
    patientConsiderations: [],
    diagnosticConsiderations: [],
    radiographicConsiderations: [],
    toothMorphologyFactors: [],
    canalMorphologyFactors: [],
    previousTreatmentFactors: [],
    perioEndoFactors: [],
    traumaResorptionFactors: [],
    dentistSelectedDifficulty: null,
    referralConsidered: false,
    referralReason: null,
    notes: null,
    createdAt: null,
    updatedAt: null,
  };
}
function serializeDifficultyAssessment(assessment, endoCaseDetailId) {
  if (!assessment) return emptyDifficultyAssessment(endoCaseDetailId);
  return {
    ...assessment,
    id: asId(assessment.id),
    endoCaseDetailId: asId(assessment.endoCaseDetailId),
    patientConsiderations: assessment.patientConsiderations || [],
    diagnosticConsiderations: assessment.diagnosticConsiderations || [],
    radiographicConsiderations: assessment.radiographicConsiderations || [],
    toothMorphologyFactors: assessment.toothMorphologyFactors || [],
    canalMorphologyFactors: assessment.canalMorphologyFactors || [],
    previousTreatmentFactors: assessment.previousTreatmentFactors || [],
    perioEndoFactors: assessment.perioEndoFactors || [],
    traumaResorptionFactors: assessment.traumaResorptionFactors || [],
  };
}
function validateDifficultyFactors(payload, field) {
  const value = payload?.[field] ?? [];
  const allowed = ENDO_DIFFICULTY_FACTOR_GROUPS[field];
  if (
    !Array.isArray(value)
    || value.some((factor) => typeof factor !== 'string' || !allowed.includes(factor))
  ) {
    throw specialistWorkspaceError(
      400,
      `invalid_${field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`,
      `Invalid ${field}.`,
    );
  }
  return [...new Set(value)];
}
function previewFromStudy(study) {
  return {
    referenceId: asId(study.id),
    modality: study.modality,
    description: study.description || null,
    status: study.status,
    studyDate: study.studyDate,
    openPath: `/dentist-portal/x-core?studyId=${study.id}`,
  };
}
async function serializeRadiographEvidenceSlots(db, record, evidenceRecords, user) {
  const recordsByType = new Map(
    (evidenceRecords || []).map((evidence) => [evidence.evidenceType, evidence]),
  );
  return Promise.all(ENDO_RADIOGRAPH_EVIDENCE_TYPES.map(async (evidenceType) => {
    const evidence = recordsByType.get(evidenceType);
    if (!evidence) return { evidenceType, linked: false };
    let xcore = { referenceId: asId(evidence.xcoreStudyId), available: false };
    try {
      const access = await requireXCoreStudyReadAccess({
        studyId: evidence.xcoreStudyId,
        user,
        prismaClient: db,
      });
      if (sameBigInt(access.study.patientId, record.patientId)) {
        xcore = { ...previewFromStudy(access.study), available: true };
      }
    } catch {
      // Keep the slot unlinkable without exposing study details after access is revoked.
    }
    return {
      evidenceType,
      linked: true,
      id: asId(evidence.id),
      xcoreStudyId: asId(evidence.xcoreStudyId),
      treatmentStageId: asId(evidence.treatmentStageId),
      notes: evidence.notes || null,
      linkedAt: evidence.linkedAt,
      xcore,
    };
  }));
}
function serializePatient(patient) {
  return {
    id: asId(patient.id),
    name: patient.name,
    email: patient.email,
    phone: patient.phone_number,
    dateOfBirth: patient.patientProfile?.dateOfBirth || null,
    gender: patient.patientProfile?.gender || null,
    medicalContext: patient.patientProfile?.medicalDetails || null,
    insuranceProvider: patient.patientProfile?.insuranceProvider || null,
    emergencyContact: patient.patientProfile?.emergencyContact || null,
  };
}
function serializeAppointment(appointment) {
  if (!appointment) return null;
  const healthForm = appointment.preSessionHealthForm
    ? {
        symptoms: appointment.preSessionHealthForm.symptoms || null,
        painLevel: appointment.preSessionHealthForm.painLevel,
        allergies: appointment.preSessionHealthForm.allergies || null,
        medications: appointment.preSessionHealthForm.medications || null,
        notes: appointment.preSessionHealthForm.notes || null,
        answers: appointment.preSessionHealthForm.answers || {},
        submittedAt: appointment.preSessionHealthForm.submittedAt,
        updatedAt: appointment.preSessionHealthForm.updatedAt,
      }
    : null;
  return {
    id: asId(appointment.id),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    reason: appointment.reason || null,
    healthForm,
  };
}
// NOTE: endo cases link directly to 'imagingStudy' via xcoreStudyId to leverage raw DICOM/3D imagery.
// This differs from radiology cases which link to 'verified_cases' via xcoreVerifiedCaseId (a workflow-specific verified results table).
async function xcorePreview(db, record, user) {
  if (!record.xcoreStudyId) return null;
  try {
    await requireXCoreStudyReadAccess({ studyId: record.xcoreStudyId, user, prismaClient: db });
    const study = await db.imagingStudy.findUnique({
      where: { id: record.xcoreStudyId },
      select: { id: true, patientId: true, modality: true, description: true, status: true, studyDate: true },
    });
    if (!study || !sameBigInt(study.patientId, record.patientId)) return { available: false, referenceId: asId(record.xcoreStudyId) };
    return {
      available: true,
      source: 'study',
      referenceId: asId(study.id),
      modality: study.modality,
      description: study.description,
      status: study.status,
      studyDate: study.studyDate,
      openPath: `/dentist-portal/x-core?studyId=${study.id}`,
    };
  } catch {
    return { available: false, source: 'study', referenceId: asId(record.xcoreStudyId) };
  }
}
async function timeline(tx, specialistCaseId, userId, eventType, metadata = {}) {
  await tx.specialistCaseTimelineEvent.create({
    data: { specialistCaseId, eventType, actorUserId: userId, actorRole: 'dentist', metadata },
  });
}
async function validateAppointment(db, appointmentId, record) {
  if (!appointmentId) return null;
  const id = specialistWorkspaceId(appointmentId, 'appointment_id');
  const appointment = await db.appointment.findFirst({
    where: { id, dentistId: record.dentistId, patientId: record.patientId },
    select: { id: true },
  });
  if (!appointment) throw specialistWorkspaceError(403, 'endo_appointment_scope_denied');
  return id;
}
async function lockEditableEndoCase(tx, record) {
  const rows = await tx.$queryRaw`
    SELECT status
    FROM specialist_cases
    WHERE id = ${record.id}
    FOR UPDATE
  `;
  if (!rows[0] || !['draft', 'active'].includes(rows[0].status)) {
    throw specialistWorkspaceError(409, 'endo_case_not_editable');
  }
}

export function createEndoCoreRouter({ prismaClient }) {
  const router = express.Router();
  router.use(authenticateToken, requireRoles(['dentist']));

  router.post('/cases', route(async (req, res) => {
    const toothNumber = requireAllowed(
      String(req.body?.toothNumber || ''),
      ENDO_FDI_TEETH,
      'invalid_endo_tooth_number',
      'toothNumber must be a supported FDI permanent tooth.',
    );
    const chiefComplaint = cleanText(req.body?.chiefComplaint, 'chief_complaint', { required: true, max: 4_000 });
    const title = cleanText(req.body?.title, 'title', { required: true, max: 240 });
    const authorization = await assertCanCreateSpecialistCase(
      req.user,
      { patientId: req.body?.patientId, originAppointmentId: req.body?.originAppointmentId },
      { prismaClient },
    );
    const xcoreStudyId = req.body?.xcoreStudyId
      ? specialistWorkspaceId(req.body.xcoreStudyId, 'xcore_study_id')
      : null;
    if (xcoreStudyId) {
      const access = await requireXCoreStudyReadAccess({ studyId: xcoreStudyId, user: req.user, prismaClient });
      if (!sameBigInt(access.study.patientId, authorization.patientId)) {
        throw specialistWorkspaceError(403, 'xcore_study_patient_mismatch');
      }
    }
    const sourceAppointment = authorization.appointment || authorization.relationshipAppointment;
    const clinicProfileId = sourceAppointment.ownerClinicId || sourceAppointment.clinicBranch?.clinicProfileId || null;
    const created = await prismaClient.$transaction(async (tx) => {
      const lockKeys = [
        `endo:tooth:${authorization.dentistId}:${authorization.patientId}:${toothNumber}`,
        ...(xcoreStudyId
          ? [`endo:xcore:${authorization.dentistId}:${authorization.patientId}:${xcoreStudyId}`]
          : []),
      ].sort();
      for (const lockKey of lockKeys) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      }
      const duplicate = await tx.specialistCase.findFirst({
        where: {
          dentistId: authorization.dentistId,
          patientId: authorization.patientId,
          caseType: 'endodontic',
          status: { not: 'archived' },
          OR: [
            { endoCaseDetail: { is: { toothNumber } } },
            ...(xcoreStudyId ? [{ xcoreStudyId }] : []),
          ],
        },
        select: {
          id: true,
          xcoreStudyId: true,
          endoCaseDetail: {
            select: { toothNumber: true }
          }
        },
      });
      if (duplicate) {
        const isToothMatch = duplicate.endoCaseDetail?.toothNumber === toothNumber;
        const isStudyMatch = xcoreStudyId && sameBigInt(duplicate.xcoreStudyId, xcoreStudyId);
        
        let code = 'endo_tooth_duplicate_case';
        let msg = 'An active Endo-Core case already exists for this tooth.';
        if (isToothMatch) {
          code = 'endo_tooth_duplicate_case';
          msg = 'An active Endo-Core case already exists for this tooth.';
        } else if (isStudyMatch) {
          code = 'endo_xcore_duplicate_case';
          msg = 'An active Endo-Core case already exists for this X-Core study.';
        }
        
        const error = specialistWorkspaceError(409, code, msg);
        error.existingCaseId = duplicate.id;
        throw error;
      }
      const specialistCase = await tx.specialistCase.create({
        data: {
          patientId: authorization.patientId,
          dentistId: authorization.dentistId,
          clinicProfileId,
          clinicBranchId: sourceAppointment.clinicBranchId,
          originAppointmentId: authorization.appointment?.id || null,
          xcoreStudyId,
          caseType: 'endodontic',
          status: 'draft',
          title,
          summary: cleanText(req.body?.summary, 'summary', { max: 4_000 }),
          endoCaseDetail: {
            create: {
              toothNumber,
              odontogramPosition: cleanText(req.body?.odontogramPosition, 'odontogram_position', { max: 16 }),
              odontogramCodeAtCreation: cleanText(req.body?.odontogramCodeAtCreation, 'odontogram_code_at_creation', { max: 32 }),
              chiefComplaint,
              swelling: booleanValue(req.body?.swelling, false),
              sinusTract: booleanValue(req.body?.sinusTract, false),
              previousEndoTreatment: booleanValue(req.body?.previousEndoTreatment, false),
              retreatmentReason: cleanText(req.body?.retreatmentReason, 'retreatment_reason', { max: 2_000 }),
            },
          },
        },
        include: { endoCaseDetail: true },
      });
      await timeline(tx, specialistCase.id, authorization.dentistId, 'case_created', { caseType: 'endodontic' });
      await timeline(tx, specialistCase.id, authorization.dentistId, 'endo_detail_created', { toothNumber });
      if (xcoreStudyId) await timeline(tx, specialistCase.id, authorization.dentistId, 'xcore_result_linked', { source: 'study', referenceId: asId(xcoreStudyId) });
      return specialistCase;
    });
    emitEndoInvalidation(req, created, 'created', { xcore: Boolean(created.xcoreStudyId) });
    res.status(201).json({ case: { ...baseSummary(created), endo: serializeEndo(created.endoCaseDetail) } });
  }));

  router.get('/cases', route(async (req, res) => {
    const dentistId = specialistWorkspaceId(req.user.id, 'user_id');
    const records = await prismaClient.specialistCase.findMany({
      where: {
        dentistId,
        caseType: 'endodontic',
        ...(req.query.patientId ? { patientId: specialistWorkspaceId(req.query.patientId, 'patient_id') } : {}),
        ...(req.query.status ? { status: String(req.query.status) } : {}),
      },
      include: {
        patient: { select: { id: true, name: true } },
        endoCaseDetail: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ cases: records.map((record) => ({
      ...baseSummary(record),
      patient: { id: asId(record.patient.id), name: record.patient.name },
      endo: serializeEndo(record.endoCaseDetail),
      hasXcoreEvidence: Boolean(record.xcoreStudyId || record.xcoreVerifiedCaseId),
    })) });
  }));

  router.get('/cases/:caseId', route(async (req, res) => {
    const specialistCase = await requireEndoCase(prismaClient, req.user, req.params.caseId);
    const record = await prismaClient.specialistCase.findUnique({
      where: { id: specialistCase.id },
      include: caseInclude,
    });
    const difficultyAssessment = serializeDifficultyAssessment(
      record.endoCaseDetail.difficultyAssessment,
      record.endoCaseDetail.id,
    );
    const radiographEvidenceSlots = await serializeRadiographEvidenceSlots(
      prismaClient,
      record,
      record.endoCaseDetail.radiographEvidence,
      req.user,
    );
    res.json({ case: {
      ...baseSummary(record),
      patient: serializePatient(record.patient),
      appointment: serializeAppointment(record.originAppointment),
      endo: serializeEndo(record.endoCaseDetail),
      difficultyAssessment,
      radiographEvidenceSlots,
      xcore: await xcorePreview(prismaClient, record, req.user),
      notes: record.notes.map((note) => ({
        id: asId(note.id), content: note.content, authorName: note.authorDentist?.name || null,
        createdAt: note.createdAt, updatedAt: note.updatedAt,
      })),
      timelineEvents: record.timelineEvents.map((event) => ({
        id: asId(event.id), eventType: event.eventType, metadata: event.metadata || {}, createdAt: event.createdAt,
      })),
    } });
  }));

  router.get('/cases/:caseId/difficulty-assessment', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId);
    const assessment = await prismaClient.endoDifficultyAssessment.findUnique({
      where: { endoCaseDetailId: record.endoCaseDetail.id },
    });
    res.json({
      difficultyAssessment: serializeDifficultyAssessment(
        assessment,
        record.endoCaseDetail.id,
      ),
    });
  }));

  router.put('/cases/:caseId/difficulty-assessment', route(async (req, res) => {
    const record = await requireEndoCase(
      prismaClient,
      req.user,
      req.params.caseId,
      { editable: true },
    );
    const dentistSelectedDifficulty = (
      req.body?.dentistSelectedDifficulty === undefined
      || req.body?.dentistSelectedDifficulty === null
      || req.body?.dentistSelectedDifficulty === ''
    )
      ? null
      : requireAllowed(
          req.body.dentistSelectedDifficulty,
          ENDO_DIFFICULTY_LEVELS,
          'invalid_endo_difficulty_level',
        );
    if (
      req.body?.referralConsidered !== undefined
      && typeof req.body.referralConsidered !== 'boolean'
    ) {
      throw specialistWorkspaceError(400, 'invalid_referral_considered');
    }
    const data = {};
    for (const field of Object.keys(ENDO_DIFFICULTY_FACTOR_GROUPS)) {
      data[field] = validateDifficultyFactors(req.body, field);
    }
    Object.assign(data, {
      dentistSelectedDifficulty,
      referralConsidered: req.body?.referralConsidered === true,
      referralReason: req.body?.referralConsidered === true
        ? cleanText(req.body?.referralReason, 'referral_reason', { max: 4_000 })
        : null,
      notes: cleanText(req.body?.notes, 'notes', { max: 10_000 }),
    });
    const assessment = await prismaClient.$transaction(async (tx) => {
      await lockEditableEndoCase(tx, record);
      const saved = await tx.endoDifficultyAssessment.upsert({
        where: { endoCaseDetailId: record.endoCaseDetail.id },
        create: { endoCaseDetailId: record.endoCaseDetail.id, ...data },
        update: data,
      });
      await tx.endoCaseDetail.update({
        where: { id: record.endoCaseDetail.id },
        data: { difficultyLevel: dentistSelectedDifficulty },
      });
      await tx.specialistCase.update({
        where: { id: record.id },
        data: { updatedAt: new Date() },
      });
      await timeline(
        tx,
        record.id,
        record.dentistId,
        'endo_difficulty_assessment_updated',
        { dentistSelectedDifficulty, referralConsidered: data.referralConsidered },
      );
      return saved;
    });
    emitEndoInvalidation(req, record, 'difficulty_assessment_updated');
    res.json({
      difficultyAssessment: serializeDifficultyAssessment(
        assessment,
        record.endoCaseDetail.id,
      ),
    });
  }));

  router.get('/cases/:caseId/radiograph-evidence', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId);
    const evidence = await prismaClient.endoRadiographEvidence.findMany({
      where: { endoCaseDetailId: record.endoCaseDetail.id },
      orderBy: [{ evidenceType: 'asc' }, { id: 'asc' }],
    });
    res.json({
      slots: await serializeRadiographEvidenceSlots(
        prismaClient,
        record,
        evidence,
        req.user,
      ),
    });
  }));

  router.put(
    '/cases/:caseId/radiograph-evidence/:evidenceType',
    route(async (req, res) => {
      const record = await requireEndoCase(
        prismaClient,
        req.user,
        req.params.caseId,
        { editable: true },
      );
      const evidenceType = requireAllowed(
        req.params.evidenceType,
        ENDO_RADIOGRAPH_EVIDENCE_TYPES,
        'invalid_endo_radiograph_evidence_type',
      );
      const xcoreStudyId = specialistWorkspaceId(
        req.body?.xcoreStudyId,
        'xcore_study_id',
      );
      const access = await requireXCoreStudyReadAccess({
        studyId: xcoreStudyId,
        user: req.user,
        prismaClient,
      });
      if (!sameBigInt(access.study.patientId, record.patientId)) {
        throw specialistWorkspaceError(
          403,
          'xcore_study_patient_mismatch',
          'The selected X-Core study does not belong to this patient.',
        );
      }
      let treatmentStageId = null;
      if (req.body?.treatmentStageId) {
        treatmentStageId = specialistWorkspaceId(
          req.body.treatmentStageId,
          'treatment_stage_id',
        );
        const stage = await prismaClient.endoTreatmentStage.findFirst({
          where: {
            id: treatmentStageId,
            endoCaseDetailId: record.endoCaseDetail.id,
          },
          select: { id: true },
        });
        if (!stage) {
          throw specialistWorkspaceError(
            403,
            'endo_treatment_stage_scope_denied',
            'The selected treatment stage does not belong to this Endo case.',
          );
        }
      }
      const notes = cleanText(req.body?.notes, 'notes', { max: 10_000 });
      const evidence = await prismaClient.$transaction(async (tx) => {
        await lockEditableEndoCase(tx, record);
        const saved = await tx.endoRadiographEvidence.upsert({
          where: {
            endoCaseDetailId_evidenceType: {
              endoCaseDetailId: record.endoCaseDetail.id,
              evidenceType,
            },
          },
          create: {
            endoCaseDetailId: record.endoCaseDetail.id,
            evidenceType,
            xcoreStudyId,
            treatmentStageId,
            notes,
          },
          update: {
            xcoreStudyId,
            treatmentStageId,
            notes,
            linkedAt: new Date(),
          },
        });
        await tx.specialistCase.update({
          where: { id: record.id },
          data: { updatedAt: new Date() },
        });
        await timeline(
          tx,
          record.id,
          record.dentistId,
          'endo_radiograph_evidence_linked',
          {
            evidenceType,
            xcoreStudyId: asId(xcoreStudyId),
            ...(treatmentStageId
              ? { treatmentStageId: asId(treatmentStageId) }
              : {}),
          },
        );
        return saved;
      });
      const [slot] = await serializeRadiographEvidenceSlots(
        prismaClient,
        record,
        [evidence],
        req.user,
      ).then((slots) => slots.filter((item) => item.evidenceType === evidenceType));
      emitEndoInvalidation(req, record, 'radiograph_evidence_linked', { xcore: true });
      res.json({ slot });
    }),
  );

  router.delete(
    '/cases/:caseId/radiograph-evidence/:evidenceType',
    route(async (req, res) => {
      const record = await requireEndoCase(
        prismaClient,
        req.user,
        req.params.caseId,
        { editable: true },
      );
      const evidenceType = requireAllowed(
        req.params.evidenceType,
        ENDO_RADIOGRAPH_EVIDENCE_TYPES,
        'invalid_endo_radiograph_evidence_type',
      );
      const unlinked = await prismaClient.$transaction(async (tx) => {
        await lockEditableEndoCase(tx, record);
        const removed = await tx.endoRadiographEvidence.deleteMany({
          where: {
            endoCaseDetailId: record.endoCaseDetail.id,
            evidenceType,
          },
        });
        if (removed.count > 0) {
          await tx.specialistCase.update({
            where: { id: record.id },
            data: { updatedAt: new Date() },
          });
          await timeline(
            tx,
            record.id,
            record.dentistId,
            'endo_radiograph_evidence_unlinked',
            { evidenceType },
          );
        }
        return removed.count > 0;
      });
      if (unlinked) emitEndoInvalidation(req, record, 'radiograph_evidence_unlinked', { xcore: true });
      res.json({ unlinked });
    }),
  );

  router.patch('/cases/:caseId', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId, { editable: true });
    const allowedText = ['chiefComplaint', 'pulpDiagnosis', 'periapicalDiagnosis', 'retreatmentReason', 'restorabilityStatus', 'finalRestorationStatus', 'traumaHistory', 'periodontalConcern', 'cbctReason'];
    const allowedBoolean = ['swelling', 'sinusTract', 'spontaneousPain', 'lingeringPain', 'thermalSensitivity', 'bitingPain', 'previousEndoTreatment', 'cbctConsidered'];
    const data = {};
    for (const field of allowedText) if (req.body?.[field] !== undefined) data[field] = cleanText(req.body[field], field, { required: field === 'chiefComplaint', max: 4_000 });
    for (const field of allowedBoolean) if (typeof req.body?.[field] === 'boolean') data[field] = req.body[field];
    if (req.body?.difficultyLevel !== undefined) data.difficultyLevel = req.body.difficultyLevel === null || req.body.difficultyLevel === '' ? null : requireAllowed(req.body.difficultyLevel, ENDO_DIFFICULTY_LEVELS, 'invalid_endo_difficulty_level');
    if (req.body?.difficultyFactors !== undefined) data.difficultyFactors = jsonStrings(req.body.difficultyFactors, 'difficulty_factors');

    const xcoreStudyId = req.body?.xcoreStudyId !== undefined
      ? (req.body.xcoreStudyId ? specialistWorkspaceId(req.body.xcoreStudyId, 'xcore_study_id') : null)
      : undefined;

    if (xcoreStudyId) {
      const access = await requireXCoreStudyReadAccess({ studyId: xcoreStudyId, user: req.user, prismaClient });
      if (!sameBigInt(access.study.patientId, record.patientId)) {
        throw specialistWorkspaceError(
          403,
          'xcore_study_patient_mismatch',
          'The selected X-Core study does not belong to this patient.',
        );
      }
    }

    const updated = await prismaClient.$transaction(async (tx) => {
      const detail = await tx.endoCaseDetail.update({ where: { specialistCaseId: record.id }, data });
      if (Object.keys(data).length > 0) {
        await timeline(tx, record.id, record.dentistId, 'endo_detail_updated', { fields: Object.keys(data) });
      }
      
      const updateData = { updatedAt: new Date() };
      if (xcoreStudyId !== undefined) {
        updateData.xcoreStudyId = xcoreStudyId;
      }
      await tx.specialistCase.update({ where: { id: record.id }, data: updateData });

      if (xcoreStudyId !== undefined && xcoreStudyId !== record.xcoreStudyId) {
        if (xcoreStudyId) {
          await timeline(tx, record.id, record.dentistId, 'xcore_result_linked', { source: 'study', referenceId: asId(xcoreStudyId) });
        } else {
          await timeline(tx, record.id, record.dentistId, 'xcore_result_unlinked', { source: 'study' });
        }
      }

      return detail;
    });
    emitEndoInvalidation(req, { ...record, xcoreStudyId }, 'details_updated', {
      xcore: xcoreStudyId !== undefined,
    });
    res.json({ endo: serializeEndo(updated) });
  }));

  router.post('/cases/:caseId/diagnostic-tests', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId, { editable: true });
    const testType = requireAllowed(req.body?.testType, ENDO_DIAGNOSTIC_TEST_TYPES, 'unsupported_endo_diagnostic_test');
    const test = await prismaClient.$transaction(async (tx) => {
      const created = await tx.endoDiagnosticTest.create({ data: {
        endoCaseDetailId: record.endoCaseDetail.id,
        testType,
        result: cleanText(req.body?.result, 'result', { max: 128 }),
        notes: cleanText(req.body?.notes, 'notes'),
        performedAt: parseOptionalDate(req.body?.performedAt, 'performed_at'),
      } });
      await tx.specialistCase.update({ where: { id: record.id }, data: { updatedAt: new Date() } });
      await timeline(tx, record.id, record.dentistId, 'endo_diagnostic_test_added', { testId: asId(created.id), testType });
      return created;
    });
    emitEndoInvalidation(req, record, 'diagnostic_test_added');
    res.status(201).json({ test: serializeEndo({ diagnosticTests: [test], treatmentStages: [] }).diagnosticTests[0] });
  }));

  router.patch('/cases/:caseId/diagnostic-tests/:testId', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId, { editable: true });
    const testId = specialistWorkspaceId(req.params.testId, 'test_id');
    const existing = await prismaClient.endoDiagnosticTest.findFirst({ where: { id: testId, endoCaseDetailId: record.endoCaseDetail.id } });
    if (!existing) throw specialistWorkspaceError(404, 'endo_diagnostic_test_not_found');
    const data = {};
    if (req.body?.testType !== undefined) data.testType = requireAllowed(req.body.testType, ENDO_DIAGNOSTIC_TEST_TYPES, 'unsupported_endo_diagnostic_test');
    if (req.body?.result !== undefined) data.result = cleanText(req.body.result, 'result', { max: 128 });
    if (req.body?.notes !== undefined) data.notes = cleanText(req.body.notes, 'notes');
    if (req.body?.performedAt !== undefined) data.performedAt = parseOptionalDate(req.body.performedAt, 'performed_at');
    const updated = await prismaClient.$transaction(async (tx) => {
      const changed = await tx.endoDiagnosticTest.update({ where: { id: testId }, data });
      await tx.specialistCase.update({ where: { id: record.id }, data: { updatedAt: new Date() } });
      await timeline(tx, record.id, record.dentistId, 'endo_diagnostic_test_updated', { testId: asId(testId) });
      return changed;
    });
    emitEndoInvalidation(req, record, 'diagnostic_test_updated');
    res.json({ test: { ...updated, id: asId(updated.id), endoCaseDetailId: asId(updated.endoCaseDetailId) } });
  }));

  router.post('/cases/:caseId/treatment-stages', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId, { editable: true });
    const stageType = requireAllowed(req.body?.stageType, ENDO_TREATMENT_STAGE_TYPES, 'unsupported_endo_treatment_stage');
    const status = requireAllowed(req.body?.status || 'planned', ENDO_STAGE_STATUSES, 'unsupported_endo_stage_status');
    const appointmentId = await validateAppointment(prismaClient, req.body?.appointmentId, record);
    const stage = await prismaClient.$transaction(async (tx) => {
      const created = await tx.endoTreatmentStage.create({ data: {
        endoCaseDetailId: record.endoCaseDetail.id, stageType, status, appointmentId,
        notes: cleanText(req.body?.notes, 'notes'),
        performedAt: parseOptionalDate(req.body?.performedAt, 'performed_at'),
      } });
      await tx.specialistCase.update({ where: { id: record.id }, data: { updatedAt: new Date() } });
      await timeline(tx, record.id, record.dentistId, 'endo_treatment_stage_added', { stageId: asId(created.id), stageType });
      return created;
    });
    emitEndoInvalidation(req, record, 'treatment_stage_added');
    res.status(201).json({ stage: { ...stage, id: asId(stage.id), endoCaseDetailId: asId(stage.endoCaseDetailId), appointmentId: asId(stage.appointmentId) } });
  }));

  router.patch('/cases/:caseId/treatment-stages/:stageId', route(async (req, res) => {
    const record = await requireEndoCase(prismaClient, req.user, req.params.caseId, { editable: true });
    const stageId = specialistWorkspaceId(req.params.stageId, 'stage_id');
    const existing = await prismaClient.endoTreatmentStage.findFirst({ where: { id: stageId, endoCaseDetailId: record.endoCaseDetail.id } });
    if (!existing) throw specialistWorkspaceError(404, 'endo_treatment_stage_not_found');
    const data = {};
    if (req.body?.stageType !== undefined) data.stageType = requireAllowed(req.body.stageType, ENDO_TREATMENT_STAGE_TYPES, 'unsupported_endo_treatment_stage');
    if (req.body?.status !== undefined) data.status = requireAllowed(req.body.status, ENDO_STAGE_STATUSES, 'unsupported_endo_stage_status');
    if (req.body?.notes !== undefined) data.notes = cleanText(req.body.notes, 'notes');
    if (req.body?.performedAt !== undefined) data.performedAt = parseOptionalDate(req.body.performedAt, 'performed_at');
    if (req.body?.appointmentId !== undefined) data.appointmentId = await validateAppointment(prismaClient, req.body.appointmentId, record);
    const updated = await prismaClient.$transaction(async (tx) => {
      const changed = await tx.endoTreatmentStage.update({ where: { id: stageId }, data });
      await tx.specialistCase.update({ where: { id: record.id }, data: { updatedAt: new Date() } });
      await timeline(tx, record.id, record.dentistId, 'endo_treatment_stage_updated', { stageId: asId(stageId) });
      return changed;
    });
    emitEndoInvalidation(req, record, 'treatment_stage_updated');
    res.json({ stage: { ...updated, id: asId(updated.id), endoCaseDetailId: asId(updated.endoCaseDetailId), appointmentId: asId(updated.appointmentId) } });
  }));

  return router;
}

export default createEndoCoreRouter;
