import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.clinicStaff.findMany({
    where: { clinicProfileId: 65n },
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

  console.log('--- Clinic 65 Staff Members ---');
  staff.forEach(s => {
    console.log({
      id: s.id.toString(),
      userId: s.userId.toString(),
      name: s.user?.name,
      role: s.role,
      isActive: s.isActive
    });
  });
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
