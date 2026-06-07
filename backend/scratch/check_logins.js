import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkLogins() {
  try {
    const users = await prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      take: 10
    });
    console.log('--- RECENT LOGINS ---');
    users.forEach(u => {
      console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Roles: ${u.roles}, Last Login: ${u.lastLoginAt}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLogins();
