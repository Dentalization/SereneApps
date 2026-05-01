import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  addConversationParticipantForIdentity,
  communicationActorRoleForAppointment,
  disconnectVideoParticipantForIdentity,
  issueExternalParticipantScopedToken,
  removeConversationParticipantForIdentity,
  recordCommunicationEvent
} from '../communications.js';

const prisma = new PrismaClient();

export const COMMUNICATION_PARTICIPANT_ROLES = [
  'dentist',
  'patient',
  'guardian',
  'interpreter',
  'assistant',
  'observer'
];

const INVITABLE_ROLES = new Set(['guardian', 'interpreter', 'assistant', 'observer']);
const ADMIN_INVITE_ROLES = new Set(['admin', 'super_admin']);
const ACTIVE_INVITE_STATUSES = new Set(['invited', 'verified', 'joined']);

function toBigInt(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

function isDentistOrAdmin(user, appointment) {
  const roles = user?.roles || [];
  return BigInt(user.id) === appointment.dentistId || roles.some((role) => ADMIN_INVITE_ROLES.has(role));
}

function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  return value || null;
}

function normalizePhone(phone) {
  const value = String(phone || '').trim();
  return value || null;
}

function normalizeDisplayName(value) {
  const name = String(value || '').trim();
  if (!name) {
    const error = new Error('DISPLAY_NAME_REQUIRED');
    error.status = 400;
    throw error;
  }
  return name.slice(0, 160);
}

export function hashInviteToken(token, secret = process.env.COMM_INVITE_HASH_SECRET || process.env.JWT_SECRET || '') {
  if (!token || typeof token !== 'string') {
    throw new Error('INVITE_TOKEN_REQUIRED');
  }
  return crypto
    .createHash('sha256')
    .update(`sereneapps-v1:${secret}:${token}`)
    .digest('hex');
}

export function buildParticipantIdentity({ appointmentId, participantId, role, userId }) {
  if (userId) return userId.toString();
  return `appointment-${appointmentId}:participant-${participantId}:${role}`;
}

export function parseParticipantIdentity(identity) {
  if (!identity) return null;
  if (/^\d+$/.test(identity)) {
    return { type: 'user', userId: BigInt(identity) };
  }
  const observerMatch = String(identity).match(/^appointment-(\d+)-observer-(\d+)$/);
  if (observerMatch) {
    return {
      type: 'clinic_observer',
      appointmentId: BigInt(observerMatch[1]),
      userId: BigInt(observerMatch[2]),
      role: 'observer'
    };
  }
  const match = String(identity).match(/^appointment-(\d+):participant-([0-9a-fA-F-]{36}):([a-z_]+)$/);
  if (!match) return null;
  return {
    type: 'communication_participant',
    appointmentId: BigInt(match[1]),
    participantId: match[2],
    role: match[3]
  };
}

function serializeParticipant(participant, { includeContact = false } = {}) {
  return {
    id: participant.id,
    appointmentId: participant.appointmentId.toString(),
    userId: participant.userId?.toString?.() ?? null,
    displayName: participant.displayName,
    role: participant.role,
    status: participant.status,
    email: includeContact ? participant.email : undefined,
    phone: includeContact ? participant.phone : undefined,
    invitedById: participant.invitedById?.toString?.() ?? null,
    invitedAt: participant.invitedAt,
    verifiedAt: participant.verifiedAt,
    joinedAt: participant.joinedAt,
    lastInviteSentAt: participant.lastInviteSentAt,
    revokedAt: participant.revokedAt,
    kickedAt: participant.kickedAt,
    accessRegeneratedAt: participant.accessRegeneratedAt,
    expiresAt: participant.expiresAt,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt
  };
}

function buildInviteDelivery({ rawToken }) {
  return {
    inviteToken: rawToken,
    inviteUrl: process.env.COMM_INVITE_BASE_URL
      ? `${process.env.COMM_INVITE_BASE_URL.replace(/\/$/, '')}?token=${encodeURIComponent(rawToken)}`
      : null
  };
}

