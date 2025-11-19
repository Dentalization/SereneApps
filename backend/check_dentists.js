import { PrismaClient } from './src/generated/prisma/index.js';
const prisma = new PrismaClient();

async function checkDentists() {
  try {
    console.log('=== Checking for dentist users ===');
    
    const dentistUsers = await prisma.user.findMany({
      where: {
        roles: {
          has: 'dentist'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        clinicStaff: true
      }
    });
    
    console.log('Found dentist users:', dentistUsers.length);
    
    dentistUsers.forEach(user => {
      console.log('Dentist:', {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        roles: user.roles,
        isInClinicStaff: !!user.clinicStaff
      });
    });
    
    const clinicStaff = await prisma.clinicStaff.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            roles: true
          }
        }
      }
    });
    
    console.log('\n=== Clinic staff members ===');
    console.log('Found clinic staff:', clinicStaff.length);
    
    clinicStaff.forEach(staff => {
      console.log('Staff:', {
        id: staff.id.toString(),
        userId: staff.userId.toString(),
        name: staff.user.name,
        email: staff.user.email,
        role: staff.role,
        userRoles: staff.user.roles
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDentists();