import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const staff = await prisma.clinicStaff.findMany({
      include: {
        user: true,
        clinicProfile: true
      }
    });
    
    console.log('--- CLINIC STAFF ---');
    staff.forEach(s => {
      console.log(`User ID: ${s.userId}, Name: ${s.user.name}, Email: ${s.user.email}, Clinic: ${s.clinicProfile.legalName}, Role: ${s.role}, Active: ${s.isActive}`);
    });
    
    const dentists = await prisma.dentistProfile.findMany({
      include: {
        user: true
      }
    });
    console.log('\n--- DENTIST PROFILES ---');
    dentists.forEach(d => {
      console.log(`User ID: ${d.userId}, Name: ${d.user.name}, Email: ${d.user.email}, Specialization: ${d.primarySpecialization}, Verified: ${d.isVerified}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
