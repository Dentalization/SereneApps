// Setup Real Clinic Data
// Creates a real clinic profile and assigns existing users as staff

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function setupRealClinic() {
  console.log('🏥 Setting up real clinic staff assignments...');
  console.log('='.repeat(50));

  try {
    // 1. Find existing clinic
    console.log('\n1️⃣ Finding existing clinic...');

    const clinic = await prisma.clinicProfile.findFirst({
      select: { id: true, legalName: true, brandName: true }
    });

    if (!clinic) {
      console.log('❌ No clinic found! Please create a clinic first.');
      return;
    }

    console.log(`✅ Using clinic: ${clinic.legalName} (ID: ${clinic.id.toString()})`);

    // 2. Find existing users that should be clinic staff
    console.log('\n2️⃣ Finding existing users...');

    const existingUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'owner@clinictest.com',
            'manager@clinictest.com',
            'frontoffice@clinictest.com',
            'nurse@clinictest.com',
            'cashier@clinictest.com'
          ]
        }
      },
      select: { id: true, name: true, email: true, roles: true }
    });

    console.log(`✅ Found ${existingUsers.length} existing users`);
    existingUsers.forEach(user => {
      console.log(`   • ${user.name} (${user.email}) - Current roles: [${user.roles.join(', ')}]`);
    });

    // 3. Create clinic staff assignments
    console.log('\n3️⃣ Creating clinic staff assignments...');

    const staffAssignments = [
      {
        email: 'owner@clinictest.com',
        role: 'owner',
        position: 'Clinic Owner',
        department: 'Management',
        permissions: ['all']
      },
      {
        email: 'manager@clinictest.com',
        role: 'manager',
        position: 'Operations Manager',
        department: 'Management',
        permissions: ['dashboard', 'schedule', 'patients', 'billing', 'inventory', 'reports', 'settings']
      },
      {
        email: 'frontoffice@clinictest.com',
        role: 'front_office',
        position: 'Front Office Staff',
        department: 'Reception',
        permissions: ['dashboard', 'schedule', 'patients']
      },
      {
        email: 'nurse@clinictest.com',
        role: 'nurse',
        position: 'Dental Assistant',
        department: 'Clinical',
        permissions: ['dashboard', 'schedule', 'patients', 'inventory']
      },
      {
        email: 'cashier@clinictest.com',
        role: 'cashier',
        position: 'Cashier',
        department: 'Finance',
        permissions: ['dashboard', 'billing']
      }
    ];

    for (const assignment of staffAssignments) {
      const user = existingUsers.find(u => u.email === assignment.email);
      if (user) {
        try {
          // Remove any existing staff assignment for this user
          await prisma.clinicStaff.deleteMany({
            where: { userId: user.id }
          });

          // Create new assignment
          const staffRecord = await prisma.clinicStaff.create({
            data: {
              userId: user.id,
              clinicProfileId: clinic.id,
              role: assignment.role,
              positionTitle: assignment.position,
              department: assignment.department,
              permissions: assignment.permissions,
              isActive: true,
              hireDate: new Date()
            },
            include: {
              user: { select: { name: true, email: true } }
            }
          });

          console.log(`✅ Assigned ${staffRecord.user.name} as ${staffRecord.role}`);
        } catch (error) {
          console.log(`⚠️ Failed to assign ${user.name}: ${error.message}`);
        }
      } else {
        console.log(`⚠️ User not found: ${assignment.email}`);
      }
    }

    // 4. Show final clinic staff
    console.log('\n4️⃣ Final clinic staff roster:');
    const clinicStaff = await prisma.clinicStaff.findMany({
      where: {
        clinicProfileId: clinic.id,
        isActive: true
      },
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { role: 'asc' }
    });

    if (clinicStaff.length === 0) {
      console.log('   No staff assigned yet.');
    } else {
      clinicStaff.forEach(staff => {
        console.log(`   • ${staff.user.name} (${staff.user.email})`);
        console.log(`     Role: ${staff.role} | Position: ${staff.positionTitle || 'No title'}`);
        console.log(`     Department: ${staff.department || 'No department'} | Permissions: ${Array.isArray(staff.permissions) ? staff.permissions.join(', ') : 'No permissions'}`);
        console.log('');
      });
    }

    console.log('\n🎉 Real clinic setup completed!');
    console.log('\n📋 You can now login with these accounts:');
    console.log('• owner@clinictest.com (password: password123) - Full access');
    console.log('• manager@clinictest.com (password: password123) - Management access');
    console.log('• nurse@clinictest.com (password: password123) - Clinical access');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run the setup
setupRealClinic()
  .catch((e) => {
    console.error('❌ Setup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });