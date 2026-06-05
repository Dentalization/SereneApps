import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all clinic staff
  const staff = await prisma.clinicStaff.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          roles: true
        }
      }
    }
  });

  console.log('--- Clinic Staff ---');
  staff.forEach(s => {
    console.log({
      id: s.id.toString(),
      userId: s.userId.toString(),
      name: s.user?.name,
      role: s.role,
      isActive: s.isActive,
      clinicProfileId: s.clinicProfileId?.toString()
    });
  });

  // Find all dentist profiles
  const dentistProfiles = await prisma.dentistProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  console.log('\n--- Dentist Profiles ---');
  dentistProfiles.forEach(dp => {
    console.log({
      id: dp.id.toString(),
      userId: dp.userId.toString(),
      name: dp.user?.name,
      clinicId: dp.clinic_id?.toString() || dp.clinicId?.toString()
    });
  });
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
