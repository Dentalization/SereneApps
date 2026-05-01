import { PrismaClient } from '@prisma/client';
import { logCommunicationEvent } from './logging.js';
import { recordCommunicationEvent } from '../communications.js';
import { tombstoneAttachmentMessage } from './attachmentStorageService.js';

const prisma = new PrismaClient();

export async function expireMediaAttachments({ now = new Date(), limit = 100 } = {}) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      messageType: 'file',
      mediaDeletedAt: null,
      mediaRetentionUntil: { lt: now }
    },
    take: limit,
    orderBy: { mediaRetentionUntil: 'asc' },
    include: { chatRoom: { select: { appointmentId: true } } }
  });

  let expired = 0;
  for (const message of messages) {
    await tombstoneAttachmentMessage({ message, reason: 'retention_expired' });
    expired += 1;
    await recordCommunicationEvent({
      appointmentId: message.chatRoom.appointmentId,
      eventType: 'attachment_retention_expired',
      provider: message.storageProvider || message.metadata?.storage || 'attachment-storage',
      resourceSid: message.storageObjectKey || message.metadata?.objectKey || null,
      metadata: {
        messageId: message.id.toString(),
        fileName: message.fileName,
        mediaRetentionUntil: message.mediaRetentionUntil
      }
    });
  }

  if (expired > 0) {
    logCommunicationEvent('attachment_retention_expired', { expired });
  }
  return { expired };
}

export async function expireParticipantInviteTokens({ now = new Date(), limit = 100 } = {}) {
  const participants = await prisma.appointmentCommunicationParticipant.findMany({
    where: {
      status: { in: ['invited', 'verified'] },
      expiresAt: { lt: now },
      inviteTokenHash: { not: null }
    },
    take: limit,
    orderBy: { expiresAt: 'asc' }
  });

  let expired = 0;
  for (const participant of participants) {
    await prisma.appointmentCommunicationParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'expired',
        inviteTokenHash: null
      }
    });
    expired += 1;
    await recordCommunicationEvent({
      appointmentId: participant.appointmentId,
      actorRole: participant.role,
      eventType: `${participant.role}_invite_expired`,
      metadata: {
        participantId: participant.id,
        role: participant.role,
        expiresAt: participant.expiresAt
      }
    });
  }

  if (expired > 0) {
    logCommunicationEvent('participant_invite_tokens_expired', { expired });
  }
  return { expired };
}

export function startCommunicationsRetentionWorker() {
  const intervalMs = Math.max(60_000, Number(process.env.COMM_RETENTION_WORKER_INTERVAL_MS || 15 * 60_000));
  const run = async () => {
    try {
      const [attachments, invites] = await Promise.all([
        expireMediaAttachments(),
        expireParticipantInviteTokens()
      ]);
      if (attachments.expired || invites.expired) {
        logCommunicationEvent('communications_retention_cycle_completed', {
          expiredAttachments: attachments.expired,
          expiredInvites: invites.expired
        });
      }
    } catch (error) {
      logCommunicationEvent('communications_retention_cycle_failed', {
        error: error.message
      }, 'warn');
    }
  };

  if (process.env.NODE_ENV !== 'test') {
    setTimeout(run, 30_000).unref?.();
    setInterval(run, intervalMs).unref?.();
  }
}

export const __testables = {
  expireMediaAttachments,
  expireParticipantInviteTokens
};
