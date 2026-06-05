import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- FINDING APPOINTMENTS ---');
  
  // Find by text "Nanah"
  const matchingNanah = await prisma.appointment.findMany({
    where: {
      OR: [
        { reason: { contains: 'Nanah', mode: 'insensitive' } },
        { notes: { contains: 'Nanah', mode: 'insensitive' } }
      ]
    },
    include: {
      patient: { select: { id: true, name: true } },
      dentist: { select: { id: true, name: true } },
      invoices: true,
      paymentIntents: true
    }
  });

  console.log(`\nFound ${matchingNanah.length} appointments with 'Nanah':`);
  for (const a of matchingNanah) {
    console.log({
      id: a.id.toString(),
      patientName: a.patient?.name,
      dentistName: a.dentist?.name,
      reason: a.reason,
      startsAt: a.startsAt,
      status: a.status,
      invoices: a.invoices.map(i => ({ id: i.id.toString(), status: i.status })),
      paymentIntents: a.paymentIntents.map(p => ({ id: p.id.toString(), status: p.status }))
    });
  }

  // Find all current overdue
  const overdueApts = await prisma.appointment.findMany({
    where: { status: 'overdue' },
    include: {
      patient: { select: { id: true, name: true } },
      dentist: { select: { id: true, name: true } },
      invoices: true,
      paymentIntents: true
    }
  });

  console.log(`\nFound ${overdueApts.length} currently 'overdue' appointments:`);
  for (const a of overdueApts) {
    console.log({
      id: a.id.toString(),
      patientName: a.patient?.name,
      dentistName: a.dentist?.name,
      reason: a.reason,
      startsAt: a.startsAt,
      status: a.status,
      invoices: a.invoices.map(i => ({ id: i.id.toString(), status: i.status })),
      paymentIntents: a.paymentIntents.map(p => ({ id: p.id.toString(), status: p.status }))
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