async function getAppointment(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: toBigInt(appointmentId, 'appointmentId') },
    include: {
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

export async function inviteCommunicationParticipant({ appointmentId, user, input = {} }) {
  const appointment = await getAppointment(appointmentId);
  if (!isDentistOrAdmin(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const role = String(input.role || '').trim().toLowerCase();
  if (!INVITABLE_ROLES.has(role)) {
    const error = new Error('INVALID_PARTICIPANT_ROLE');
    error.status = 400;
    throw error;
  }

  const displayName = normalizeDisplayName(input.displayName || input.name);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!email && !phone) {
    const error = new Error('CONTACT_REQUIRED');
    error.status = 400;
    throw error;
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const inviteTokenHash = hashInviteToken(rawToken);
  const requestedExpiryHours = Number(input.expiresInHours || 24);
  const expiresInHours = Number.isFinite(requestedExpiryHours)
    ? Math.max(1, Math.min(requestedExpiryHours, 168))
    : 24;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const linkedUser = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null)
    : null;

  const participant = await prisma.appointmentCommunicationParticipant.create({
    data: {
      appointmentId: appointment.id,
      userId: linkedUser?.id || null,
      displayName,
      email,
      phone,
      role,
      status: 'invited',
      inviteTokenHash,
      invitedById: toBigInt(user.id, 'userId'),
      invitedAt: new Date(),
      lastInviteSentAt: new Date(),
      expiresAt
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: `${role}_invited`,
    metadata: {
      participantId: participant.id,
      role,
      status: participant.status,
      expiresAt
    }
  });

  return {
    participant: serializeParticipant(participant, { includeContact: true }),
    ...buildInviteDelivery({ rawToken })
  };
}

export async function listCommunicationParticipants({ appointmentId, user }) {
  const appointment = await getAppointment(appointmentId);
  const roles = user?.roles || [];
  const userId = toBigInt(user.id, 'userId');
  const isAppointmentUser = userId === appointment.dentistId || userId === appointment.patientId;
  const isSupport = roles.some((role) => ADMIN_INVITE_ROLES.has(role) || role === 'technical_support');
  if (!isAppointmentUser && !isSupport) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const canSeeContact = isDentistOrAdmin(user, appointment);
  const participants = await prisma.appointmentCommunicationParticipant.findMany({
    where: { appointmentId: appointment.id },
    orderBy: [{ createdAt: 'asc' }]
  });

  return {
    participants: participants.map((participant) => serializeParticipant(participant, { includeContact: canSeeContact }))
  };
}

export async function revokeCommunicationParticipant({ appointmentId, participantId, user }) {
  const appointment = await getAppointment(appointmentId);
  if (!isDentistOrAdmin(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const participant = await prisma.appointmentCommunicationParticipant.findFirst({
    where: { id: participantId, appointmentId: appointment.id }
  });
  if (!participant) {
    const error = new Error('PARTICIPANT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const updated = await prisma.appointmentCommunicationParticipant.update({
    where: { id: participant.id },
    data: {
      status: 'removed',
      inviteTokenHash: null,
      revokedAt: new Date(),
      removedById: toBigInt(user.id, 'userId')
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: `${participant.role}_revoked`,
    metadata: {
      participantId: participant.id,
      role: participant.role
    }
  });

  return { participant: serializeParticipant(updated, { includeContact: true }) };
}

export async function resendCommunicationParticipantInvite({ appointmentId, participantId, user, expiresInHours = 24 }) {
  const appointment = await getAppointment(appointmentId);
  if (!isDentistOrAdmin(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const participant = await prisma.appointmentCommunicationParticipant.findFirst({
    where: { id: participantId, appointmentId: appointment.id }
  });
  if (!participant) {
    const error = new Error('PARTICIPANT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (['removed', 'expired'].includes(participant.status)) {
    const error = new Error('PARTICIPANT_NOT_INVITABLE');
    error.status = 409;
    throw error;
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const requestedExpiryHours = Number(expiresInHours || 24);
  const safeExpiryHours = Number.isFinite(requestedExpiryHours)
    ? Math.max(1, Math.min(requestedExpiryHours, 168))
    : 24;
  const updated = await prisma.appointmentCommunicationParticipant.update({
    where: { id: participant.id },
    data: {
      inviteTokenHash: hashInviteToken(rawToken),
      status: participant.status === 'joined' ? 'verified' : participant.status,
      lastInviteSentAt: new Date(),
      expiresAt: new Date(Date.now() + safeExpiryHours * 60 * 60 * 1000)
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: `${participant.role}_invite_resent`,
    metadata: {
      participantId: participant.id,
      role: participant.role,
      expiresAt: updated.expiresAt
    }
  });

  return {
    participant: serializeParticipant(updated, { includeContact: true }),
    ...buildInviteDelivery({ rawToken })
  };
}

export async function regenerateCommunicationParticipantAccess({ appointmentId, participantId, user }) {
  const appointment = await getAppointment(appointmentId);
  if (!isDentistOrAdmin(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const participant = await prisma.appointmentCommunicationParticipant.findFirst({
    where: { id: participantId, appointmentId: appointment.id }
  });
  if (!participant) {
    const error = new Error('PARTICIPANT_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (participant.status === 'removed') {
    const error = new Error('PARTICIPANT_REMOVED');
    error.status = 409;
    throw error;
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const updated = await prisma.appointmentCommunicationParticipant.update({
    where: { id: participant.id },
    data: {
      inviteTokenHash: hashInviteToken(rawToken),
      status: 'invited',
      verifiedAt: null,
      joinedAt: null,
      accessRegeneratedAt: new Date(),
      lastInviteSentAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  const identity = buildParticipantIdentity({
    appointmentId: appointment.id,
    participantId: participant.id,
    role: participant.role,
    userId: participant.userId
  });
  await Promise.all([
    removeConversationParticipantForIdentity({ appointmentId: appointment.id, identity, reason: 'access_regenerated' }).catch(() => null),
    disconnectVideoParticipantForIdentity({ appointmentId: appointment.id, identity, reason: 'access_regenerated' }).catch(() => null)
  ]);

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: `${participant.role}_access_regenerated`,
    metadata: {
      participantId: participant.id,
      role: participant.role,
      expiresAt: updated.expiresAt
    }
  });

  return {
    participant: serializeParticipant(updated, { includeContact: true }),
    ...buildInviteDelivery({ rawToken })
  };
}

export async function kickCommunicationParticipant({ appointmentId, participantId, user }) {
  const appointment = await getAppointment(appointmentId);
  if (!isDentistOrAdmin(user, appointment)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  const participant = await prisma.appointmentCommunicationParticipant.findFirst({
    where: { id: participantId, appointmentId: appointment.id }
  });
  if (!participant) {
    const error = new Error('PARTICIPANT_NOT_FOUND');
    error.status = 404;
    throw error;
  }

  const identity = buildParticipantIdentity({
    appointmentId: appointment.id,
    participantId: participant.id,
    role: participant.role,
    userId: participant.userId
  });
  const [conversationResult, videoResult] = await Promise.all([
    removeConversationParticipantForIdentity({ appointmentId: appointment.id, identity, reason: 'moderator_kick' }).catch((error) => ({ removed: false, error: error.message })),
    disconnectVideoParticipantForIdentity({ appointmentId: appointment.id, identity, reason: 'moderator_kick' }).catch((error) => ({ disconnected: false, error: error.message }))
  ]);

  const updated = await prisma.appointmentCommunicationParticipant.update({
    where: { id: participant.id },
    data: {
      status: 'removed',
      inviteTokenHash: null,
      kickedAt: new Date(),
      removedById: toBigInt(user.id, 'userId')
    }
  });

  await recordCommunicationEvent({
    appointmentId: appointment.id,
    userId: user.id,
    actorRole: communicationActorRoleForAppointment(user, appointment),
    eventType: `${participant.role}_kicked`,
    metadata: {
      participantId: participant.id,
      role: participant.role,
      conversationRemoved: conversationResult?.removed || false,
      videoDisconnected: videoResult?.disconnected || false
    }
  });

  return {
    participant: serializeParticipant(updated, { includeContact: true }),
    moderation: {
      conversationRemoved: conversationResult?.removed || false,
      videoDisconnected: videoResult?.disconnected || false
    }
  };
}

export async function verifyCommunicationParticipantInvite({ token, appointmentId = null, ttl = 3600 }) {
  const inviteTokenHash = hashInviteToken(token);
  const participant = await prisma.appointmentCommunicationParticipant.findUnique({
    where: { inviteTokenHash },
    include: { appointment: true }
  });
  if (!participant) {
    const error = new Error('INVITE_NOT_FOUND');
    error.status = 404;
    throw error;
  }
  if (appointmentId && toBigInt(appointmentId, 'appointmentId') !== participant.appointmentId) {
    const error = new Error('INVITE_APPOINTMENT_MISMATCH');
    error.status = 403;
    throw error;
  }
  if (!ACTIVE_INVITE_STATUSES.has(participant.status)) {
    const error = new Error('INVITE_REVOKED');
    error.status = 409;
    throw error;
  }
  if (participant.expiresAt && participant.expiresAt.getTime() < Date.now()) {
    await prisma.appointmentCommunicationParticipant.update({
      where: { id: participant.id },
      data: { status: 'expired', inviteTokenHash: null }
    }).catch(() => null);
    const error = new Error('INVITE_EXPIRED');
    error.status = 410;
    throw error;
  }

  const identity = buildParticipantIdentity({
    appointmentId: participant.appointmentId,
    participantId: participant.id,
    role: participant.role,
    userId: participant.userId
  });

  await addConversationParticipantForIdentity({
    appointmentId: participant.appointmentId,
    identity,
    friendlyName: participant.displayName,
    reason: 'invite_verification'
  });

  const updated = await prisma.appointmentCommunicationParticipant.update({
    where: { id: participant.id },
    data: {
      status: participant.status === 'joined' ? 'joined' : 'verified',
      verifiedAt: participant.verifiedAt || new Date()
    }
  });

  await recordCommunicationEvent({
    appointmentId: participant.appointmentId,
    userId: participant.userId || null,
    actorRole: participant.role,
    eventType: `${participant.role}_verified`,
    metadata: {
      participantId: participant.id,
      role: participant.role,
      hasLinkedUser: Boolean(participant.userId)
    }
  });

  const session = await issueExternalParticipantScopedToken({
    appointmentId: participant.appointmentId,
    participant: {
      ...updated,
      identity
    },
    ttl
  });

  return {
    participant: serializeParticipant(updated, { includeContact: true }),
    session
  };
}

export async function markCommunicationParticipantJoinedFromIdentity({ appointmentId, identity, joinedAt = new Date() }) {
  const parsed = parseParticipantIdentity(identity);
  if (!parsed || parsed.type !== 'communication_participant') return null;
  if (BigInt(appointmentId) !== parsed.appointmentId) return null;

  const participant = await prisma.appointmentCommunicationParticipant.update({
    where: { id: parsed.participantId },
    data: {
      status: 'joined',
      joinedAt
    }
  }).catch(() => null);

  if (participant) {
    await recordCommunicationEvent({
      appointmentId,
      actorRole: participant.role,
      eventType: `${participant.role}_joined`,
      metadata: {
        participantId: participant.id,
        role: participant.role
      },
      occurredAt: joinedAt
    });
  }

  return participant;
}

export const __testables = {
  buildParticipantIdentity,
  hashInviteToken,
  parseParticipantIdentity,
  serializeParticipant
};
