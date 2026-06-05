import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: true,
      dentist: true,
      clinicBranch: true
    }
  });

  console.log(`Found ${appointments.length} appointments in database:`);
  appointments.forEach(apt => {
    console.log({
      id: apt.id.toString(),
      patientName: apt.patient?.name,
      dentistName: apt.dentist?.name,
      startsAt: apt.startsAt,
      status: apt.status,
      clinicBranchId: apt.clinicBranchId?.toString(),
      ownerClinicId: apt.ownerClinicId?.toString()
    });
  });
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
