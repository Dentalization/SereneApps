import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log("=== X-Core Cleanup Start ===");

    try {
        const result = await prisma.imagingStudy.deleteMany({
            where: {
                dentistId: null
            }
        });
        console.log(`Deleted ${result.count} orphan studies.`);
    } catch (e) {
        console.error("Cleanup Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
