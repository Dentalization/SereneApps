/**
 * Backfill script to complete overdue appointments.
 * Sets status to 'completed', updates status history, and marks associated invoices/payments as paid.
 * 
 * Run with: node scripts/complete-overdue.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function completeOverdue() {
    console.log('🔄 Fetching and completing overdue appointments...\n');

    // Find all overdue appointments
    const appointments = await prisma.appointment.findMany({
        where: { status: 'overdue' },
        include: {
            invoices: true,
            paymentIntents: true
        }
    });

    console.log(`Found ${appointments.length} overdue appointments to complete.\n`);

    let updated = 0;
    for (const apt of appointments) {
        try {
            await prisma.$transaction(async (tx) => {
                // Update appointment status to completed
                await tx.appointment.update({
                    where: { id: apt.id },
                    data: { status: 'completed' }
                });

                // Record status change in AppointmentStatusHistory
                await tx.appointmentStatusHistory.create({
                    data: {
                        appointmentId: apt.id,
                        previousStatus: 'overdue',
                        newStatus: 'completed',
                        changedBy: null,
                        changedByRole: 'system',
                        reason: 'Converted from overdue to completed via backfill script (auto-approve simulation logic)',
                        metadata: { script: 'complete-overdue.js' }
                    }
                });

                // Check and update corresponding invoices
                for (const invoice of apt.invoices) {
                    if (invoice.status !== 'paid') {
                        await tx.invoice.update({
                            where: { id: invoice.id },
                            data: {
                                status: 'paid',
                                paidAt: new Date()
                            }
                        });
                        console.log(`  📄 Updated Invoice ${invoice.id} to paid`);
                    }
                }

                // Check and update corresponding paymentIntents
                for (const intent of apt.paymentIntents) {
                    if (intent.status !== 'succeeded') {
                        await tx.paymentIntent.update({
                            where: { id: intent.id },
                            data: {
                                status: 'succeeded',
                                providerResponse: { payment_mode: 'simulated', success: true }
                            }
                        });
                        console.log(`  💳 Updated PaymentIntent ${intent.id} to succeeded`);
                    }
                }
            });
            updated++;
            console.log(`✅ Completed Appointment ${apt.id}`);
        } catch (err) {
            console.error(`❌ Failed to complete Appointment ${apt.id}:`, err.message);
        }
    }

    console.log(`\n🏁 Done! Successfully completed ${updated} of ${appointments.length} overdue appointments.`);
}

completeOverdue()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
