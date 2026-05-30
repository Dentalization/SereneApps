import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Adding check constraints...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE available_balances 
      DROP CONSTRAINT IF EXISTS check_non_negative_pending;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE available_balances 
      ADD CONSTRAINT check_non_negative_pending CHECK (pending_amount >= 0);
    `);
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE available_balances 
      DROP CONSTRAINT IF EXISTS check_reasonable_available;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE available_balances 
      ADD CONSTRAINT check_reasonable_available CHECK (available_amount >= -1000000000);
    `);
    
    console.log('Constraints successfully applied.');
  } catch (e) {
    console.error('Failed to apply constraints:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
