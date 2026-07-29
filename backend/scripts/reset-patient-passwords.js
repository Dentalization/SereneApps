/**
 * Script: reset-patient-passwords.js
 * Reset password semua user dengan role "patient" atau "patientProfile" menjadi "Password123"
 *
 * Usage:
 *   node scripts/reset-patient-passwords.js
 *   node scripts/reset-patient-passwords.js --dry-run   (preview only, no changes)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const NEW_PASSWORD = 'Password123';
const SALT_ROUNDS = 10;
const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('🔐 Reset Patient Passwords');
  console.log('==========================');
  if (isDryRun) {
    console.log('⚠️  DRY RUN — no changes will be made\n');
  }

  // Find all users with role patient or patientProfile
  const users = await prisma.user.findMany({
    where: {
      roles: {
        hasSome: ['patient', 'patientProfile'],
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      roles: true,
    },
    orderBy: { id: 'asc' },
  });

  if (users.length === 0) {
    console.log('✅ No patient users found.');
    return;
  }

  console.log(`Found ${users.length} patient user(s):\n`);
  users.forEach((u) => {
    console.log(`  [${u.id}] ${u.email || u.username || '(no email)'} — roles: ${u.roles.join(', ')}`);
  });

  if (isDryRun) {
    console.log('\n⚠️  Dry run complete. Run without --dry-run to apply changes.');
    return;
  }

  console.log(`\n🔒 Hashing new password...`);
  const newHash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

  console.log(`🔄 Updating ${users.length} user(s)...\n`);
  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: newHash },
      });
      console.log(`  ✅ [${user.id}] ${user.email || user.username}`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ [${user.id}] ${user.email || user.username} — ${err.message}`);
      failCount++;
    }
  }

  console.log('\n==========================');
  console.log(`✅ Done: ${successCount} updated, ${failCount} failed`);
  console.log(`🔑 New password: ${NEW_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
