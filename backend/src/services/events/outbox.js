import { PrismaClient } from '@prisma/client';
import { buildEventEnvelope } from './core-events.js';

const prisma = new PrismaClient();

export const OUTBOX_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  FAILED: 'failed'
});

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).filter(([, value]) => value !== undefined && value !== null)
  );
}

export async function appendDomainEvent({
  tx = prisma,
  eventType,
  aggregateType,
  aggregateId,
  correlationId,
  causationId,
  idempotencyKey,
  payload = {},
  headers = {},
  availableAt = new Date()
}) {
  const event = buildEventEnvelope({
    eventType,
    aggregateType,
    aggregateId,
    correlationId,
    causationId,
    idempotencyKey,
    payload,
    headers
  });

  return tx.domainEventOutbox.create({
    data: {
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      idempotencyKey: event.idempotencyKey,
      payload: event.payload,
      headers: normalizeHeaders({
        ...headers,
        occurredAt: event.occurredAt,
        producer: event.producer
      }),
      status: OUTBOX_STATUS.PENDING,
      availableAt
    }
  });
}

export async function appendDomainEvents({ tx = prisma, events = [] }) {
  const created = [];
  for (const event of events) {
    created.push(await appendDomainEvent({ tx, ...event }));
  }
  return created;
}

export async function listDueDomainEvents({ limit = 100 } = {}) {
  return prisma.domainEventOutbox.findMany({
    where: {
      status: { in: [OUTBOX_STATUS.PENDING, OUTBOX_STATUS.FAILED] },
      availableAt: { lte: new Date() }
    },
    orderBy: { availableAt: 'asc' },
    take: limit
  });
}

export async function markDomainEventPublished({ outboxId }) {
  return prisma.domainEventOutbox.update({
    where: { id: BigInt(outboxId) },
    data: {
      status: OUTBOX_STATUS.PUBLISHED,
      publishedAt: new Date(),
      lastError: null
    }
  });
}

export async function rescheduleDomainEvent({
  outboxId,
  errorMessage,
  availableAt
}) {
  return prisma.domainEventOutbox.update({
    where: { id: BigInt(outboxId) },
    data: {
      status: OUTBOX_STATUS.FAILED,
      attempts: { increment: 1 },
      lastError: errorMessage || 'OUTBOX_DELIVERY_FAILED',
      availableAt: availableAt || new Date(Date.now() + 60_000)
    }
  });
}
