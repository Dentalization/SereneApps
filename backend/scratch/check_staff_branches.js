import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.clinicStaff.findMany({
    where: { clinicProfileId: 65n }
  });

  console.log('--- Clinic 65 Staff Members with Branches ---');
  staff.forEach(s => {
    console.log({
      id: s.id.toString(),
      userId: s.userId.toString(),
      name: s.positionTitle || s.role,
      role: s.role,
      assignedBranchId: s.assignedBranchId?.toString(),
      clinicProfileId: s.clinicProfileId?.toString()
    });
  });
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
