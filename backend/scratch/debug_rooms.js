import { PrismaClient } from '@prisma/client';
import { listChatRoomsForUser } from '../src/services/communications.js';

const prisma = new PrismaClient();

async function main() {
  const members = await prisma.chatRoomMember.findMany({
    select: {
      userId: true
    },
    take: 5
  });

  for (const m of members) {
    const userIdStr = m.userId.toString();
    console.log(`=== Rooms for User ID ${userIdStr} ===`);
    try {
      const rooms = await listChatRoomsForUser(userIdStr);
      console.log(JSON.stringify(rooms, null, 2));
    } catch (e) {
      console.error(e);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
