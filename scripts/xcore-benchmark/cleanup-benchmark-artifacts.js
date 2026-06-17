import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const UPLOAD_DIR = path.resolve(path.join(__dirname, '../../backend/uploads/x-core'));

function getDirSizeBytes(dirPath) {
    if (!fs.existsSync(dirPath)) return 0n;
    let total = 0n;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += getDirSizeBytes(fullPath);
        } else {
            try {
                total += BigInt(fs.statSync(fullPath).size);
            } catch { /* skip */ }
        }
    }
    return total;
}

async function run() {
    const targetRunId = process.argv[2];
    console.log(`[Cleanup] Starting sweep of benchmark studies...`);
    if (targetRunId) {
        console.log(`[Cleanup] Target Run ID Filter: ${targetRunId}`);
    }

    try {
        // Fetch all studies to check metadata programmatically (database dialect independent)
        const allStudies = await prisma.imagingStudy.findMany({
            include: { dentist: { include: { dentistProfile: true } } }
        });

        const benchmarkStudies = allStudies.filter(study => {
            const meta = study.metadata || {};
            if (meta.is_benchmark !== true) return false;
            if (targetRunId && meta.benchmark_run_id !== targetRunId) return false;
            return true;
        });

        console.log(`[Cleanup] Found ${benchmarkStudies.length} benchmark studies matching criteria.`);

        let totalReclaimedBytes = 0n;

        for (const study of benchmarkStudies) {
            const studyId = study.id;
            const meta = study.metadata || {};
            const runId = meta.benchmark_run_id;
            const iteration = meta.benchmark_iteration;
            console.log(`[Cleanup] Processing Study ID: ${studyId} (Run: ${runId}, Iteration: ${iteration})`);

            // Calculate disk size
            let actualDiskSize = study.sizeInBytes || 0n;
            let studyDir = null;
            if (study.folderName) {
                studyDir = path.join(UPLOAD_DIR, study.folderName);
                const diskSize = getDirSizeBytes(studyDir);
                if (diskSize > 0n) {
                    actualDiskSize = diskSize;
                }
            }

            totalReclaimedBytes += actualDiskSize;

            // Database Deletion Transaction
            await prisma.$transaction(async (tx) => {
                // Delete AI results
                const seriesIds = await tx.imagingSeries.findMany({
                    where: { studyId },
                    select: { id: true }
                });
                if (seriesIds.length > 0) {
                    await tx.aIResult.deleteMany({
                        where: { seriesId: { in: seriesIds.map(s => s.id) } }
                    });
                }

                // Delete Series
                await tx.imagingSeries.deleteMany({
                    where: { studyId }
                });

                // Delete Study
                await tx.imagingStudy.delete({
                    where: { id: studyId }
                });

                // Reclaim storage quota
                if (study.dentistId) {
                    const dentistProfile = await tx.dentistProfile.findFirst({
                        where: { userId: study.dentistId }
                    });

                    if (dentistProfile) {
                        const newUsage = (dentistProfile.storage_usage || 0n) - actualDiskSize;
                        await tx.dentistProfile.update({
                            where: { id: dentistProfile.id },
                            data: {
                                storage_usage: newUsage < 0n ? 0n : newUsage
                            }
                        });
                    }
                }
            });

            // Disk file deletion
            if (studyDir) {
                const resolvedPath = path.resolve(studyDir);
                if (resolvedPath.startsWith(UPLOAD_DIR) && resolvedPath !== UPLOAD_DIR) {
                    if (fs.existsSync(studyDir)) {
                        fs.rmSync(studyDir, { recursive: true, force: true });
                        console.log(`[Cleanup] Deleted folder recursively: ${studyDir}`);
                    }
                } else {
                    console.error(`[Cleanup] Safety violation blocked: Path outside uploads/x-core: ${studyDir}`);
                }
            }
        }

        console.log(`[Cleanup] Sweep completed.`);
        console.log(`[Cleanup] Total studies deleted: ${benchmarkStudies.length}`);
        console.log(`[Cleanup] Total disk space reclaimed: ${(Number(totalReclaimedBytes) / (1024 * 1024)).toFixed(2)} MB`);

    } catch (e) {
        console.error('[Cleanup] Error during sweep:', e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
