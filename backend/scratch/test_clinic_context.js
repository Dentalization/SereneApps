import { PrismaClient } from '../src/generated/prisma/index.js';
import { getClinicXCoreContext } from '../src/services/xCoreAccessPolicyService.js';

const prisma = new PrismaClient();

async function test() {
  const staff = await prisma.clinicStaff.findMany({
    include: { user: true }
  });
  for (const s of staff) {
    try {
      const context = await getClinicXCoreContext({ id: s.userId.toString() });
      console.log(`✅ Success for User ${s.userId} (${s.user.name}) - Staff Role: ${s.role}`);
    } catch (e) {
      console.log(`❌ Fail for User ${s.userId} (${s.user.name}) - Staff Role: ${s.role}: ${e.message}`);
    }
  }
}

test().finally(() => prisma.$disconnect());
