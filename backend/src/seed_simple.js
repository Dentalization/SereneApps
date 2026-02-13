import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create dentist test user
  const user = await prisma.user.upsert({
    where: { email: 'ahmad@sereneai.com' },
    update: {},
    create: {
      name: 'Dr. Ahmad Dental',
      email: 'ahmad@sereneai.com',
      password_hash: await bcrypt.hash('password123', 12),
      roles: ['dentist']
    }
  });

  console.log('✅ Created dentist user:', user.email);

  // Create dentist profile
  const dentistProfile = await prisma.dentistProfile.upsert({
    where: { licenseNumber: 'SIK.01234567/PDGI/2024' },
    update: {},
    create: {
      userId: user.id,
      title: 'Dr.',
      licenseNumber: 'SIK.01234567/PDGI/2024',
      licenseIssuingBody: 'PDGI Jakarta',
      licenseExpiryDate: new Date('2026-12-31'),
      registrationNumber: 'STR.KG.01.03.2.1234567',
      primarySpecialization: 'Ortodonti',
      educationQualification: 'S2 Ortodonti Universitas Indonesia',
      yearsOfExperience: 10,
      clinicName: 'SereneAI Dental Clinic',
      clinicAddress: 'Jl. Sudirman No. 123, Jakarta Pusat',
      clinicWorkingHours: 'Senin-Jumat: 09:00-17:00, Sabtu: 09:00-14:00',
      consultationTypes: ['consultation', 'scaling', 'filling', 'orthodontic'],
      servicesOffered: ['Konsultasi Umum', 'Scaling & Polishing', 'Tambal Gigi', 'Behel Gigi'],
      consultationFee: 250000,
      acceptsInsurance: true,
      acceptsBpjs: true,
      emergencyAvailability: false,
      isVerified: true,
      verificationDate: new Date()
    }
  });

  console.log('✅ Created dentist profile for:', user.name);

  // Create patient test user
  const patient = await prisma.user.upsert({
    where: { email: 'budi@example.com' },
    update: {},
    create: {
      name: 'Budi Pasien',
      email: 'budi@example.com',
      password_hash: await bcrypt.hash('password123', 12),
      roles: ['patient']
    }
  });

  console.log('✅ Created patient user:', patient.email);

  // Create clinic owner test user (will be assigned to clinic via ClinicStaff)
  const clinicOwner = await prisma.user.upsert({
    where: { email: 'owner@clinictest.com' },
    update: {},
    create: {
      name: 'Dr. Sarah Clinic Owner',
      email: 'owner@clinictest.com',
      password_hash: await bcrypt.hash('password123', 12),
      roles: ['patient'] // Base role, clinic role akan di ClinicStaff
    }
  });

  console.log('✅ Created clinic owner user:', clinicOwner.email);

  // Test creating additional staff users untuk different clinics
  const staff1 = await prisma.user.upsert({
    where: { email: 'manager@clinictest.com' },
    update: {},
    create: {
      name: 'Maria Manager',
      email: 'manager@clinictest.com',
      password_hash: await bcrypt.hash('password123', 12),
      roles: ['patient']
    }
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'nurse@clinictest.com' },
    update: {},
    create: {
      name: 'Siti Nurse',
      email: 'nurse@clinictest.com',
      password_hash: await bcrypt.hash('password123', 12),
      roles: ['patient']
    }
  });

  console.log('✅ Created additional staff users');

  console.log('🎉 Basic seeding completed!');
  console.log('\n📋 Test Accounts Created:');
  console.log('Dentist:', user.email, 'password: password123');
  console.log('Patient:', patient.email, 'password: password123');
  console.log('Clinic Owner:', clinicOwner.email, 'password: password123');
  console.log('Manager:', staff1.email, 'password: password123');
  console.log('Nurse:', staff2.email, 'password: password123');
  
  console.log('\n🏥 Note: Staff assignment to clinics should be done through ClinicStaff table');
  console.log('Use clinicStaffService.assignUserToClinic() to assign staff to specific clinics');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });