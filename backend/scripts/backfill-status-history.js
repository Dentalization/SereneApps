/**
 * Backfill script: Create AppointmentStatusHistory for existing appointments
 * that have a non-scheduled status but no history records.
 * 
 * Run with: node scripts/backfill-status-history.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function backfill() {
    console.log('🔄 Starting AppointmentStatusHistory backfill...\n');

    // Find all appointments
    const appointments = await prisma.appointment.findMany({
        select: {
            id: true,
            status: true,
            startsAt: true,
            createdAt: true,
            updatedAt: true,
            patientId: true,
            cancellationReason: true,
        },
        orderBy: { id: 'asc' },
    });

    console.log(`📋 Found ${appointments.length} total appointments`);

    let created = 0;
    let skipped = 0;

    for (const apt of appointments) {
        // Check if this appointment already has status history
        const existingHistory = await prisma.appointmentStatusHistory.findFirst({
            where: { appointmentId: apt.id },
            select: { id: true },
        });

        if (existingHistory) {
            skipped++;
            continue;
        }

        // Create initial "scheduled" history entry (all appointments start as scheduled)
        try {
            await prisma.appointmentStatusHistory.create({
                data: {
                    appointmentId: apt.id,
                    previousStatus: null,
                    newStatus: 'scheduled',
                    changedBy: apt.patientId,
                    changedByRole: 'patient',
                    reason: 'appointment_created (backfill)',
                    notes: null,
                    metadata: { backfill: true, originalCreatedAt: apt.createdAt.toISOString() },
                },
            });
            created++;

            // If current status is NOT scheduled, create a second entry for the transition
            if (apt.status !== 'scheduled') {
                let reason = 'backfill';
                let changedByRole = 'system';

                if (apt.status === 'cancelled') {
                    reason = apt.cancellationReason || 'patient_cancelled (backfill)';
                    changedByRole = 'patient';
                } else if (apt.status === 'overdue') {
                    reason = 'Auto-marked overdue (backfill)';
                    changedByRole = 'system';
                } else if (apt.status === 'completed') {
                    reason = 'Completed (backfill)';
                    changedByRole = 'dentist';
                }

                await prisma.appointmentStatusHistory.create({
                    data: {
                        appointmentId: apt.id,
                        previousStatus: 'scheduled',
                        newStatus: apt.status,
                        changedBy: null,
                        changedByRole,
                        reason,
                        notes: null,
                        metadata: { backfill: true, originalUpdatedAt: apt.updatedAt.toISOString() },
                    },
                });
                created++;
                console.log(`  ✅ Appointment ${apt.id}: scheduled → ${apt.status}`);
            } else {
                console.log(`  ✅ Appointment ${apt.id}: scheduled (initial)`);
            }
        } catch (err) {
            console.error(`  ❌ Appointment ${apt.id}: ${err.message}`);
        }
    }

    console.log(`\n🏁 Backfill complete!`);
    console.log(`   Created: ${created} history records`);
    console.log(`   Skipped: ${skipped} appointments (already had history)`);
}

backfill()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
