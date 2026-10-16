import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../../backend');
const require = createRequire(path.join(backendDir, 'dummy.js'));

const dotenv = require('dotenv');
dotenv.config({ path: path.join(backendDir, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const UPLOAD_DIR = path.resolve(backendDir, 'uploads/x-core');
const TEMP_DIR = path.resolve(backendDir, 'uploads/temp');

const RESET_STATEMENTS = [
    'DELETE FROM xcore_analysis_case_item_renders',
    'DELETE FROM xcore_analysis_case_items',
    'DELETE FROM xcore_analysis_reports',
    'DELETE FROM xcore_analysis_cases',
    'UPDATE specialist_cases SET xcore_study_id = NULL WHERE xcore_study_id IS NOT NULL',
    'DELETE FROM study_annotations',
    'DELETE FROM annotation_snapshots',
    'DELETE FROM study_shares',
    'DELETE FROM study_dentist_shares',
    'DELETE FROM imaging_study_patient_assignments',
    'DELETE FROM ai_results',
    'DELETE FROM imaging_series',
    'DELETE FROM imaging_studies',
    'UPDATE dentist_profiles SET storage_usage = 0'
];

export async function resetDatabaseAndArtifacts() {
    console.log('[Reset] Resetting database state and uploaded artifacts...');
    try {
        await prisma.$transaction(async (tx) => {
            for (const sql of RESET_STATEMENTS) {
                await tx.$executeRawUnsafe(sql);
            }
        });
        console.log('[Reset] Database records reset successfully.');

        // Clean up uploads directory
        if (fs.existsSync(UPLOAD_DIR)) {
            const entries = fs.readdirSync(UPLOAD_DIR, { withFileTypes: true });
            let deletedFolders = 0;
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    // Only delete study directories (numeric timestamps or study_ prefix)
                    if (/^\d+$/.test(entry.name) || entry.name.startsWith('study_')) {
                        fs.rmSync(path.join(UPLOAD_DIR, entry.name), { recursive: true, force: true });
                        deletedFolders++;
                    }
                }
            }
            console.log(`[Reset] Cleaned up ${deletedFolders} study folder(s) in uploads/x-core.`);
        }

        // Clean up uploads/temp directory
        if (fs.existsSync(TEMP_DIR)) {
            const tempFiles = fs.readdirSync(TEMP_DIR);
            let deletedTemp = 0;
            for (const file of tempFiles) {
                if (file !== '.gitkeep' && file !== '.DS_Store') {
                    try {
                        fs.unlinkSync(path.join(TEMP_DIR, file));
                        deletedTemp++;
                    } catch (_) {}
                }
            }
            console.log(`[Reset] Cleaned up ${deletedTemp} staging file(s) in uploads/temp.`);
        }
        console.log('[Reset] Reset completed successfully.');
    } catch (err) {
        console.error('[Reset] Error during reset:', err.message);
        throw err;
    } finally {
        await prisma.$disconnect();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    resetDatabaseAndArtifacts().catch(() => process.exit(1));
}
