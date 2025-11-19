import { PrismaClient } from './generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdminUsers() {
  console.log('🔧 Creating admin users...');
  
  const adminUsers = [
    {
      name: 'Super Admin',
      email: 'admin@sereneai.com',
      roles: ['super_admin', 'admin'],
      phone_number: '+62812-3456-7890'
    },
    {
      name: 'Business Manager',
      email: 'business@sereneai.com', 
      roles: ['business_manager', 'admin'],
      phone_number: '+62812-3456-7891'
    },
    {
      name: 'Platform Manager',
      email: 'platform@sereneai.com',
      roles: ['platform_manager', 'admin'],
      phone_number: '+62812-3456-7892'
    },
    {
      name: 'Finance Manager',
      email: 'finance@sereneai.com',
      roles: ['finance_manager', 'admin'],
      phone_number: '+62812-3456-7893'
    },
    {
      name: 'Customer Success Manager',
      email: 'success@sereneai.com',
      roles: ['customer_success_manager', 'admin'],
      phone_number: '+62812-3456-7894'
    },
    {
      name: 'Technical Support',
      email: 'support@sereneai.com',
      roles: ['technical_support', 'admin'],
      phone_number: '+62812-3456-7895'
    },
    {
      name: 'AI Engineer',
      email: 'ai@sereneai.com',
      roles: ['ai_engineer', 'admin'],
      phone_number: '+62812-3456-7896'
    },
    {
      name: 'Compliance Officer',
      email: 'compliance@sereneai.com',
      roles: ['compliance_officer', 'admin'],
      phone_number: '+62812-3456-7897'
    }
  ];

  // If ADMIN_PASSWORD is provided via env, hash it and use it for newly-created users.
  // If not provided, do not set a password in the seed (safer for production).
  const adminPlain = process.env.ADMIN_PASSWORD;
  let hashedPassword = null;
  if (adminPlain) {
    hashedPassword = await bcrypt.hash(adminPlain, 10);
    console.log('🔒 Password hash created from ADMIN_PASSWORD env');
  } else {
    console.log('ℹ️  No ADMIN_PASSWORD env set — seed will not set passwords for new admin users');
  }

  for (const adminUser of adminUsers) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: adminUser.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${adminUser.email} already exists, updating roles...`);
        await prisma.user.update({
          where: { email: adminUser.email },
          data: {
            roles: adminUser.roles,
            name: adminUser.name,
            phone_number: adminUser.phone_number
          }
        });
        console.log(`✅ Updated user: ${adminUser.email}`);
      } else {
        await prisma.user.create({
          data: {
            name: adminUser.name,
            email: adminUser.email,
            // Only set password_hash if an ADMIN_PASSWORD was provided; otherwise leave NULL
            password_hash: hashedPassword || null,
            roles: adminUser.roles,
            phone_number: adminUser.phone_number
          }
        });
        console.log(`✅ Created user: ${adminUser.email}`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${adminUser.email}:`, error);
    }
  }

  console.log('🎉 Admin users setup completed!');
  console.log('📋 Login credentials:');
  console.log('   Email: admin@sereneai.com (or any other admin email)');
  console.log('   Password: admin123');
}

createAdminUsers()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });