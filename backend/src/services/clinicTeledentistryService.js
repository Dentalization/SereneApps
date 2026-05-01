import { PrismaClient } from '@prisma/client';
import { attachmentPresentationForMessage } from './communications/attachmentStorageService.js';
import { recordCommunicationEvent } from './communications.js';

const prisma = new PrismaClient();

const OWNER_ROLES = new Set(['clinic_owner', 'owner']);
const ADMIN_ROLES = new Set(['clinic_admin', 'manager', 'clinic_manager', 'admin']);
const STAFF_ROLES = new Set(['clinic_staff', 'staff', 'front_office', 'nurse', 'cashier']);
const TELE_CONSULTATION_TYPES = ['virtual', 'tele', 'teledentistry'];
const WAITING_STATUSES = new Set(['scheduled', 'confirmed', 'check-in', 'in-chair']);
const COMPLETED_STATUSES = new Set(['completed']);
const ENDED_STATUSES = new Set(['cancelled', 'no-show']);
const OBSERVER_VIDEO_SESSION_ROLES = new Set(['observer', 'clinic_observer']);

function toBigInt(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

function normalizeClinicRole(role) {
  if (OWNER_ROLES.has(role)) return 'clinic_owner';
  if (ADMIN_ROLES.has(role)) return 'clinic_admin';
  if (STAFF_ROLES.has(role)) return 'clinic_staff';
  return null;
}

function hasRole(clinicRole, allowedRoles = []) {
  return allowedRoles.includes(clinicRole);
}

function capabilitiesForClinicRole(clinicRole) {
  return {
    canObserve: clinicRole === 'clinic_owner',
    canViewSummaries: clinicRole === 'clinic_owner' || clinicRole === 'clinic_admin',
    canViewClinicalSummaryBody: clinicRole === 'clinic_owner'
      || (clinicRole === 'clinic_admin' && clinicAdminCanViewClinicalSummary()),
    canViewChatHistory: clinicRole === 'clinic_owner',
    canViewAuditLog: clinicRole === 'clinic_owner',
    canViewSessions: clinicRole === 'clinic_owner' || clinicRole === 'clinic_admin'
  };
}

function clinicAdminCanViewClinicalSummary(env = process.env) {
  return env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY === 'true';
}

function scopedClinicBranchIdsForContext(context, branchIds) {
  return context.assignedBranchId && context.clinicRole !== 'clinic_owner'
    ? [context.assignedBranchId]
    : branchIds;
}

function dateWindow(date) {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error('INVALID_DATE');
    error.status = 400;
    throw error;
  }
  const start = new Date(`${date}T00:00:00+07:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function redactMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !/(token|secret|otp|code|jwt|auth)/i.test(key))
      .map(([key, value]) => {
        if (typeof value === 'string') return [key, value.slice(0, 180)];
        if (typeof value === 'number' || typeof value === 'boolean' || value === null) return [key, value];
        if (value instanceof Date) return [key, value.toISOString()];
        return [key, '[redacted-object]'];
      })
  );
}

function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id?.toString?.() ?? user.id,
    name: user.name || null,
    email: user.email || null,
    phone: user.phone_number || null
  };
}

function serializeSummary(summary, { includeBody = false } = {}) {
  if (!summary) return { status: 'pending', summary: null };
  const isFinal = summary.status === 'finalized' || summary.status === 'amended';
  if (!isFinal) return { status: summary.status || 'draft', summary: null };
  return {
    status: summary.status,
    summary: includeBody
      ? {
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
          finalizedAt: summary.finalizedAt,
          amendedAt: summary.amendedAt,
          patientAcknowledgedAt: summary.patientAcknowledgedAt,
          followUpTasks: (summary.followUpTasks || []).map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueAt: task.dueAt,
            completedAt: task.completedAt
          })),
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt
        }
      : null
  };
}

function isClinicalVideoSession(session) {
  const actorRole = session?.actorRole || 'participant';
  return !OBSERVER_VIDEO_SESSION_ROLES.has(actorRole);
}

function activeClinicalVideoSessionWhere() {
  return {
    leftAt: null,
    actorRole: { notIn: Array.from(OBSERVER_VIDEO_SESSION_ROLES) }
  };
}

function sessionBucket(appointment) {
  const hasClinicalParticipant = (appointment.videoSessions || []).some((session) => (
    !session.leftAt && isClinicalVideoSession(session)
  ));
  if (hasClinicalParticipant) return 'live';
  if (COMPLETED_STATUSES.has(appointment.status)) return 'completed';
  if (ENDED_STATUSES.has(appointment.status)) return 'ended';
  if (WAITING_STATUSES.has(appointment.status)) return 'waiting';
  return appointment.status || 'unknown';
}

function serializeSession(appointment, context) {
  const activeParticipants = (appointment.videoSessions || []).filter((session) => (
    !session.leftAt && isClinicalVideoSession(session)
  ));
  const activeObservers = (appointment.videoSessions || []).filter((session) => (
    !session.leftAt && !isClinicalVideoSession(session)
  ));
  const completedSessions = (appointment.videoSessions || []).filter((session) => session.leftAt);
  const durationSeconds = completedSessions.reduce((sum, session) => sum + (session.durationSeconds || 0), 0);
  const summary = serializeSummary(appointment.clinicalSummary);

  return {
    appointmentId: appointment.id.toString(),
    roomName: appointment.videoRoomRef || `appointment-${appointment.id}`,
    roomSid: appointment.video_room_sid || null,
    status: appointment.status,
    sessionStatus: sessionBucket(appointment),
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    durationSeconds,
    activeParticipantCount: activeParticipants.length,
    activeObserverCount: activeObservers.length,
    participantRoles: (appointment.communicationParticipants || []).map((participant) => ({
      id: participant.id,
      role: participant.role,
      status: participant.status,
      displayName: participant.displayName
    })),
    summaryStatus: summary.status,
    commStatus: appointment.commStatus,
    patient: serializeUser(appointment.patient),
    dentist: serializeUser(appointment.dentist),
    canObserve: context.capabilities.canObserve && sessionBucket(appointment) === 'live'
  };
}

function serializeMessage(message) {
  const attachment = attachmentPresentationForMessage(message);
  return {
    id: message.id.toString(),
    senderId: message.senderId?.toString?.() ?? null,
    senderParticipantId: message.senderCommunicationParticipantId || null,
    senderName: message.sender?.name || message.senderCommunicationParticipant?.displayName || 'Participant',
    senderRole: message.senderCommunicationParticipant?.role || null,
    message: message.message,
    messageType: message.messageType,
    twilioMessageSid: message.twilioMessageSid,
    fileName: message.fileName,
    mimeType: message.mimeType,
    fileSizeBytes: message.fileSizeBytes?.toString?.() ?? null,
    fileUrl: null,
    attachmentAvailable: attachment.attachmentAvailable,
    mediaTombstoneReason: attachment.tombstoneReason,
    createdAt: message.createdAt
  };
}

export async function getClinicTeledentistryContext(user, allowedRoles = ['clinic_owner', 'clinic_admin']) {
  const staff = await prisma.clinicStaff.findUnique({
    where: { userId: toBigInt(user.id, 'userId') },
    select: {
      id: true,
      role: true,
      isActive: true,
      clinicProfileId: true,
      assignedBranchId: true
    }
  });

  const clinicRole = normalizeClinicRole(staff?.role);
  if (!staff?.isActive || !clinicRole || !hasRole(clinicRole, allowedRoles)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return {
    userId: toBigInt(user.id, 'userId'),
    staffId: staff.id,
    clinicRole,
    capabilities: capabilitiesForClinicRole(clinicRole),
    clinicProfileId: staff.clinicProfileId,
    assignedBranchId: staff.assignedBranchId
  };
}

async function clinicBranchIds(context) {
  if (context.assignedBranchId && context.clinicRole !== 'clinic_owner') {
    return [context.assignedBranchId];
  }
  const branches = await prisma.clinicBranch.findMany({
    where: { clinicProfileId: context.clinicProfileId },
    select: { id: true }
  });
  return scopedClinicBranchIdsForContext(context, branches.map((branch) => branch.id));
}

function teleAppointmentScope(branchIds) {
  return {
    clinicBranchId: { in: branchIds },
    OR: [
      { consultationType: { in: TELE_CONSULTATION_TYPES } },
      { videoRoomRef: { not: null } }
    ]
  };
}

function sessionStatusWhere(status) {
  if (status === 'live') {
    return { videoSessions: { some: activeClinicalVideoSessionWhere() } };
  }
  if (status === 'waiting') {
    return {
      AND: [
        { videoSessions: { none: activeClinicalVideoSessionWhere() } },
        { status: { in: Array.from(WAITING_STATUSES) } }
      ]
    };
  }
  if (status === 'active') {
    return {
      OR: [
        { videoSessions: { some: activeClinicalVideoSessionWhere() } },
        { status: { in: Array.from(WAITING_STATUSES) } }
      ]
    };
  }
  if (status === 'completed') {
    return { status: { in: Array.from(COMPLETED_STATUSES) } };
  }
  if (status === 'ended') {
    return {
      OR: [
        { status: { in: Array.from(ENDED_STATUSES) } },
        { communicationEvents: { some: { eventType: { in: ['room_ended', 'consultation_room_hard_ended'] } } } }
      ]
    };
  }
  return {};
}

async function getClinicTeleAppointment({ context, appointmentId }) {
  const branchIds = await clinicBranchIds(context);
  if (!branchIds.length) {
    const error = new Error('APPOINTMENT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: toBigInt(appointmentId, 'appointmentId'),
      clinicBranchId: { in: branchIds },
      OR: [
        { consultationType: { in: TELE_CONSULTATION_TYPES } },
        { videoRoomRef: { not: null } }
      ]
    },
    include: {
      patient: { select: { id: true, name: true, email: true, phone_number: true } },
      dentist: { select: { id: true, name: true, email: true, phone_number: true } },
      clinicalSummary: {
        include: { followUpTasks: { orderBy: { createdAt: 'desc' } } }
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

export async function listClinicTeledentistrySessions({ user, date, status }) {
  const context = await getClinicTeledentistryContext(user);
  const branchIds = await clinicBranchIds(context);
  if (!branchIds.length) {
    return {
      clinicRole: context.clinicRole,
      capabilities: context.capabilities,
      sessions: [],
      counts: { live: 0, waiting: 0, completed: 0, ended: 0, active: 0, total: 0 }
    };
  }

  const window = dateWindow(date);
  const appointments = await prisma.appointment.findMany({
    where: {
      AND: [
        teleAppointmentScope(branchIds),
        sessionStatusWhere(status),
        ...(window ? [{ startsAt: { gte: window.start, lt: window.end } }] : [])
      ]
    },
    include: {
      patient: { select: { id: true, name: true, email: true, phone_number: true } },
      dentist: { select: { id: true, name: true, email: true, phone_number: true } },
      clinicalSummary: true,
      communicationParticipants: {
        select: { id: true, role: true, status: true, displayName: true }
      },
      videoSessions: {
        orderBy: { joinedAt: 'desc' }
      }
    },
    orderBy: { startsAt: 'desc' },
    take: 250
  });

  const sessions = appointments.map((appointment) => serializeSession(appointment, context));

  return {
    clinicRole: context.clinicRole,
    capabilities: context.capabilities,
    sessions,
    counts: {
      live: sessions.filter((session) => session.sessionStatus === 'live').length,
      waiting: sessions.filter((session) => session.sessionStatus === 'waiting').length,
      completed: sessions.filter((session) => session.sessionStatus === 'completed').length,
      ended: sessions.filter((session) => session.sessionStatus === 'ended').length,
      active: sessions.filter((session) => ['live', 'waiting'].includes(session.sessionStatus)).length,
      total: sessions.length
    }
  };
}

export async function countClinicTeledentistrySessions({ user, status }) {
  const context = await getClinicTeledentistryContext(user);
  const branchIds = await clinicBranchIds(context);
  if (!branchIds.length) {
    return { clinicRole: context.clinicRole, capabilities: context.capabilities, status: status || 'all', count: 0 };
  }

  const count = await prisma.appointment.count({
    where: {
      AND: [
        teleAppointmentScope(branchIds),
        sessionStatusWhere(status)
      ]
    }
  });

  return {
    clinicRole: context.clinicRole,
    capabilities: context.capabilities,
    status: status || 'all',
    count
  };
}

export async function getClinicTeledentistrySummary({ user, appointmentId }) {
  const context = await getClinicTeledentistryContext(user, ['clinic_owner', 'clinic_admin']);
  const appointment = await getClinicTeleAppointment({ context, appointmentId });
  const includeBody = context.capabilities.canViewClinicalSummaryBody;
  return {
    clinicRole: context.clinicRole,
    capabilities: context.capabilities,
    appointment: {
      id: appointment.id.toString(),
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      patient: serializeUser(appointment.patient),
      dentist: serializeUser(appointment.dentist)
    },
    ...serializeSummary(appointment.clinicalSummary, { includeBody })
  };
}

export async function getClinicTeledentistryMessages({ user, appointmentId, limit = 100 }) {
  const context = await getClinicTeledentistryContext(user, ['clinic_owner']);
  const appointment = await getClinicTeleAppointment({ context, appointmentId });
  const room = await prisma.chatRoom.findUnique({
    where: { appointmentId: appointment.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: Math.min(Math.max(Number(limit) || 100, 1), 250),
        include: {
          sender: { select: { id: true, name: true, email: true } },
          senderCommunicationParticipant: {
            select: { id: true, displayName: true, role: true }
          }
        }
      }
    }
  });

  const safeMessages = (room?.messages || [])
    .filter((message) => message.metadata?.deleted !== true)
    .map((message) => serializeMessage(message));

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: context.userId,
    actorRole: 'clinic_owner',
    eventType: 'clinic_chat_history_viewed',
    provider: 'local',
    metadata: {
      clinicStaffId: context.staffId,
      messageCount: safeMessages.length
    }
  }).catch(() => null);

  return {
    clinicRole: context.clinicRole,
    capabilities: context.capabilities,
    appointmentId: appointment.id.toString(),
    chatRoomId: room?.id?.toString?.() ?? null,
    source: 'local_chat_messages_projection',
    messages: safeMessages
  };
}

export async function listClinicCommunicationAudit({ user, date, eventType, dentistId, limit = 100 }) {
  const context = await getClinicTeledentistryContext(user, ['clinic_owner']);
  const branchIds = await clinicBranchIds(context);
  if (!branchIds.length) return { clinicRole: context.clinicRole, capabilities: context.capabilities, events: [] };

  const window = dateWindow(date);
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicBranchId: { in: branchIds },
      ...(dentistId ? { dentistId: toBigInt(dentistId, 'dentistId') } : {}),
      OR: [
        { consultationType: { in: TELE_CONSULTATION_TYPES } },
        { videoRoomRef: { not: null } }
      ]
    },
    select: { id: true },
    take: 500
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);
  if (!appointmentIds.length) return { clinicRole: context.clinicRole, capabilities: context.capabilities, events: [] };

  const events = await prisma.communicationEvent.findMany({
    where: {
      appointmentId: { in: appointmentIds },
      ...(eventType ? { eventType } : {}),
      ...(window ? { occurredAt: { gte: window.start, lt: window.end } } : {})
    },
    orderBy: { occurredAt: 'desc' },
    take: Math.min(Math.max(Number(limit) || 100, 1), 250)
  });

  return {
    clinicRole: context.clinicRole,
    capabilities: context.capabilities,
    events: events.map((event) => ({
      id: event.id.toString(),
      appointmentId: event.appointmentId.toString(),
      userId: event.userId?.toString?.() ?? null,
      actorRole: event.actorRole,
      eventType: event.eventType,
      provider: event.provider,
      providerSid: event.providerSid || event.resourceSid,
      occurredAt: event.occurredAt,
      metadata: redactMetadata(event.metadata || {})
    }))
  };
}

export const __testables = {
  capabilitiesForClinicRole,
  sessionBucket,
  sessionStatusWhere,
  serializeMessage,
  scopedClinicBranchIdsForContext,
  clinicAdminCanViewClinicalSummary,
  isClinicalVideoSession
};
