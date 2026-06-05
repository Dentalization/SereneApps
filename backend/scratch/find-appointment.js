import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apt = await prisma.appointment.findUnique({
    where: { id: 264n },
    include: {
      patient: true,
      dentist: {
        include: {
          dentistProfile: true
        }
      },
      clinicBranch: true
    }
  });

  console.log('--- Appointment 264 details ---');
  console.log(JSON.stringify(apt, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
