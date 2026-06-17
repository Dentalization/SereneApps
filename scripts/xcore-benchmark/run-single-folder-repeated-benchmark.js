import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find all files recursively
function getFilesRecursive(dir, rootDir = dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of list) {
        if (file.name.startsWith('.')) continue;
        // Skip server-generated or pre-converted assets
        if (file.name.startsWith('thumb_') || 
            file.name.startsWith('volume_') || 
            file.name.startsWith('image_') || 
            file.name.endsWith('.vti')) {
            continue;
        }
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(getFilesRecursive(filePath, rootDir));
        } else {
            const relativePath = path.relative(rootDir, filePath);
            results.push({
                absolutePath: filePath,
                relativePath: relativePath,
                size: fs.statSync(filePath).size
            });
        }
    }
    return results;
}

// Robust upload helper using native http module + form-data stream piping
function uploadFolder(urlStr, form, extraHeaders) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            method: 'POST',
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            headers: {
                ...form.getHeaders(),
                ...extraHeaders
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', err => {
            reject(err);
        });

        form.pipe(req);
    });
}

async function run() {
    const configPath = path.join(__dirname, 'benchmark.single.config.json');
    if (!fs.existsSync(configPath)) {
        console.error(`Config file not found at: ${configPath}`);
        process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const { apiBaseUrl, pythonServiceUrl, repeatRuns, case: testCase } = config;
    const { dentistEmail, dentistPassword, folderPath, caseId } = testCase;

    console.log(`[Benchmark] Starting repeated-run prototype benchmark using representative study folder...`);
    console.log(`[Benchmark] Configured Backend: ${apiBaseUrl}`);
    console.log(`[Benchmark] Configured Python: ${pythonServiceUrl}`);
    console.log(`[Benchmark] Representative Folder: ${folderPath}`);

    if (!fs.existsSync(folderPath)) {
        console.error(`Representative folder not found at: ${folderPath}`);
        process.exit(1);
    }

    // Gather file list
    const files = getFilesRecursive(folderPath);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const fileCount = files.length;
    console.log(`[Benchmark] Representative folder contains ${fileCount} files, total size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);

    // Authenticate
    console.log(`[Benchmark] Authenticating dentist ${dentistEmail}...`);
    let authHeader = '';
    try {
        const authResponse = await fetch(`${apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: dentistEmail, password: dentistPassword })
        });
        if (!authResponse.ok) {
            const errorBody = await authResponse.text();
            throw new Error(`Authentication failed (HTTP ${authResponse.status}): ${errorBody}`);
        }
        const authData = await authResponse.json();
        authHeader = `Bearer ${authData.accessToken}`;
        console.log(`[Benchmark] Authenticated successfully.`);
    } catch (e) {
        console.error(`[Benchmark] Login Error:`, e);
        process.exit(1);
    }

    const runId = `${config.runLabel}_${Date.now()}`;
    console.log(`[Benchmark] Run ID: ${runId}`);

    // Create results directories
    const resultsDir = path.join(__dirname, 'results');
    const rawResultsDir = path.join(resultsDir, 'raw');
    fs.mkdirSync(rawResultsDir, { recursive: true });

    // Initialize CSV log file
    const csvPath = path.join(resultsDir, 'benchmark-runs.csv');
    const writeHeaders = !fs.existsSync(csvPath);
    const csvStream = fs.createWriteStream(csvPath, { flags: 'a' });
    if (writeHeaders) {
        csvStream.write([
            'timestamp',
            'run_id',
            'case_id',
            'iteration',
            'upload_latency_ms',
            'conversion_latency_ms',
            'slice_axial_latency_ms',
            'slice_coronal_latency_ms',
            'slice_sagittal_latency_ms',
            'total_slices',
            'file_size_bytes',
            'file_count',
            'status'
        ].join(',') + '\n');
    }

    // Main execution loop
    for (let i = 1; i <= repeatRuns; i++) {
        console.log(`\n======================================================`);
        console.log(`[Benchmark] ITERATION ${i} OF ${repeatRuns}`);
        console.log(`======================================================`);

        let uploadLatency = null;
        let conversionLatency = null;
        let axialLatency = null;
        let coronalLatency = null;
        let sagittalLatency = null;
        let studyId = null;
        let folderName = null;
        let status = 'success';

        try {
            // 1. Upload files
            console.log(`[Benchmark] Uploading representative CBCT folder...`);
            const uploadForm = new FormData();
            for (const file of files) {
                // Add stream
                uploadForm.append('files', fs.createReadStream(file.absolutePath), {
                    filename: file.relativePath,
                    filepath: file.relativePath
                });
            }

            const uploadStart = Date.now();
            const uploadResult = await uploadFolder(`${apiBaseUrl}/x-core/upload`, uploadForm, {
                'Authorization': authHeader,
                'X-Benchmark-Run-Id': runId,
                'X-Benchmark-Case-Id': caseId,
                'X-Benchmark-Iteration': i.toString()
            });

            uploadLatency = Date.now() - uploadStart;
            studyId = uploadResult.id;
            folderName = uploadResult.folderName;

            console.log(`[Benchmark] Upload complete. Latency: ${uploadLatency} ms. Study ID: ${studyId}, Folder: ${folderName}`);

            // 2. Poll Python service conversion status
            console.log(`[Benchmark] Polling VTI conversion status...`);
            const conversionStart = Date.now();
            let isReady = false;
            let attempts = 0;
            const maxAttempts = 180; // 3 minutes timeout

            while (!isReady && attempts < maxAttempts) {
                attempts++;
                const statusResp = await fetch(`${pythonServiceUrl}/status/${folderName}`);
                if (!statusResp.ok) {
                    console.warn(`[Benchmark] Status poll failed (HTTP ${statusResp.status})`);
                } else {
                    const statusData = await statusResp.json();
                    if (statusData.status === 'ready') {
                        isReady = true;
                    } else if (statusData.status === 'failed' || statusData.status === 'error') {
                        throw new Error(`Python conversion reported failure: ${JSON.stringify(statusData)}`);
                    }
                }

                if (!isReady) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (!isReady) {
                throw new Error(`VTI conversion timed out after ${maxAttempts} seconds`);
            }

            conversionLatency = Date.now() - conversionStart;
            console.log(`[Benchmark] VTI Conversion complete. Latency: ${conversionLatency} ms`);

            // 3. Measure Slice Rendering Latencies
            console.log(`[Benchmark] Streaming slice views...`);
            
            // Axial view
            const axialStart = Date.now();
            const axialResp = await fetch(`${pythonServiceUrl}/stream/${folderName}/axial/100`, {
                headers: {
                    'X-Benchmark-Run-Id': runId,
                    'X-Benchmark-Case-Id': caseId,
                    'X-Benchmark-Iteration': i.toString()
                }
            });
            if (!axialResp.ok) throw new Error(`Axial slice stream failed (HTTP ${axialResp.status})`);
            await axialResp.arrayBuffer();
            axialLatency = Date.now() - axialStart;

            // Coronal view
            const coronalStart = Date.now();
            const coronalResp = await fetch(`${pythonServiceUrl}/stream/${folderName}/coronal/100`, {
                headers: {
                    'X-Benchmark-Run-Id': runId,
                    'X-Benchmark-Case-Id': caseId,
                    'X-Benchmark-Iteration': i.toString()
                }
            });
            if (!coronalResp.ok) throw new Error(`Coronal slice stream failed (HTTP ${coronalResp.status})`);
            await coronalResp.arrayBuffer();
            coronalLatency = Date.now() - coronalStart;

            // Sagittal view
            const sagittalStart = Date.now();
            const sagittalResp = await fetch(`${pythonServiceUrl}/stream/${folderName}/sagittal/100`, {
                headers: {
                    'X-Benchmark-Run-Id': runId,
                    'X-Benchmark-Case-Id': caseId,
                    'X-Benchmark-Iteration': i.toString()
                }
            });
            if (!sagittalResp.ok) throw new Error(`Sagittal slice stream failed (HTTP ${sagittalResp.status})`);
            await sagittalResp.arrayBuffer();
            sagittalLatency = Date.now() - sagittalStart;

            console.log(`[Benchmark] Slices loaded successfully. Latencies: Axial=${axialLatency}ms, Coronal=${coronalLatency}ms, Sagittal=${sagittalLatency}ms`);

        } catch (e) {
            console.error(`[Benchmark] Error during iteration ${i}:`, e.message);
            status = 'failed';
        }

        // 4. Auto-cleanup of uploaded study (Node.js and Disk)
        if (studyId && config.cleanupAfterEachRun) {
            console.log(`[Benchmark] Starting auto-cleanup for study ${studyId}...`);
            try {
                const deleteStart = Date.now();
                const deleteResp = await fetch(`${apiBaseUrl}/x-core/benchmark/studies/${studyId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': authHeader }
                });

                if (!deleteResp.ok) {
                    const errText = await deleteResp.text();
                    console.error(`[Benchmark] Clean up failed (HTTP ${deleteResp.status}): ${errText}`);
                } else {
                    const deleteResult = await deleteResp.json();
                    console.log(`[Benchmark] Cleanup completed in ${Date.now() - deleteStart} ms. Result: ${JSON.stringify(deleteResult)}`);
                }
            } catch (cleanupError) {
                console.error(`[Benchmark] Error during cleanup requests:`, cleanupError.message);
            }
        }

        // Log results to CSV
        const csvLine = [
            new Date().toISOString(),
            runId,
            caseId,
            i,
            uploadLatency !== null ? uploadLatency : '',
            conversionLatency !== null ? conversionLatency : '',
            axialLatency !== null ? axialLatency : '',
            coronalLatency !== null ? coronalLatency : '',
            sagittalLatency !== null ? sagittalLatency : '',
            300, // standard representative CBCT slices count
            totalSize,
            fileCount,
            status
        ].join(',');
        
        csvStream.write(csvLine + '\n');
    }

    csvStream.end();
    console.log(`\n[Benchmark] Benchmark run completed. Raw data appended to results/benchmark-runs.csv`);
    console.log(`[Benchmark] Run summary files are stored under scripts/xcore-benchmark/results/raw/`);
    console.log(`[Benchmark] run_id used for this session: ${runId}`);
}

run();
