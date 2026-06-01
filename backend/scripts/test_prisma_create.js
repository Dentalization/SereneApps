import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/index.js';

async function main() {
  const prisma = new PrismaClient();
  try {
    const tempPassword = 'temp' + Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: 'Prisma Test User',
        email: `prisma-test-${Date.now()}@example.com`,
        password_hash: hashed,
        roles: ['owner'],
        phone_number: '081234567890'
      }
    });

    console.log('✅ Prisma test user created:', { id: user.id.toString(), email: user.email });
    console.log('Temporary password (for test):', tempPassword);
  } catch (err) {
    console.error('❌ Prisma test failed:', err);
    process.exitCode = 2;
  } finally {
    try { await prisma.$disconnect(); } catch (e) { }
  }
}

main();
