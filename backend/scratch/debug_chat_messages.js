import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.chatMessage.findMany({
    where: { chatRoomId: 9 },
    orderBy: { createdAt: 'asc' }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`Current Time (Metadata): 2026-05-23T20:12:59+07:00`);
  console.log(`Node Server Time: ${new Date().toISOString()}`);
  console.log(`Midnight Today: ${today.toISOString()}`);

  messages.forEach((msg) => {
    const dateObj = new Date(msg.createdAt);
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / 86400000);
    
    console.log(`Msg ID: ${msg.id}`);
    console.log(`  Content: ${msg.message}`);
    console.log(`  createdAt raw: ${msg.createdAt}`);
    console.log(`  createdAt Date: ${dateObj.toISOString()}`);
    console.log(`  diffDays: ${diffDays}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
