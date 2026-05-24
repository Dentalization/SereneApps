import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const appointments = await prisma.appointment.findMany({
    select: {
      id: true,
      startsAt: true,
      status: true,
      commStatus: true,
      chatRoom: {
        select: {
          id: true,
        }
      }
    }
  });
  console.log(JSON.stringify(appointments, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
      , 2));
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
