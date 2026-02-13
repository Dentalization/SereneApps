import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log("=== X-Core Diagnostic Start ===");

    try {
        // 1. List Users
        const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, roles: true } });
        console.log(`\nFound ${users.length} Users:`);
        users.forEach(u => console.log(` - [${u.id}] ${u.email} (${u.roles})`));

        // 2. List DentistProfiles
        const profiles = await prisma.dentistProfile.findMany();
        console.log(`\nFound ${profiles.length} DentistProfiles:`);
        profiles.forEach(p => console.log(` - Profile ID: ${p.id} | User ID: ${p.userId} | Storage: ${p.storage_usage}/${p.storage_limit}`));

        // 3. List ImagingStudies
        const studies = await prisma.imagingStudy.findMany();
        console.log(`\nFound ${studies.length} ImagingStudies:`);
        studies.forEach(s => console.log(` - Study ID: ${s.id} | Patient: ${s.patientName || 'N/A'} | Dentist ID: ${s.dentistId} | Size: ${s.sizeInBytes}`));

        console.log("\n=== Diagnosis Complete ===");
    } catch (e) {
        console.error("Diagnosis Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
