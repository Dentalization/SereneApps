import { PrismaClient } from '../src/generated/prisma/index.js';
import { clinicStudyScopeWhere } from '../src/services/xCoreAccessPolicyService.js';

const prisma = new PrismaClient();

async function test() {
  try {
    const clinicProfileId = BigInt(65);
    console.log('Testing query for clinicProfileId:', clinicProfileId);
    
    const studies = await prisma.imagingStudy.findMany({
      where: clinicStudyScopeWhere(clinicProfileId),
      include: {
        patient: { select: { name: true, phone_number: true } },
        series: true,
        dentist: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log(`✅ Success! Found ${studies.length} studies.`);
  } catch (e) {
    console.error('❌ Query failed:', e);
  }
}

test().finally(() => prisma.$disconnect());
