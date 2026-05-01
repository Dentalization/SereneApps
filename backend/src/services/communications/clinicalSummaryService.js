import { PrismaClient } from '@prisma/client';
import {
  communicationActorRoleForAppointment,
  recordCommunicationEvent
} from '../communications.js';

const prisma = new PrismaClient();

const READ_ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'technical_support',
  'customer_success',
  'customer_success_manager',
  'compliance_officer'
]);

const FINALIZE_REQUIRED_FIELDS = ['chiefComplaint', 'objectiveFindings', 'assessment', 'plan'];

function toBigInt(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

function isAdminReader(user) {
  return (user?.roles || []).some((role) => READ_ADMIN_ROLES.has(role));
}

function isAssignedDentist(user, appointment) {
  return BigInt(user.id) === appointment.dentistId;
}

function isAssignedPatient(user, appointment) {
  return BigInt(user.id) === appointment.patientId;
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeJsonArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [];
}

function normalizeSummaryInput(input = {}) {
  return {
    chiefComplaint: normalizeText(input.chiefComplaint),
    subjectiveNotes: normalizeText(input.subjectiveNotes),
    objectiveFindings: normalizeText(input.objectiveFindings),
    assessment: normalizeText(input.assessment),
    plan: normalizeText(input.plan),
    diagnosisCodes: normalizeJsonArray(input.diagnosisCodes),
    recommendations: normalizeJsonArray(input.recommendations),
    followUpNeeded: Boolean(input.followUpNeeded),
    followUpAt: input.followUpAt ? new Date(input.followUpAt) : null
  };
}

export function validateClinicalSummaryForFinalize(input = {}) {
  const normalized = normalizeSummaryInput(input);
  const missing = FINALIZE_REQUIRED_FIELDS.filter((field) => !normalized[field]);
  return {
    valid: missing.length === 0,
    missing,
    normalized
  };
}

function serializeSummary(summary, { includeDraft = false } = {}) {
  if (!summary) {
    return { status: 'pending', summary: null };
  }
  if (!includeDraft && summary.status !== 'finalized' && summary.status !== 'amended') {
    return { status: 'pending', summary: null };
  }
  return {
    status: summary.status,
    summary: {
      id: summary.id,
      appointmentId: summary.appointmentId.toString(),
      dentistId: summary.dentistId.toString(),
      patientId: summary.patientId.toString(),
      status: summary.status,
      chiefComplaint: summary.chiefComplaint,
      subjectiveNotes: summary.subjectiveNotes,
      objectiveFindings: summary.objectiveFindings,
      assessment: summary.assessment,
      plan: summary.plan,
      diagnosisCodes: summary.diagnosisCodes || [],
      recommendations: summary.recommendations || [],
      followUpNeeded: summary.followUpNeeded,
      followUpAt: summary.followUpAt,
      patientAcknowledgedAt: summary.patientAcknowledgedAt,
      patientAcknowledgedById: summary.patientAcknowledgedById?.toString?.() ?? null,
      followUpTasks: (summary.followUpTasks || []).map((task) => ({
        id: task.id,
        status: task.status,
        title: task.title,
        dueAt: task.dueAt,
        completedAt: task.completedAt
      })),
      finalizedAt: summary.finalizedAt,
      amendedAt: summary.amendedAt,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt
    }
  };
}

async function getAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: toBigInt(appointmentId, 'appointmentId') },
    include: {
      clinicalSummary: {
        include: {
          followUpTasks: {
            orderBy: { createdAt: 'desc' }
          }
        }
      },
      communicationParticipants: {
        select: { id: true, userId: true, role: true, status: true }
      }
    }
  });
  if (!appointment) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  return appointment;
}

async function syncFollowUpTaskForSummary({ appointment, summary }) {
  if (!summary.followUpNeeded) {
    await prisma.appointmentFollowUpTask.updateMany({
      where: {
        appointmentId: appointment.id,
        summaryId: summary.id,
        status: 'open'
      },
      data: {
        status: 'cancelled',
        metadata: {
          cancelledBy: 'summary_finalized_without_follow_up',
          cancelledAt: new Date().toISOString()
        }
      }
    }).catch(() => null);
    return null;
  }

  const existing = await prisma.appointmentFollowUpTask.findFirst({
    where: {
      appointmentId: appointment.id,
      summaryId: summary.id,
      status: { in: ['open', 'scheduled'] }
    },
    orderBy: { createdAt: 'desc' }
  });

  const data = {
    appointmentId: appointment.id,
    summaryId: summary.id,
    dentistId: appointment.dentistId,
    patientId: appointment.patientId,
    title: 'Follow-up teledentistry consultation',
    notes: 'Created from finalized post-call summary.',
    dueAt: summary.followUpAt,
    metadata: {
      source: 'clinical_summary',
      summaryId: summary.id
    }
  };

  const task = existing
    ? await prisma.appointmentFollowUpTask.update({
        where: { id: existing.id },
        data: {
          dueAt: summary.followUpAt,
          status: existing.status,
          metadata: {
            ...(existing.metadata || {}),
            syncedFromSummaryAt: new Date().toISOString()
          }
        }
      })
    : await prisma.appointmentFollowUpTask.create({ data });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: appointment.dentistId,
    actorRole: 'dentist',
    eventType: 'follow_up_task_created',
    metadata: {
      summaryId: summary.id,
      taskId: task.id,
      dueAt: task.dueAt
    }
  });

  return task;
}

