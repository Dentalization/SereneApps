const fs = require('fs');
const path = require('path');

const scenarios = [
  {
    name: 'Baseline (1 VU, 1m)',
    file: path.join(__dirname, 'results/load-baseline-1vu-summary.json'),
    vus: 1,
    duration: '1m',
  },
  {
    name: 'Light Load (10 VUs, 3m)',
    file: path.join(__dirname, 'results/load-light-10vu-summary.json'),
    vus: 10,
    duration: '3m',
  },
  {
    name: 'Medium Load (25 VUs, 5m)',
    file: path.join(__dirname, 'results/load-medium-25vu-summary.json'),
    vus: 25,
    duration: '5m',
  },
  {
    name: 'High Load (50 VUs, 5m)',
    file: path.join(__dirname, 'results/load-high-50vu-summary.json'),
    vus: 50,
    duration: '5m',
  },
];

function run() {
  const results = [];

  for (const sc of scenarios) {
    if (!fs.existsSync(sc.file)) {
      console.warn(`Warning: Summary file ${sc.file} not found!`);
      continue;
    }

    try {
      const data = JSON.parse(fs.readFileSync(sc.file, 'utf8'));
      const metrics = data.metrics || {};

      const reqDuration = metrics.http_req_duration || {};
      const reqFailed = metrics.http_req_failed || {};

      const avg = (reqDuration.values && reqDuration.values.avg) || 0;
      const p95 = (reqDuration.values && reqDuration.values['p(95)']) || 0;
      const errorRate = (reqFailed.values && reqFailed.values.rate) || 0;

      const status = (p95 < 2000 && errorRate < 0.01) ? 'Memenuhi' : 'Tidak';

      results.push({
        name: sc.name,
        vus: sc.vus,
        duration: sc.duration,
        avg: avg.toFixed(2),
        p95: p95.toFixed(2),
        errorRate: (errorRate * 100).toFixed(2),
        status,
      });
    } catch (err) {
      console.error(`Error parsing summary for ${sc.name}:`, err.message);
    }
  }

  if (results.length === 0) {
    console.error("No results to generate report!");
    return;
  }

  // Generate MD
  let md = `## Tabel 4.5 Hasil Pengujian Latency Berdasarkan Beban Pengguna\n\n`;
  md += `| Skenario Beban | Virtual Users | Durasi | Avg. Response Time | p95 | Error Rate | Status Target < 2 Detik |\n`;
  md += `|---|---:|---:|---:|---:|---:|---:|\n`;
  for (const r of results) {
    md += `| ${r.name} | ${r.vus} | ${r.duration} | ${r.avg} ms | ${r.p95} ms | ${r.errorRate}% | ${r.status} |\n`;
  }

  // Generate CSV
  let csv = `Skenario Beban,Virtual Users,Durasi,Avg. Response Time (ms),p95 (ms),Error Rate (%),Status Target < 2 Detik\n`;
  for (const r of results) {
    csv += `"${r.name}",${r.vus},${r.duration},${r.avg},${r.p95},${r.errorRate},${r.status}\n`;
  }

  const mdPath = path.join(__dirname, 'reports/table-4-5-load-by-vu.md');
  const csvPath = path.join(__dirname, 'reports/table-4-5-load-by-vu.csv');

  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(csvPath, csv, 'utf8');

  console.log(`Reports generated:`);
  console.log(`- Markdown: ${mdPath}`);
  console.log(`- CSV: ${csvPath}`);

  console.log(`\n--- Consolidated Summary Table 4.5 ---`);
  console.log(md);
}

run();
