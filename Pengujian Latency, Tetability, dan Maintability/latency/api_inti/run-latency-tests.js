const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const VUS = process.env.VUS || '10';
const DURATION = process.env.DURATION || '3m';
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4000';
const API_PREFIX = process.env.API_PREFIX || '/v1';

const tests = [
  {
    no: 1,
    feature: 'Login pengguna',
    script: 'tests/latency/scripts/01-login.k6.js',
    summaryFile: 'tests/latency/results/01-login-summary.json',
    trendMetric: 'login_response_time',
    failedMetric: 'login_failed',
    requestsMetric: 'login_requests',
  },
  {
    no: 2,
    feature: 'Ambil daftar appointment',
    script: 'tests/latency/scripts/02-fetch-appointments.k6.js',
    summaryFile: 'tests/latency/results/02-fetch-appointments-summary.json',
    trendMetric: 'list_appointment_response_time',
    failedMetric: 'list_appointment_failed',
    requestsMetric: 'list_appointment_requests',
  },
  {
    no: 3,
    feature: 'Buat appointment',
    script: 'tests/latency/scripts/03-create-appointment.k6.js',
    summaryFile: 'tests/latency/results/03-create-appointment-summary.json',
    trendMetric: 'create_appointment_response_time',
    failedMetric: 'create_appointment_failed',
    requestsMetric: 'create_appointment_requests',
  },
  {
    no: 4,
    feature: 'Ambil detail konsultasi',
    script: 'tests/latency/scripts/04-fetch-consultation-detail.k6.js',
    summaryFile: 'tests/latency/results/04-fetch-consultation-detail-summary.json',
    trendMetric: 'detail_consultation_response_time',
    failedMetric: 'detail_consultation_failed',
    requestsMetric: 'detail_consultation_requests',
  },
  {
    no: 5,
    feature: 'Kirim pesan konsultasi',
    script: 'tests/latency/scripts/05-send-chat-message.k6.js',
    summaryFile: 'tests/latency/results/05-send-chat-message-summary.json',
    trendMetric: 'send_message_response_time',
    failedMetric: 'send_message_failed',
    requestsMetric: 'send_message_requests',
  },
  {
    no: 6,
    feature: 'Unggah citra gigi',
    script: 'tests/latency/scripts/06-upload-attachment.k6.js',
    summaryFile: 'tests/latency/results/06-upload-attachment-summary.json',
    trendMetric: 'upload_image_response_time',
    failedMetric: 'upload_image_failed',
    requestsMetric: 'upload_image_requests',
  },
];

async function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${cmd}`);
    const proc = exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${error.message}`);
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
    // Pipe stdout/stderr to see live progress
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  });
}

function parseDuration(val) {
  const match = String(val).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 'ms') return amount / 1000;
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  return 0;
}

async function run() {
  console.log(`=== Starting SereneApps API Latency Benchmarks ===`);
  console.log(`Target: ${BASE_URL}${API_PREFIX}`);
  console.log(`VUs: ${VUS}, Duration: ${DURATION}`);
  console.log(`===================================================`);

  for (const test of tests) {
    console.log(`\n--- [${test.no}/6] Testing: ${test.feature} ---`);
    // Delete old summary if it exists to avoid stale results
    if (fs.existsSync(test.summaryFile)) {
      fs.unlinkSync(test.summaryFile);
    }

    const cmd = `k6 run -e VUS=${VUS} -e DURATION=${DURATION} -e BASE_URL=${BASE_URL} -e API_PREFIX=${API_PREFIX} -e SUMMARY_FILE=${test.summaryFile} ${test.script}`;
    try {
      await runCommand(cmd);
      console.log(`Completed ${test.feature}. Result saved to ${test.summaryFile}`);
    } catch (err) {
      console.error(`Error executing benchmark for ${test.feature}. Continuing...`);
    }
  }

  console.log(`\n=== Generating Consolidated Reports ===`);
  generateReports();
}

function generateReports() {
  const results = [];
  
  for (const test of tests) {
    if (!fs.existsSync(test.summaryFile)) {
      console.warn(`Warning: Summary file ${test.summaryFile} not found!`);
      continue;
    }
    
    try {
      const data = JSON.parse(fs.readFileSync(test.summaryFile, 'utf8'));
      const metrics = data.metrics || {};
      
      const trend = metrics[test.trendMetric] || {};
      const failed = metrics[test.failedMetric] || {};
      const reqs = metrics[test.requestsMetric] || {};
      
      const avg = (trend.values && trend.values.avg) || 0;
      const p95 = (trend.values && trend.values['p(95)']) || 0;
      const count = (reqs.values && reqs.values.count) || 0;
      const errorRate = (failed.values && failed.values.rate) || 0;
      
      const durationMs = (data.state && data.state.testRunDurationMs) || 0;
      const durationSeconds = durationMs > 0 ? durationMs / 1000 : parseDuration(DURATION) || 1;
      
      const throughput = durationSeconds > 0 ? count / durationSeconds : 0;
      const status = (p95 < 2000 && errorRate < 0.01) ? 'Memenuhi' : 'Tidak';
      
      results.push({
        no: test.no,
        feature: test.feature,
        avg: avg.toFixed(2),
        p95: p95.toFixed(2),
        throughput: throughput.toFixed(2),
        errorRate: (errorRate * 100).toFixed(2),
        status,
      });
    } catch (err) {
      console.error(`Error parsing summary for ${test.feature}:`, err.message);
    }
  }

  if (results.length === 0) {
    console.error("No results to generate report!");
    return;
  }

  // Generate MD
  let md = `## Tabel 4.4 Hasil Pengujian Latency API Inti\n\n`;
  md += `| No | Fitur | Avg. Response Time | p95 | Throughput | Error Rate | Status Target < 2 Detik |\n`;
  md += `|---:|---|---:|---:|---:|---:|---:|\n`;
  for (const r of results) {
    md += `| ${r.no} | ${r.feature} | ${r.avg} ms | ${r.p95} ms | ${r.throughput} req/s | ${r.errorRate}% | ${r.status} |\n`;
  }
  
  // Generate CSV
  let csv = `No,Fitur,Avg. Response Time (ms),p95 (ms),Throughput (req/s),Error Rate (%),Status Target < 2 Detik\n`;
  for (const r of results) {
    csv += `${r.no},"${r.feature}",${r.avg},${r.p95},${r.throughput},${r.errorRate},${r.status}\n`;
  }

  const mdPath = 'tests/latency/reports/table-4-4-core-api-latency.md';
  const csvPath = 'tests/latency/reports/table-4-4-core-api-latency.csv';
  
  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(csvPath, csv, 'utf8');
  
  console.log(`Reports generated:`);
  console.log(`- Markdown: ${mdPath}`);
  console.log(`- CSV: ${csvPath}`);
  
  console.log(`\n--- Consolidated Summary ---`);
  console.log(md);
}

// Check if this script was run directly
if (require.main === module) {
  run();
}
