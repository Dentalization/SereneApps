import { PrismaClient } from '@prisma/client';
import { handlePaymentSettled, handlePaymentFailed } from './consumers/paymentSettledConsumer.js';

const prisma = new PrismaClient();

const registry = new Map([
  ['payment_settled', handlePaymentSettled],
  ['payment_failed', handlePaymentFailed]
]);

async function processNextBatch() {
  try {
    const events = await prisma.domainEventOutbox.findMany({
      where: {
        status: 'pending',
        availableAt: { lte: new Date() }
      },
      orderBy: { availableAt: 'asc' },
      take: 10
    });

    if (events.length === 0) return;

    await Promise.allSettled(events.map(async (event) => {
      // Row level 'processing' status pseudo-lock handling overlapping worker triggers securely using native DB atomics
      const lockedEvent = await prisma.domainEventOutbox.updateMany({
        where: {
          id: event.id,
          status: 'pending' // Only intercepts strictly untouched structures
        },
        data: {
          status: 'processing'
        }
      });

      if (lockedEvent.count === 0) {
        // Skips execution natively if another concurrent container already tagged the pending payload asynchronously.
        return;
      }

      const consumer = registry.get(event.eventType);

      if (!consumer) {
        console.warn(`[Outbox] no consumer for eventType: ${event.eventType}. Marking as failed.`);
        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: { status: 'failed' }
        });
        return;
      }

      try {
        await consumer(event);

        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: {
            status: 'processed',
            processedAt: new Date()
          }
        });
      } catch (error) {
        const attempts = event.attempts + 1;
        const status = attempts >= 5 ? 'failed' : 'pending';
        
        const backoffMs = Math.min((2 ** attempts) * 30000, 1800000); // 30 mins cap exponentially
        const nextAvailableAt = new Date(Date.now() + backoffMs);

        await prisma.domainEventOutbox.update({
          where: { id: event.id },
          data: {
            attempts,
            status,
            availableAt: status === 'pending' ? nextAvailableAt : event.availableAt
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
