import { PrismaClient } from '@prisma/client';
import { handlePaymentSettled, handlePaymentFailed } from './consumers/paymentSettledConsumer.js';

const prisma = new PrismaClient();

const registry = new Map([
  ['payment_settled', handlePaymentSettled],
  ['payment_failed', handlePaymentFailed]
]);

async function processNextBatch() {
  try {
    // 1. Atomically lock and fetch available events using PostgreSQL FOR UPDATE SKIP LOCKED
    // This allows multiple workers to run safely in parallel without overlapping work.
    const events = await prisma.$queryRaw`
      SELECT * FROM domain_event_outbox
      WHERE status = 'pending' AND available_at <= NOW()
      ORDER BY available_at ASC
      LIMIT 50
      FOR UPDATE SKIP LOCKED
    `;

    if (events.length === 0) return;

    await Promise.allSettled(events.map(async (event) => {
      // 2. Mark as processing immediately to release the row lock while we work
      await prisma.domainEventOutbox.update({
        where: { id: event.id },
        data: { status: 'processing' }
      });

      const consumer = registry.get(event.eventType);

      if (!consumer) {
        console.warn(`[Outbox] no consumer for eventType: ${event.eventType}. Marking as failed.`);
        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: { status: 'failed', lastError: 'No consumer registered' }
        });
        return;
      }

      try {
        await consumer(event);

        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: {
            status: 'processed',
            publishedAt: new Date()
          }
        });
      } catch (error) {
        const attempts = (event.attempts || 0) + 1;
        const status = attempts >= 5 ? 'failed' : 'pending';
        
        const backoffMs = Math.min((2 ** attempts) * 30000, 1800000); // 30 mins cap exponentially
        const nextAvailableAt = new Date(Date.now() + backoffMs);

        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: {
            attempts,
            status,
            availableAt: status === 'pending' ? nextAvailableAt : event.availableAt,
            lastError: error.message
          }
        });

        console.error(`[Outbox] Error processing event ${event.id}:`, error.message);
      }
    }));
  } catch (err) {
    console.error('[OutboxWorker] Error during batch processing cycle:', err.message);
  }
}

let intervalId = null;

export function start() {
  if (intervalId) return intervalId;
  console.log('[OutboxWorker] Starting native 5s interval polling worker...');
  intervalId = setInterval(processNextBatch, 5000);
  return intervalId;
}

export function stop(currentIntervalId) {
  const targetId = currentIntervalId || intervalId;
  if (targetId) {
    clearInterval(targetId);
    if (targetId === intervalId) {
       intervalId = null;
    }
    console.log('[OutboxWorker] Polling worker safely stopped.');
  }
}
