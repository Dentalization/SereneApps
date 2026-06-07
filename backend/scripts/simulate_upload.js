import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = "/Users/adrianhalim/SereneApps/Patient - 028.SL";
const UPLOAD_DIR = path.join(__dirname, '../uploads/x-core');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Recursive copy helper
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function main() {
    console.log("Starting simulated upload...");
    
    // Find first dentist
    const dentist = await prisma.user.findFirst({
        where: { roles: { has: 'dentist' } }
    });
    
    if (!dentist) {
        console.error("No dentist found in database");
        process.exit(1);
    }
    console.log(`Found dentist: ${dentist.name} (ID: ${dentist.id})`);

    // Find first patient
    const patient = await prisma.user.findFirst({
        where: { roles: { has: 'patient' } }
    });
    if (!patient) {
        console.error("No patient found in database");
        process.exit(1);
    }
    console.log(`Found patient: ${patient.name} (ID: ${patient.id})`);

    // Find dentist's profile to get clinic ID and storage info
    const dentistProfile = await prisma.dentistProfile.findFirst({
        where: { userId: dentist.id }
    });
    const clinicId = dentistProfile ? dentistProfile.clinic_id : null;
    console.log(`Clinic ID: ${clinicId}`);

    // Create unique batch folder name
    const batchId = "Patient-028.SL-Simulated-" + Date.now();
    const targetStudyDir = path.join(UPLOAD_DIR, batchId);
    
    console.log(`Copying files from ${SOURCE_DIR} to ${targetStudyDir}...`);
    copyDirSync(SOURCE_DIR, targetStudyDir);
    console.log("Copy complete.");

    // Run Python Parser
    const parserScript = path.join(__dirname, './parse_dental_study.py');
    console.log(`Running python script: python3 ${parserScript} ${targetStudyDir}`);
    const { stdout, stderr } = await execAsync(`python3 "${parserScript}" "${targetStudyDir}"`);
    if (stderr && !stderr.includes('user warning')) {
        console.error("Parser stderr:", stderr);
    }

    const parseResult = JSON.parse(stdout);
    if (parseResult.error) {
        console.error("Parser error:", parseResult.error);
        process.exit(1);
    }
    console.log("Parser stdout parsed successfully:", parseResult);

    // Calculate total size of directory
    function getDirSize(dir) {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        let total = 0n;
        for (let file of files) {
            let filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                total += getDirSize(filePath);
            } else {
                total += BigInt(fs.statSync(filePath).size);
            }
        }
        return total;
    }
    const totalSize = getDirSize(targetStudyDir);
    console.log(`Total upload size: ${totalSize} bytes`);

    // Insert database records
    const study = await prisma.imagingStudy.create({
        data: {
            patientId: patient.id,
            studyDate: parseResult.metadata.Date ? new Date(parseResult.metadata.Date) : new Date(),
            modality: parseResult.modality,
            folderName: batchId,
            originalName: "Patient - 028.SL",
            status: 'processed',
            metadata: parseResult.metadata,
            sizeInBytes: totalSize,
            dentistId: dentist.id,
            clinicId: clinicId || undefined
        }
    });
    console.log(`Database ImagingStudy record created: ID ${study.id}`);

    for (const s of parseResult.series) {
        const series = await prisma.imagingSeries.create({
            data: {
                studyId: study.id,
                modality: s.modality,
                sliceThickness: parseFloat(s.sliceThickness) || 1.0,
                pixelSpacing: s.pixelSpacing,
                kv: s.kv ? parseFloat(s.kv) : null,
                ma: s.ma ? parseFloat(s.ma) : null,
                numSlices: s.numSlices,
                folderPath: targetStudyDir
            }
        });
        console.log(`Database ImagingSeries record created: ID ${series.id} (Modality: ${series.modality})`);
    }

    // Update dentist storage usage
    if (dentistProfile) {
        await prisma.dentistProfile.update({
            where: { id: dentistProfile.id },
            data: {
                storage_usage: { increment: totalSize }
            }
        });
        console.log("Updated dentist profile storage usage.");
    }

    // Trigger Python conversion service
    const pyServiceUrl = `http://127.0.0.1:8000/convert/${batchId}`;
    console.log(`Triggering conversion service at ${pyServiceUrl}...`);
    try {
        const response = await fetch(pyServiceUrl, { method: 'POST' });
        const resJson = await response.json();
        console.log("Conversion response:", resJson);
    } catch (e) {
        console.error("Failed to trigger conversion service:", e.message);
    }

    console.log("Simulated upload and conversion trigger completed successfully!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
