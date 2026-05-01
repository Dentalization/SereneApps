import { PrismaClient } from '@prisma/client';
import { parseAppointmentIdFromRoomName } from './naming.js';
import { logCommunicationEvent } from './logging.js';
import {
  disconnectVideoParticipantForIdentity,
  recordCommunicationEvent
} from '../communications.js';
import {
  markCommunicationParticipantJoinedFromIdentity,
  parseParticipantIdentity
} from './participantAccessService.js';

const prisma = new PrismaClient();
const OBSERVER_TRACK_EVENT_RE = /track|publish/i;

function parseVideoAppointment(event) {
  const appointmentId = parseAppointmentIdFromRoomName(event.RoomName);
  if (!appointmentId) {
    return null;
  }
  return BigInt(appointmentId);
}

function eventOccurredAt(event) {
  const parsed = event.Timestamp ? new Date(event.Timestamp) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function recordVideoEvent(event, eventType, appointmentId, userId = null, metadata = {}, actorRole = null) {
  const providerEventId = [
    event.RoomSid,
    event.StatusCallbackEvent,
    event.ParticipantSid || event.ParticipantIdentity || '',
    event.Timestamp || ''
  ].filter(Boolean).join(':');

  await recordCommunicationEvent({
    appointmentId,
    userId,
    actorRole,
    eventType,
    provider: 'twilio-video',
    providerEventId,
    resourceSid: event.RoomSid,
    metadata: {
      roomName: event.RoomName,
      participantSid: event.ParticipantSid,
      participantIdentity: event.ParticipantIdentity,
      ...metadata
    },
    occurredAt: eventOccurredAt(event)
  });
}

function isObserverTrackPublishEvent(event, parsedIdentity) {
  return parsedIdentity?.type === 'clinic_observer'
    && Boolean(event.TrackSid || event.TrackName || event.TrackKind || OBSERVER_TRACK_EVENT_RE.test(event.StatusCallbackEvent || ''));
}

async function handleObserverPublishViolation(event, appointmentId, parsedIdentity) {
  const metadata = {
    roomName: event.RoomName,
    roomSid: event.RoomSid,
    participantSid: event.ParticipantSid,
    trackSid: event.TrackSid,
    trackKind: event.TrackKind,
    statusCallbackEvent: event.StatusCallbackEvent,
    action: 'auto_disconnect_attempted'
  };

  await recordVideoEvent(
    event,
    'clinic_observer_publish_violation',
    appointmentId,
    parsedIdentity.userId,
    metadata,
    'observer'
  );

  let disconnected = false;
  try {
    const result = await disconnectVideoParticipantForIdentity({
      appointmentId,
      identity: event.ParticipantIdentity,
      reason: 'clinic_observer_publish_violation'
    });
    disconnected = Boolean(result?.disconnected);
  } catch (error) {
    logCommunicationEvent('clinic_observer_publish_violation_disconnect_failed', {
      appointmentId,
      roomName: event.RoomName,
      roomSid: event.RoomSid,
      error: error.message
    }, 'warn');
  }

  logCommunicationEvent('clinic_observer_publish_violation', {
    appointmentId,
    roomName: event.RoomName,
    roomSid: event.RoomSid,
    userId: parsedIdentity.userId,
    trackSid: event.TrackSid,
    disconnected
  }, 'warn');

  return { processed: true, violation: true, disconnected };
}

export async function handleVideoEvent(event) {
  const {
    StatusCallbackEvent,
    RoomSid,
    RoomName,
    RoomDuration,
    ParticipantIdentity,
  } = event;

  const appointmentId = parseVideoAppointment(event);
  if (!appointmentId) {
    return { skipped: true, reason: 'unknown_room_name' };
  }

  switch (StatusCallbackEvent) {
    case 'room-created': {
      await recordVideoEvent(event, 'room_created', appointmentId);
      logCommunicationEvent('room_ensured', { appointmentId, roomName: RoomName, roomSid: RoomSid });
      return { processed: true };
    }

    case 'room-ended': {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (appointment && appointment.status === 'confirmed') {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'completed' }
        });

        await prisma.appointmentStatusHistory.create({
          data: {
            appointmentId,
            newStatus: 'completed',
            previousStatus: 'confirmed',
            reason: 'video_session_ended',
            metadata: {
              roomSid: RoomSid,
              durationSeconds: Number(RoomDuration || 0)
            }
          }
        });

        await prisma.domainEventOutbox.create({
          data: {
            eventType: 'video_session_ended',
            aggregateType: 'appointment',
            aggregateId: appointmentId.toString(),
            payload: {
              appointmentId: appointmentId.toString(),
              roomSid: RoomSid,
              durationSeconds: Number(RoomDuration || 0)
            }
          }
        });
      }

      await recordVideoEvent(event, 'room_ended', appointmentId, null, {
        durationSeconds: Number(RoomDuration || 0)
      });
      logCommunicationEvent('room_ended', {
        appointmentId,
        roomName: RoomName,
        roomSid: RoomSid,
        durationSeconds: Number(RoomDuration || 0)
      });

      return { processed: true };
    }

    case 'participant-connected': {
      if (!ParticipantIdentity) return { skipped: true, reason: 'missing_participant_identity' };
      const parsedIdentity = parseParticipantIdentity(ParticipantIdentity);
      if (!parsedIdentity) return { skipped: true, reason: 'invalid_participant_identity' };
      const joinedAt = eventOccurredAt(event);
      const userId = ['user', 'clinic_observer'].includes(parsedIdentity?.type) ? parsedIdentity.userId : null;
      const externalParticipant = parsedIdentity?.type === 'communication_participant'
        ? await markCommunicationParticipantJoinedFromIdentity({
            appointmentId,
            identity: ParticipantIdentity,
            joinedAt
          })
        : null;

      if (userId) {
        const existing = await prisma.videoSession.findFirst({
          where: { appointmentId, userId, leftAt: null }
        });

        if (!existing) {
          await prisma.videoSession.create({
            data: {
              appointmentId,
              userId,
              joinedAt
            }
          });
        } else {
          await prisma.videoSession.update({
            where: { id: existing.id },
            data: { joinedAt }
          });
        }
      }

      await recordVideoEvent(
        event,
        parsedIdentity?.type === 'clinic_observer' ? 'clinic_observer_joined' : 'participant_joined',
        appointmentId,
        userId,
        { participantId: externalParticipant?.id || null },
        parsedIdentity?.role || externalParticipant?.role || null
      );
      logCommunicationEvent('room_joined', {
        appointmentId,
        roomName: RoomName,
        roomSid: RoomSid,
        userId,
        actorRole: parsedIdentity?.role || externalParticipant?.role || null,
        participantId: externalParticipant?.id || null
      });
      return { processed: true };
    }

    case 'participant-disconnected': {
      if (!ParticipantIdentity) return { skipped: true, reason: 'missing_participant_identity' };
      const parsedIdentity = parseParticipantIdentity(ParticipantIdentity);
      if (!parsedIdentity) return { skipped: true, reason: 'invalid_participant_identity' };
      const userId = ['user', 'clinic_observer'].includes(parsedIdentity?.type) ? parsedIdentity.userId : null;
      const externalParticipant = parsedIdentity?.type === 'communication_participant'
        ? await prisma.appointmentCommunicationParticipant.findUnique({
            where: { id: parsedIdentity.participantId }
          }).catch(() => null)
        : null;
      const session = userId
        ? await prisma.videoSession.findFirst({
            where: {
              appointmentId,
              userId,
              leftAt: null
            },
            orderBy: { joinedAt: 'desc' }
          })
        : null;

      let durationSeconds = null;
      if (session) {
        const leftAt = eventOccurredAt(event);
        durationSeconds = Math.max(0, Math.round((leftAt.getTime() - session.joinedAt.getTime()) / 1000));

        await prisma.videoSession.update({
          where: { id: session.id },
          data: {
            leftAt,
            durationSeconds
          }
        });
      }

      await recordVideoEvent(
        event,
        parsedIdentity?.type === 'clinic_observer' ? 'clinic_observer_left' : 'participant_disconnected',
        appointmentId,
        userId,
        {
          durationSeconds,
          participantId: externalParticipant?.id || null
        },
        parsedIdentity?.role || externalParticipant?.role || null
      );
      logCommunicationEvent('room_left', {
        appointmentId,
        roomName: RoomName,
        roomSid: RoomSid,
        userId,
        actorRole: parsedIdentity?.role || externalParticipant?.role || null,
        participantId: externalParticipant?.id || null,
        durationSeconds
      });
      return { processed: true };
    }

    case 'participant-reconnected': {
      if (!ParticipantIdentity) return { skipped: true, reason: 'missing_participant_identity' };
      const parsedIdentity = parseParticipantIdentity(ParticipantIdentity);
      if (!parsedIdentity) return { skipped: true, reason: 'invalid_participant_identity' };
      const userId = ['user', 'clinic_observer'].includes(parsedIdentity?.type) ? parsedIdentity.userId : null;
      await recordVideoEvent(
        event,
        parsedIdentity?.type === 'clinic_observer' ? 'clinic_observer_reconnected' : 'participant_reconnected',
        appointmentId,
        userId,
        {},
        parsedIdentity?.role || null
      );
      logCommunicationEvent('participant_reconnected', {
        appointmentId,
        roomName: RoomName,
        roomSid: RoomSid,
        userId,
        actorRole: parsedIdentity?.role || null
      });
      return { processed: true };
    }

    default:
      if (ParticipantIdentity) {
        const parsedIdentity = parseParticipantIdentity(ParticipantIdentity);
        if (isObserverTrackPublishEvent(event, parsedIdentity)) {
          return handleObserverPublishViolation(event, appointmentId, parsedIdentity);
        }
      }
      await recordVideoEvent(event, 'video_webhook_ignored', appointmentId, null, {
        statusCallbackEvent: StatusCallbackEvent
      });
      return { skipped: true, reason: 'unsupported_event_type' };
  }
}

export const __testables = {
  isObserverTrackPublishEvent
};
