/**
 * Check appointment for patient 288
 */

import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function checkPatient288() {
  try {
    console.log('\n🔍 Checking Patient 288 and their appointments...\n');

    // 1. Check if patient 288 exists
    console.log('1️⃣ Checking Patient 288...');
    const patient = await prisma.user.findUnique({
      where: { id: BigInt(288) }
    });

    if (!patient) {
      console.log('❌ Patient with ID 288 not found!');
      return;
    }

    console.log('✅ Patient found:');
    console.log({
      id: patient.id.toString(),
      name: patient.name,
      email: patient.email,
      phone: patient.phone_number,
      role: patient.role
    });

    // 2. Check all appointments for patient 288
    console.log('\n2️⃣ Checking all appointments for patient 288...');
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: BigInt(288)
      },
      include: {
        dentist: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${appointments.length} appointments`);

    if (appointments.length === 0) {
      console.log('⚠️ No appointments found for patient 288!');
      console.log('\nLet me check with userId instead...');
      
      // Try with userId field
      const appointmentsAlt = await prisma.appointment.findMany({
        where: {
          userId: BigInt(288)
        },
        include: {
          dentist: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      console.log(`Found ${appointmentsAlt.length} appointments with userId=288`);
    } else {
      appointments.forEach((apt, idx) => {
        console.log(`\n  Appointment ${idx + 1}:`);
        console.log(`    - ID: ${apt.id.toString()}`);
        console.log(`    - Dentist: ${apt.dentist?.name || 'Unknown'} (ID: ${apt.dentistId?.toString() || 'N/A'})`);
        console.log(`    - Status: ${apt.status}`);
        console.log(`    - Date: ${apt.startsAt}`);
        console.log(`    - Created: ${apt.createdAt}`);
        console.log(`    - Has statusHistory: ${apt.statusHistory ? 'Yes' : 'No'}`);
        if (apt.statusHistory) {
          console.log(`    - Status history:`, JSON.stringify(apt.statusHistory, null, 2));
        }
      });

      // Check which dentists
      const dentistIds = [...new Set(appointments.map(a => a.dentistId?.toString()).filter(Boolean))];
      console.log(`\n  Unique dentist IDs: ${dentistIds.join(', ')}`);
    }

    // 3. Search all appointments with dentist 189
    console.log('\n3️⃣ Checking if there are ANY appointments with dentist 189...');
    const dentist189Apts = await prisma.appointment.findMany({
      where: {
        dentistId: BigInt(189)
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${dentist189Apts.length} appointments with dentist 189`);
    if (dentist189Apts.length > 0) {
      dentist189Apts.forEach((apt, idx) => {
        console.log(`  ${idx + 1}. Patient: ${apt.patient?.name} (ID: ${apt.patient?.id?.toString()})`);
      });
    }

    console.log('\n✅ Check completed!\n');

  } catch (error) {
    console.error('\n❌ Error during check:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPatient288();
