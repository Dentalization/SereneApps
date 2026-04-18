import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Adding video_room_sid to appointments...");
    await prisma.$executeRawUnsafe(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS video_room_sid TEXT`);
    console.log("Successfully added video_room_sid column!");
  } catch (err) {
    console.error("Error updating DB:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