export async function getClinicalSummary({ appointmentId, user }) {
  const appointment = await getAppointment(appointmentId);
  const isDentist = isAssignedDentist(user, appointment);
  const isPatient = isAssignedPatient(user, appointment);
  const canRead = isDentist || isPatient || isAdminReader(user);
  if (!canRead) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return serializeSummary(appointment.clinicalSummary, {
    includeDraft: isDentist || isAdminReader(user)
  });
}

export async function saveClinicalSummaryDraft({ appointmentId, user, input }) {
  const appointment = await getAppointment(appointmentId);
  if (!isAssignedDentist(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (appointment.clinicalSummary?.status === 'finalized') {
    const error = new Error('SUMMARY_FINALIZED');
    error.status = 409;
    throw error;
  }

  const normalized = normalizeSummaryInput(input);
  const summary = await prisma.appointmentClinicalSummary.upsert({
    where: { appointmentId: appointment.id },
    update: {
      ...normalized,
      status: appointment.clinicalSummary?.status === 'amended' ? 'amended' : 'draft'
    },
    create: {
      appointmentId: appointment.id,
      dentistId: appointment.dentistId,
      patientId: appointment.patientId,
      status: 'draft',
      ...normalized
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: 'post_call_summary_drafted',
    metadata: {
      summaryId: summary.id,
      status: summary.status,
      hasFollowUp: summary.followUpNeeded
    }
  });

  return serializeSummary(summary, { includeDraft: true });
}

export async function finalizeClinicalSummary({ appointmentId, user, input }) {
  const appointment = await getAppointment(appointmentId);
  if (!isAssignedDentist(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (appointment.clinicalSummary?.status === 'finalized') {
    const error = new Error('SUMMARY_FINALIZED');
    error.status = 409;
    throw error;
  }

  const validation = validateClinicalSummaryForFinalize({
    ...(appointment.clinicalSummary || {}),
    ...(input || {})
  });
  if (!validation.valid) {
    const error = new Error('SUMMARY_VALIDATION_FAILED');
    error.status = 400;
    error.details = { missing: validation.missing };
    throw error;
  }

  const summary = await prisma.appointmentClinicalSummary.upsert({
    where: { appointmentId: appointment.id },
    update: {
      ...validation.normalized,
      status: 'finalized',
      finalizedAt: new Date()
    },
    create: {
      appointmentId: appointment.id,
      dentistId: appointment.dentistId,
      patientId: appointment.patientId,
      ...validation.normalized,
      status: 'finalized',
      finalizedAt: new Date()
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: 'post_call_summary_finalized',
    metadata: {
      summaryId: summary.id,
      status: summary.status,
      hasFollowUp: summary.followUpNeeded,
      finalizedAt: summary.finalizedAt
    }
  });

  await syncFollowUpTaskForSummary({ appointment, summary });

  const refreshed = await prisma.appointmentClinicalSummary.findUnique({
    where: { appointmentId: appointment.id },
    include: { followUpTasks: { orderBy: { createdAt: 'desc' } } }
  });

  return serializeSummary(refreshed || summary, { includeDraft: true });
}

export async function amendClinicalSummary({ appointmentId, user, input }) {
  const appointment = await getAppointment(appointmentId);
  if (!isAssignedDentist(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (!appointment.clinicalSummary || appointment.clinicalSummary.status !== 'finalized') {
    const error = new Error('SUMMARY_NOT_FINALIZED');
    error.status = 409;
    throw error;
  }

  const normalized = normalizeSummaryInput({
    ...appointment.clinicalSummary,
    ...(input || {})
  });
  const summary = await prisma.appointmentClinicalSummary.update({
    where: { appointmentId: appointment.id },
    data: {
      ...normalized,
      status: 'amended',
      amendedAt: new Date()
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: 'post_call_summary_amended',
    metadata: {
      summaryId: summary.id,
      status: summary.status,
      amendedAt: summary.amendedAt
    }
  });

  await syncFollowUpTaskForSummary({ appointment, summary });

  const refreshed = await prisma.appointmentClinicalSummary.findUnique({
    where: { appointmentId: appointment.id },
    include: { followUpTasks: { orderBy: { createdAt: 'desc' } } }
  });

  return serializeSummary(refreshed || summary, { includeDraft: true });
}

export async function acknowledgeClinicalSummary({ appointmentId, user }) {
  const appointment = await getAppointment(appointmentId);
  if (!isAssignedPatient(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  if (!appointment.clinicalSummary || !['finalized', 'amended'].includes(appointment.clinicalSummary.status)) {
    const error = new Error('SUMMARY_NOT_FINALIZED');
    error.status = 409;
    throw error;
  }

  const summary = await prisma.appointmentClinicalSummary.update({
    where: { appointmentId: appointment.id },
    data: {
      patientAcknowledgedAt: appointment.clinicalSummary.patientAcknowledgedAt || new Date(),
      patientAcknowledgedById: appointment.patientId
    },
    include: {
      followUpTasks: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: 'patient',
    eventType: 'post_call_summary_acknowledged',
    metadata: {
      summaryId: summary.id,
      acknowledgedAt: summary.patientAcknowledgedAt
    }
  });

  return serializeSummary(summary, { includeDraft: false });
}

export const __testables = {
  normalizeSummaryInput,
  serializeSummary,
  syncFollowUpTaskForSummary,
  validateClinicalSummaryForFinalize
};
