import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import sharp from 'sharp';
import { buildXCoreAnalysisPdf } from '../src/services/xCoreAnalysisPdf.js';
import { buildXCoreExampleFixture } from './fixtures/xcoreExampleFixture.js';

const baseline = JSON.parse(await fs.readFile(new URL('./fixtures/xcore-report-golden.json', import.meta.url), 'utf8'));

function hammingDistance(left, right) {
  let value = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let count = 0;
  while (value) { count += Number(value & 1n); value >>= 1n; }
  return count;
}

async function dHash(file) {
  const data = await sharp(file).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer();
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) bits += data[(y * 9) + x] > data[(y * 9) + x + 1] ? '1' : '0';
  }
  return BigInt(`0b${bits}`).toString(16).padStart(16, '0');
}

async function pageMetrics(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let black = 0;
  let marker = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const [red, green, blue] = [data[index], data[index + 1], data[index + 2]];
    if (red < 8 && green < 8 && blue < 8) black += 1;
    if (red < 45 && green >= 75 && green <= 165 && blue >= 95 && blue <= 190) marker += 1;
  }
  const pixels = info.width * info.height;
  return {
    width: info.width,
    height: info.height,
    blackFraction: black / pixels,
    markerPixels: marker,
    stats: await sharp(file).greyscale().stats(),
    hash: await dHash(file),
  };
}

async function makeVisualFixturePdf() {
  const fixture = await buildXCoreExampleFixture();
  const buffers = [fixture.annotated.pa11, fixture.annotated.pa36, fixture.annotated.pano];
  const types = ['PERIAPICAL', 'PERIAPICAL', 'PANORAMIC'];
  const teeth = [['11'], ['36'], []];
  const items = await Promise.all(buffers.map(async (buffer, index) => {
    const image = await sharp(buffer).metadata();
    return {
      id: `${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}${index + 1}-${index + 1}${index + 1}${index + 1}${index + 1}-4${index + 1}${index + 1}${index + 1}-8${index + 1}${index + 1}${index + 1}-${String(index + 1).repeat(12)}`,
      display_order: index,
      radiograph_type: types[index],
      tooth_numbers: teeth[index],
      viewer_type: '2d',
      study_date: '2026-08-04',
      title: `Fixture ${index + 1}`,
      structured_findings: [{ id: `finding-${index}`, marker_number: 1, annotation_id: `annotation-${index}`, tooth_numbers: teeth[index], region: index === 2 ? 'Regio panoramik' : `Gigi ${teeth[index][0]}`, description: 'Temuan fixture visual regression.', display_order: 0 }],
      measurements: index < 2 ? [{ id: `measurement-${index}`, label: 'Garis referensi', metadata: { value_label: '4,1 mm' } }] : [],
      render_metadata: { report_render_version: 2, render_width: image.width, render_height: image.height, marker_count: 1 },
    };
  }));
  return buildXCoreAnalysisPdf({
    snapshot: {
      id: 'golden-case', report_id: 'golden-report', report_version: 2, report_status: 'DRAFT', snapshot_checksum: 'golden-fixture',
      generated_at: '2026-08-04T08:00:00.000Z', patient: { name: 'Subjek Fixture Non-Klinis' }, creator: { name: 'Penguji Sistem' },
      title: 'Fixture QA X-Core — Dua Periapikal dan Satu Panoramik',
      clinical_data: { chief_complaint: 'Fixture non-klinis', clinical_indication: 'Visual regression', clinical_notes: 'Tidak mengandung data pasien.' },
      conclusion: 'Fixture visual regression X-Core.', items,
    },
    imageBuffers: new Map(items.map((item, index) => [item.id, buffers[index]])),
  });
}

test('golden PDF raster has visible radiographs, markers, stable layout, and no black-page failure', async (t) => {
  const poppler = spawnSync('pdftoppm', ['-h'], { encoding: 'utf8' });
  if (poppler.error?.code === 'ENOENT') return t.skip('pdftoppm is unavailable');
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'xcore-pdf-visual-'));
  try {
    const pdfPath = path.join(temporaryDirectory, 'report.pdf');
    await fs.writeFile(pdfPath, await makeVisualFixturePdf());
    const render = spawnSync('pdftoppm', ['-png', '-r', '80', pdfPath, path.join(temporaryDirectory, 'page')], {
      encoding: 'utf8',
      env: { ...process.env, XDG_CACHE_HOME: temporaryDirectory },
    });
    assert.equal(render.status, 0, render.stderr);
    const pages = (await fs.readdir(temporaryDirectory)).filter((name) => /^page-\d+\.png$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    assert.equal(pages.length, baseline.page_count);
    const metrics = await Promise.all(pages.map((name) => pageMetrics(path.join(temporaryDirectory, name))));
    assert.deepEqual(metrics.map((page) => page.width > page.height ? 'landscape' : 'portrait'), baseline.orientations);
    metrics.forEach((page, index) => {
      assert.ok(page.blackFraction < 0.22, `page ${index + 1} must not be dominated by black empty area`);
      const minimumStdev = baseline.marker_pages.includes(index + 1) ? 18 : 9;
      assert.ok(page.stats.channels[0].stdev > minimumStdev, `page ${index + 1} must contain visible content`);
      assert.ok(hammingDistance(page.hash, baseline.dhash[index]) <= baseline.max_hamming_distance, `page ${index + 1} drifted from golden layout`);
    });
    baseline.marker_pages.forEach((pageNumber) => assert.ok(metrics[pageNumber - 1].markerPixels > 20, `marker must be visible on page ${pageNumber}`));
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
});
