/**
 * Backfill missing status transition records.
 * Finds appointments where current status differs from 'scheduled'
 * but no transition history record exists for that status change.
 * 
 * Run with: node scripts/backfill-missing-transitions.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function backfillMissing() {
    console.log('🔄 Backfilling missing status transitions...\n');

    const appointments = await prisma.appointment.findMany({
        where: { status: { notIn: ['scheduled'] } },
        select: { id: true, status: true, createdAt: true, updatedAt: true }
    });

    let created = 0;
    for (const apt of appointments) {
        const hasTransition = await prisma.appointmentStatusHistory.findFirst({
            where: { appointmentId: apt.id, newStatus: apt.status }
        });

        if (!hasTransition) {
            await prisma.appointmentStatusHistory.create({
                data: {
                    appointmentId: apt.id,
                    previousStatus: 'scheduled',
                    newStatus: apt.status,
                    changedBy: null,
                    changedByRole: apt.status === 'overdue' ? 'system' : 'patient',
                    reason: apt.status === 'overdue'
                        ? 'Auto-marked overdue (backfill)'
                        : apt.status + ' (backfill)',
                    metadata: { backfill: true, originalUpdatedAt: apt.updatedAt.toISOString() }
                }
            });
            created++;
            console.log(`  ✅ Appointment ${apt.id}: scheduled → ${apt.status} (backfilled)`);
        } else {
            console.log(`  ⏭️ Appointment ${apt.id}: already has ${apt.status} transition`);
        }
    }

    const total = await prisma.appointmentStatusHistory.count();
    console.log(`\n🏁 Done! Created ${created} missing transitions`);
    console.log(`📊 Total AppointmentStatusHistory records now: ${total}`);
}

backfillMissing()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
