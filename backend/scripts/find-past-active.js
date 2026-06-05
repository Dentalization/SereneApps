import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  
  // Find appointments in the past that are scheduled/confirmed
  const pastActive = await prisma.appointment.findMany({
    where: {
      status: { in: ['scheduled', 'confirmed'] },
      startsAt: { lt: now }
    },
    include: {
      patient: { select: { id: true, name: true } },
      paymentIntents: true
    }
  });

  console.log(`Found ${pastActive.length} past active (scheduled/confirmed) appointments:`);
  for (const a of pastActive) {
    console.log({
      id: a.id.toString(),
      patientName: a.patient?.name,
      reason: a.reason,
      startsAt: a.startsAt,
      status: a.status,
      paymentIntents: a.paymentIntents.map(p => ({ id: p.id.toString(), status: p.status }))
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
