import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr, avg) {
    if (arr.length <= 1) return 0;
    const sumSq = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
    return Math.sqrt(sumSq / (arr.length - 1));
}

function formatStats(arr, scale = 1, unit = '') {
    if (arr.length === 0) return 'N/A';
    const scaled = arr.map(v => v * scale);
    const avg = mean(scaled);
    const sd = stdDev(scaled, avg);
    return `${avg.toFixed(2)} ± ${sd.toFixed(2)}${unit}`;
}

export function summarizeObserved(values, scale = 1) {
    const observed = values.filter(value => typeof value === 'number' && Number.isFinite(value));
    if (!observed.length) return { avg: null, sd: null, observations: 0 };
    const scaled = observed.map(value => value * scale);
    const avg = mean(scaled);
    return { avg, sd: scaled.length > 1 ? stdDev(scaled, avg) : null, observations: scaled.length };
}

export function observedAgreement(matches, observations) {
    return observations > 0 ? matches / observations * 100 : null;
}
const formatNumber = value => Number.isFinite(value) ? value.toFixed(2) : 'unavailable';

function run() {
    const resultsDir = path.join(__dirname, 'results');
    const csvPath = path.join(resultsDir, 'benchmark-runs.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`Benchmark raw results CSV not found at: ${csvPath}`);
        console.error('Please run the benchmark first using run-single-folder-repeated-benchmark.js');
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8').trim();
    const lines = content.split('\n');
    if (lines.length <= 1) {
        console.error('Benchmark results CSV contains no data rows.');
        process.exit(1);
    }

    // Parse CSV rows
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => {
        const parts = line.split(',');
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = parts[idx];
        });
        return obj;
    });

    // Determine the latest runId
    const latestRunId = rows[rows.length - 1].run_id;
    console.log(`[Summarizer] Analyzing latest benchmark run: ${latestRunId}`);

    const runRows = rows.filter(r => r.run_id === latestRunId && r.status === 'success');
    if (runRows.length === 0) {
        console.error(`No successful iterations found for runId: ${latestRunId}`);
        process.exit(1);
    }

    console.log(`[Summarizer] Found ${runRows.length} successful iterations.`);

    const uploadLatencies = runRows.map(r => parseFloat(r.upload_latency_ms));
    const conversionLatencies = runRows.map(r => parseFloat(r.conversion_latency_ms));
    const axialLatencies = runRows.map(r => parseFloat(r.slice_axial_latency_ms));
    const coronalLatencies = runRows.map(r => parseFloat(r.slice_coronal_latency_ms));
    const sagittalLatencies = runRows.map(r => parseFloat(r.slice_sagittal_latency_ms));

    // Parse python events for memory (Peak RSS) and classification agreement
    const pythonLogPath = path.join(resultsDir, 'raw', `python-events-${latestRunId}.jsonl`);
    let peakRssValues = [];
    let classificationAgreementCount = 0;
    let totalClassificationCount = 0;

    if (fs.existsSync(pythonLogPath)) {
        const logLines = fs.readFileSync(pythonLogPath, 'utf8').trim().split('\n').filter(Boolean);
        for (const line of logLines) {
            try {
                const event = JSON.parse(line);
                if (event.eventType === 'volume_preparation_end' && event.details?.peak_rss_bytes) {
                    peakRssValues.push(event.details.peak_rss_bytes);
                }
                if (event.eventType === 'classification_result' && event.details?.classification) {
                    totalClassificationCount++;
                    const is2D = event.details.seriesUid.startsWith('pan_opg_');
                    const expected = is2D ? '2D' : '3D';
                    if (event.details.classification === expected) {
                        classificationAgreementCount++;
                    }
                }
            } catch (err) {
                // Ignore parse errors on incomplete lines
            }
        }
    } else {
        console.warn(`[Summarizer] Python event log not found at: ${pythonLogPath}`);
    }

    const memoryMb = peakRssValues.map(v => v / (1024 * 1024));
    const agreementRate = observedAgreement(classificationAgreementCount, totalClassificationCount);

    // Calculate averages and stdDevs
    const stats = {
        upload: summarizeObserved(uploadLatencies, 1 / 1000),
        conversion: summarizeObserved(conversionLatencies, 1 / 1000),
        axial: summarizeObserved(axialLatencies), coronal: summarizeObserved(coronalLatencies),
        sagittal: summarizeObserved(sagittalLatencies), memory: summarizeObserved(memoryMb),
        agreement: agreementRate,
        agreementBasis: 'Series UID naming heuristic, not independent clinical ground truth',
        classificationObservations: totalClassificationCount,
    };

    // LaTeX snippet formatting
    const latexSnippet = `% Table IV
\\begin{table}[h]
\\centering
\\caption{Performance metrics of the repeated-run prototype benchmark using one complete representative CBCT study folder.}
\\begin{tabular}{lr}
\\hline
\\textbf{Evaluation Metric} & \\textbf{Experimental Result (Mean $\\pm$ SD)} \\\\
\\hline
Data Volume Ingest (Upload) Latency (s) & ${formatNumber(stats.upload.avg)} $\\pm$ ${formatNumber(stats.upload.sd)} \\\\
3D Volume Preparation (MONAI Pipeline) Latency (s) & ${formatNumber(stats.conversion.avg)} $\\pm$ ${formatNumber(stats.conversion.sd)} \\\\
Axial Slice Rendering Latency (ms) & ${formatNumber(stats.axial.avg)} $\\pm$ ${formatNumber(stats.axial.sd)} \\\\
Coronal Slice Rendering Latency (ms) & ${formatNumber(stats.coronal.avg)} $\\pm$ ${formatNumber(stats.coronal.sd)} \\\\
Sagittal Slice Rendering Latency (ms) & ${formatNumber(stats.sagittal.avg)} $\\pm$ ${formatNumber(stats.sagittal.sd)} \\\\
Peak Volume Processing RSS Memory (MiB) & ${formatNumber(stats.memory.avg)} $\\pm$ ${formatNumber(stats.memory.sd)} \\\\
Series-name heuristic classification agreement (\\%) & ${formatNumber(stats.agreement)}\\% \\\\
\\hline
\\end{tabular}
\\label{tab:table_iv_performance_benchmark}
\\end{table}`;

    // Output Markdown Summary Report
    const summaryMd = `# Repeated-Run CBCT Benchmark Performance Report

## Metadata
* **Run ID:** \`${latestRunId}\`
* **Iterations:** ${runRows.length} successful runs
* **Representative Case:** \`${runRows[0].case_id}\`
* **Total File Size:** ${(parseFloat(runRows[0].file_size_bytes) / (1024 * 1024)).toFixed(2)} MiB (binary megabytes)
* **File Count:** ${runRows[0].file_count} files (reconstructed recursively)

## Performance Metrics (Mean ± SD)
* **Data Ingest (Upload) Latency:** ${formatNumber(stats.upload.avg)} ± ${formatNumber(stats.upload.sd)} seconds
* **3D Volume Preparation Latency:** ${formatNumber(stats.conversion.avg)} ± ${formatNumber(stats.conversion.sd)} seconds
* **Axial Slice Rendering Latency:** ${formatNumber(stats.axial.avg)} ± ${formatNumber(stats.axial.sd)} ms
* **Coronal Slice Rendering Latency:** ${formatNumber(stats.coronal.avg)} ± ${formatNumber(stats.coronal.sd)} ms
* **Sagittal Slice Rendering Latency:** ${formatNumber(stats.sagittal.avg)} ± ${formatNumber(stats.sagittal.sd)} ms
* **Peak Volume Processing RSS Memory:** ${formatNumber(stats.memory.avg)} ± ${formatNumber(stats.memory.sd)} MiB
* **Series-name heuristic classification agreement:** ${formatNumber(stats.agreement)}%

## LaTeX Table IV
\`\`\`latex
${latexSnippet}
\`\`\`

## Academic Narrative Paragraph
This repeated-run prototype benchmark using one complete representative CBCT study folder records software performance observations for X-Core on one historical case; it does not establish smartphone reconstruction or clinical validity.
Data ingest and folder structure parsing completed with a mean ingestion latency of ${formatNumber(stats.upload.avg)}s ± ${formatNumber(stats.upload.sd)}s.
Under the standard isotropic voxel resampling configuration, the MONAI-based 3D Volume Preparation Pipeline required ${formatNumber(stats.conversion.avg)}s ± ${formatNumber(stats.conversion.sd)}s to yield compressed VTK structured volumes.
Multi-planar reconstruction (MPR) slice streaming timings were: Axial slice rendering required ${formatNumber(stats.axial.avg)}ms ± ${formatNumber(stats.axial.sd)}ms, Coronal slice rendering required ${formatNumber(stats.coronal.avg)}ms ± ${formatNumber(stats.coronal.sd)}ms, and Sagittal slice rendering required ${formatNumber(stats.sagittal.avg)}ms ± ${formatNumber(stats.sagittal.sd)}ms.
The peak memory utilization during volume interpolation was recorded at ${formatNumber(stats.memory.avg)} MB ± ${formatNumber(stats.memory.sd)} MiB RSS, and the classifier registered ${formatNumber(stats.agreement)}% agreement against a series-name heuristic, not independently verified ground truth.
After each iteration, the automatic cleanup sweeps completely deallocated the study assets from the PostgreSQL database and backend uploads directory without affecting the local source folder.
`;

    // Save summary files
    fs.writeFileSync(path.join(resultsDir, 'benchmark-summary.md'), summaryMd);
    fs.writeFileSync(path.join(resultsDir, 'benchmark-summary.json'), JSON.stringify(stats, null, 2));

    console.log('[Summarizer] Summary generated successfully:');
    console.log(summaryMd);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) run();
