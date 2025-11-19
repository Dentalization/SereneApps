import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debugStaffLoading() {
  try {
    console.log('🔍 Debug: Testing staff loading...');
    
    // First, check if we have any users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true
      }
    });
    console.log('👥 All users:', users);
    
    // Check clinic staff records
    const clinicStaff = await prisma.clinicStaff.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
            phone_number: true,
            createdAt: true,
            lastLoginAt: true
          }
        },
        clinicProfile: true
      }
    });
    console.log('🏥 All clinic staff:', clinicStaff);
    
    // Test the exact query from the GET /staff endpoint
    if (clinicStaff.length > 0) {
      const firstStaff = clinicStaff[0];
      const clinicId = firstStaff.clinicProfileId;
      
      console.log('🎯 Testing GET /staff query for clinic:', clinicId);
      
      const staffForClinic = await prisma.clinicStaff.findMany({
        where: { clinicProfileId: clinicId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar_url: true,
              phone_number: true,
              createdAt: true,
              lastLoginAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log('✅ Staff query result:', staffForClinic);
      
      // Test the data transformation
      const transformedStaff = staffForClinic.map(staff => ({
        id: staff.id.toString(),
        userId: staff.user.id.toString(),
        name: staff.user.name,
        email: staff.user.email,
        avatar: staff.user.avatar_url,
        role: staff.role,
        position: staff.positionTitle,
        department: staff.department,
        phone: staff.user.phone_number,
        status: staff.isActive ? 'active' : 'inactive',
        joinDate: staff.hireDate ? staff.hireDate.toISOString() : staff.createdAt?.toISOString(),
        lastLogin: staff.user.lastLoginAt ? staff.user.lastLoginAt.toISOString() : null,
        permissions: staff.permissions || []
      }));
      
      console.log('🔧 Transformed data:', transformedStaff);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStaffLoading();