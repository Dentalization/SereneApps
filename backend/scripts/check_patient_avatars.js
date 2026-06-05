import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      roles: { has: 'patient' }
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar_url: true
    }
  });

  console.log(`Checking patient avatars (Total: ${users.length}):`);
  for (const u of users) {
    console.log({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
