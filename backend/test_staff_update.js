// Test script untuk debugging staff update
import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function testStaffUpdate() {
  try {
    console.log('🔍 Testing staff data before and after update...');
    
    // Get staff data before update
    const staffBefore = await prisma.clinicStaff.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true
          }
        }
      }
    });
    
    console.log('📋 Staff data BEFORE update:');
    staffBefore.forEach(staff => {
      console.log(`- ID: ${staff.id}, User: ${staff.user.name} (${staff.user.email}), Position: ${staff.positionTitle}, Department: ${staff.department}`);
    });
    
    // Test update first staff member
    if (staffBefore.length > 0) {
      const testStaff = staffBefore[0];
      console.log(`\n🔄 Testing update for staff ID: ${testStaff.id}`);
      
      // Update clinic staff data
      await prisma.clinicStaff.update({
        where: { id: testStaff.id },
        data: {
          positionTitle: 'TEST POSITION UPDATE',
          department: 'TEST DEPARTMENT UPDATE',
          permissions: ['dashboard', 'test', 'update']
        }
      });
      
      // Update user data
      await prisma.user.update({
        where: { id: testStaff.userId },
        data: {
          name: 'TEST NAME UPDATE',
          phone_number: '+628888888888'
        }
      });
      
      console.log('✅ Update completed');
      
      // Get staff data after update
      const staffAfter = await prisma.clinicStaff.findUnique({
        where: { id: testStaff.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true
            }
          }
        }
      });
      
      console.log('\n📋 Staff data AFTER update:');
      console.log(`- ID: ${staffAfter.id}, User: ${staffAfter.user.name} (${staffAfter.user.email}), Position: ${staffAfter.positionTitle}, Department: ${staffAfter.department}, Permissions:`, staffAfter.permissions);
      
      // Revert changes
      console.log('\n🔄 Reverting changes...');
      await prisma.clinicStaff.update({
        where: { id: testStaff.id },
        data: {
          positionTitle: testStaff.positionTitle,
          department: testStaff.department,
          permissions: testStaff.permissions
        }
      });
      
      await prisma.user.update({
        where: { id: testStaff.userId },
        data: {
          name: testStaff.user.name,
          phone_number: testStaff.user.phone_number
        }
      });
      
      console.log('✅ Changes reverted');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testStaffUpdate();