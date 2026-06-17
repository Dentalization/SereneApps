import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function run() {
  const email = 'dentist1@test.com';
  const password = 'password';

  try {
    console.log(`Checking if dentist ${email} exists...`);
    let user = await prisma.user.findUnique({
      where: { email }
    });

    const hash = await bcrypt.hash(password, 10);

    if (!user) {
      console.log(`Creating new dentist user: ${email}`);
      user = await prisma.user.create({
        data: {
          name: 'Benchmark Dentist',
          email: email,
          password_hash: hash,
          roles: ['dentist']
        }
      });
    } else {
      console.log(`Dentist user ${email} already exists. Updating password...`);
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password_hash: hash,
          roles: ['dentist']
        }
      });
    }

    // Check or create dentist profile
    let profile = await prisma.dentistProfile.findFirst({
      where: { userId: user.id }
    });

    if (!profile) {
      console.log(`Creating dentist profile for user ID: ${user.id}`);
      profile = await prisma.dentistProfile.create({
        data: {
          userId: user.id,
          title: 'Drg.',
          licenseNumber: 'BENCHMARK-LIC-001',
          licenseIssuingBody: 'KKI',
          licenseExpiryDate: new Date('2030-12-31'),
          registrationNumber: 'BENCHMARK-REG-001',
          primarySpecialization: 'General Dentist',
          educationQualification: 'Dentistry',
          yearsOfExperience: 5,
          clinicName: 'Benchmark Clinic',
          clinicAddress: 'Jl. Benchmark No. 1',
          clinicWorkingHours: '{}',
          isVerified: true
        }
      });
    } else {
      console.log(`Updating dentist profile to isVerified=true for user ID: ${user.id}`);
      profile = await prisma.dentistProfile.update({
        where: { id: profile.id },
        data: {
          isVerified: true
        }
      });
    }

    console.log(`Dentist ${email} is verified and ready for benchmark!`);
  } catch (error) {
    console.error('Error verifying/creating dentist:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
