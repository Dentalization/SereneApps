/**
 * Update appointment to correct dentist
 */

import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function updateAppointment() {
  try {
    console.log('\n🔄 Updating appointment...\n');

    // Get dentist 189's userId by looking up their user record
    const dentist189 = await prisma.user.findUnique({
      where: { id: BigInt(189) }
    });

    if (!dentist189) {
      console.log('❌ Dentist 189 not found!');
      return;
    }

    console.log('✅ Dentist 189 found:', dentist189.name);

    // Get the existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: BigInt(1) },
      include: { dentist: true, patient: true }
    });

    if (!appointment) {
      console.log('❌ Appointment not found!');
      return;
    }

    console.log('\n📋 Current appointment:');
    console.log(`  - ID: ${appointment.id.toString()}`);
    console.log(`  - Patient: ${appointment.patient?.name} (ID: ${appointment.patientId?.toString()})`);
    console.log(`  - Current Dentist: ${appointment.dentist?.name} (ID: ${appointment.dentistId?.toString()})`);
    console.log(`  - Appointment Type: ${appointment.metadata?.appointmentType || 'unknown'}`);

    // Update appointment to dentist 189
    const updated = await prisma.appointment.update({
      where: { id: BigInt(1) },
      data: {
        dentistId: BigInt(189)
      },
      include: { dentist: true, patient: true }
    });

    console.log('\n✅ Appointment updated!');
    console.log(`  - ID: ${updated.id.toString()}`);
    console.log(`  - Patient: ${updated.patient?.name} (ID: ${updated.patientId?.toString()})`);
    console.log(`  - New Dentist: ${updated.dentist?.name} (ID: ${updated.dentistId?.toString()})`);

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAppointment();
