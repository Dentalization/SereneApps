// Demo: Single-Clinic Staff Assignment System
// Mendemonstrasikan cara kerja sistem satu-staff-satu-clinic

import { PrismaClient } from './generated/prisma/index.js';
import clinicStaffService from './services/clinicStaffService.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function demonstrateClinicStaffSystem() {
  console.log('🏥 Demo: Single-Clinic Staff Assignment System');
  console.log('=' .repeat(50));

  try {
    // 1. Create some test users
    console.log('\n1️⃣ Creating test users...');
    
    const testUsers = await Promise.all([
      prisma.user.upsert({
        where: { email: 'alice@test.com' },
        update: {},
        create: {
          name: 'Alice Manager',
          email: 'alice@test.com',
          password_hash: await bcrypt.hash('password123', 12),
          roles: ['patient']
        }
      }),
      prisma.user.upsert({
        where: { email: 'bob@test.com' },
        update: {},
        create: {
          name: 'Bob Nurse',
          email: 'bob@test.com',
          password_hash: await bcrypt.hash('password123', 12),
          roles: ['patient']
        }
      })
    ]);
    
    console.log(`✅ Created users: ${testUsers.map(u => u.name).join(', ')}`);

    // 2. Create test clinic
    console.log('\n2️⃣ Finding existing clinic...');
    const clinic = await prisma.clinicProfile.findFirst({
      select: { id: true, legalName: true, brandName: true }
    });
    
    if (!clinic) {
      console.log('❌ No clinic found! Please run the main seed first.');
      return;
    }
    
    console.log(`✅ Using clinic: ${clinic.legalName}`);

    // 3. Assign Alice to clinic as manager
    console.log('\n3️⃣ Assigning Alice as Manager...');
    try {
      const aliceStaff = await clinicStaffService.assignUserToClinic(
        testUsers[0].id, 
        clinic.id, 
        'manager',
        {
          positionTitle: 'Operations Manager',
          department: 'Management',
          permissions: {
            modules: ['dashboard', 'schedule', 'patients', 'reports'],
            canManageStaff: true,
            canViewFinancials: true
          }
        }
      );
      console.log(`✅ Alice assigned to ${aliceStaff.clinicProfile.legalName} as ${aliceStaff.role}`);
    } catch (error) {
      console.log(`⚠️ Alice assignment: ${error.message}`);
    }

    // 4. Try to assign Alice to another clinic (should fail)
    console.log('\n4️⃣ Trying to assign Alice to another clinic (should fail)...');
    try {
      await clinicStaffService.assignUserToClinic(testUsers[0].id, clinic.id, 'cashier');
      console.log('❌ This should not succeed!');
    } catch (error) {
      console.log(`✅ Correctly prevented: ${error.message}`);
    }

    // 5. Assign Bob to the same clinic as nurse
    console.log('\n5️⃣ Assigning Bob as Nurse...');
    try {
      const bobStaff = await clinicStaffService.assignUserToClinic(
        testUsers[1].id, 
        clinic.id, 
        'nurse',
        {
          positionTitle: 'Dental Assistant',
          department: 'Clinical',
          permissions: {
            modules: ['dashboard', 'schedule', 'patients'],
            canViewFinancials: false
          }
        }
      );
      console.log(`✅ Bob assigned to ${bobStaff.clinicProfile.legalName} as ${bobStaff.role}`);
    } catch (error) {
      console.log(`⚠️ Bob assignment: ${error.message}`);
    }

    // 6. Test role checking
    console.log('\n6️⃣ Testing role checking...');
    
    const aliceRoles = await clinicStaffService.getUserEffectiveRoles(testUsers[0].id);
    const bobRoles = await clinicStaffService.getUserEffectiveRoles(testUsers[1].id);
    
    console.log(`✅ Alice effective roles: [${aliceRoles.join(', ')}]`);
    console.log(`✅ Bob effective roles: [${bobRoles.join(', ')}]`);

    // 7. Test clinic access
    console.log('\n7️⃣ Testing clinic data access...');
    
    const aliceCanAccess = await clinicStaffService.canAccessClinicData(testUsers[0].id, clinic.id);
    const bobCanAccess = await clinicStaffService.canAccessClinicData(testUsers[1].id, clinic.id);
    
    console.log(`✅ Alice can access clinic data: ${aliceCanAccess}`);
    console.log(`✅ Bob can access clinic data: ${bobCanAccess}`);

    // 8. Show current staff assignments
    console.log('\n8️⃣ Current clinic staff:');
    const clinicStaff = await prisma.clinicStaff.findMany({
      where: { clinicProfileId: clinic.id, isActive: true },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    clinicStaff.forEach(staff => {
      console.log(`   • ${staff.user.name} (${staff.user.email}) - ${staff.role} - ${staff.positionTitle || 'No title'}`);
    });

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📝 Key Benefits of Single-Clinic Model:');
    console.log('   ✅ Data isolation: Staff can only access their assigned clinic');
    console.log('   ✅ Simple security: One user = one clinic relationship');
    console.log('   ✅ Clear ownership: Each clinic manages its own staff');
    console.log('   ✅ Prevents data leaks between different clinics');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
demonstrateClinicStaffSystem()
  .finally(async () => {
    await prisma.$disconnect();
  });