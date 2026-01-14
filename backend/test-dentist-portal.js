/**
 * Test script to verify dentist portal patient list functionality
 * Run: node test-dentist-portal.js
 */

import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function testDentistPortal() {
  try {
    console.log('\n🔍 Testing Dentist Portal Patient List...\n');

    // 1. Check if dentist 189 exists
    console.log('1️⃣ Checking Dentist 189...');
    const dentist = await prisma.user.findUnique({
      where: { id: BigInt(189) },
      include: {
        dentistProfile: true
      }
    });

    if (!dentist) {
      console.log('❌ Dentist with ID 189 not found!');
      return;
    }

    console.log('✅ Dentist found:');
    console.log({
      id: dentist.id.toString(),
      name: dentist.name,
      email: dentist.email,
      role: dentist.role,
      hasDentistProfile: !!dentist.dentistProfile
    });

    // 2. Check appointments for this dentist
    console.log('\n2️⃣ Checking appointments for dentist 189...');
    const appointments = await prisma.appointment.findMany({
      where: {
        dentistId: BigInt(189)
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true
          }
        }
      },
      orderBy: { startsAt: 'desc' }
    });

    console.log(`✅ Found ${appointments.length} appointments`);
    
    if (appointments.length > 0) {
      console.log('\nAppointment details:');
      appointments.forEach((apt, idx) => {
        console.log(`\n  Appointment ${idx + 1}:`);
        console.log(`    - ID: ${apt.id.toString()}`);
        console.log(`    - Patient: ${apt.patient?.name || 'Unknown'} (ID: ${apt.patient?.id?.toString() || 'N/A'})`);
        console.log(`    - Status: ${apt.status}`);
        console.log(`    - Date: ${apt.startsAt}`);
        console.log(`    - Has statusHistory: ${apt.statusHistory ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('⚠️ No appointments found for this dentist');
    }

    // 3. Check unique patients
    console.log('\n3️⃣ Analyzing unique patients...');
    const patientIds = [...new Set(appointments.map(a => a.patient?.id).filter(Boolean))];
    console.log(`✅ Found ${patientIds.length} unique patients`);

    if (patientIds.length > 0) {
      console.log('\nPatients:');
      const uniquePatients = appointments.reduce((acc, apt) => {
        if (apt.patient && !acc.find(p => p.id.toString() === apt.patient.id.toString())) {
          acc.push(apt.patient);
        }
        return acc;
      }, []);

      uniquePatients.forEach((patient, idx) => {
        const patientApts = appointments.filter(a => a.patient?.id?.toString() === patient.id.toString());
        console.log(`  ${idx + 1}. ${patient.name} (ID: ${patient.id.toString()})`);
        console.log(`     - Email: ${patient.email}`);
        console.log(`     - Phone: ${patient.phone_number}`);
        console.log(`     - Appointments: ${patientApts.length}`);
      });
    }

    // 4. Check AI analysis results for patients
    console.log('\n4️⃣ Checking AI analysis results...');
    if (patientIds.length > 0) {
      const aiResults = await prisma.aIAnalysisResult.findMany({
        where: {
          userId: { in: patientIds }
        }
      });
      console.log(`✅ Found ${aiResults.length} AI analysis results`);
    }

    // 5. Test the actual query logic
    console.log('\n5️⃣ Testing actual portal query logic...');
    const dentistId = BigInt(189);

    const testAppointments = await prisma.appointment.findMany({
      where: { dentistId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            avatar_url: true
          }
        }
      },
      orderBy: { startsAt: 'desc' }
    });

    const patientMap = new Map();
    for (const appointment of testAppointments) {
      if (!appointment.patient) continue;
      
      const patientId = appointment.patient.id.toString();
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          user: appointment.patient,
          appointments: []
        });
      }
      patientMap.get(patientId).appointments.push(appointment);
    }

    console.log(`✅ Query would return ${patientMap.size} patients`);

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testDentistPortal();
