import { PrismaClient } from '../src/generated/prisma/index.js';
import { getClinicXCoreContext } from '../src/services/xCoreAccessPolicyService.js';

const prisma = new PrismaClient();

async function test() {
  try {
    const s = await prisma.clinicStaff.findUnique({
      where: { userId: BigInt(726) },
      include: { user: true }
    });
    if (!s) {
      console.log('❌ No clinic staff record for User 726!');
      return;
    }
    console.log(`Staff Record found - ID: ${s.id}, User ID: ${s.userId}, Name: ${s.user.name}, Role: ${s.role}, Active: ${s.isActive}, Clinic Profile ID: ${s.clinicProfileId}`);
    
    const context = await getClinicXCoreContext({ id: '726' });
    console.log('✅ getClinicXCoreContext succeeded:', context);
  } catch (e) {
    console.log('❌ getClinicXCoreContext failed:', e.status, e.message);
  }
}

test().finally(() => prisma.$disconnect());
