import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function debugStaff() {
  try {
    console.log('🔍 Debugging staff API issue...');
    
    // Test 1: Check if user 4 exists
    const user = await prisma.user.findUnique({
      where: { id: BigInt(4) }
    });
    console.log('👤 User 4:', user ? `${user.name} (${user.email})` : 'NOT FOUND');
    
    // Test 2: Check clinic staff record for user 4
    const clinicStaff = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(4) },
      include: { 
        clinicProfile: true,
        user: true 
      }
    });
    console.log('🏥 Clinic staff record for user 4:', clinicStaff ? 'FOUND' : 'NOT FOUND');
    if (clinicStaff) {
      console.log('   - Role:', clinicStaff.role);
      console.log('   - Clinic:', clinicStaff.clinicProfile.legalName);
      console.log('   - Active:', clinicStaff.isActive);
    }
    
    // Test 3: Get all staff for the clinic
    if (clinicStaff) {
      const allStaff = await prisma.clinicStaff.findMany({
        where: { clinicProfileId: clinicStaff.clinicProfileId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar_url: true,
              phone_number: true,
              createdAt: true,
              last_login_at: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log('👥 All staff for clinic:', allStaff.length, 'members');
      allStaff.forEach((staff, i) => {
        console.log(`   ${i+1}. ${staff.user.name} (${staff.user.email}) - ${staff.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStaff();