import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { buildXCoreAnalysisPdf } from '../src/services/xCoreAnalysisPdf.js';
import { buildXCoreExampleFixture } from '../tests/fixtures/xcoreExampleFixture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(__dirname, '../artifacts/xcore-analysis-two-pa-one-pano.pdf');
const fixture = await buildXCoreExampleFixture();
const ids = {
  pa11: '11111111-1111-4111-8111-111111111111',
  pa36: '22222222-2222-4222-8222-222222222222',
  pano: '33333333-3333-4333-8333-333333333333',
};
const annotationIds = {
  pa11: 'fixture-annotation-pa11',
  pa36: 'fixture-annotation-pa36',
  pano: 'fixture-annotation-pano',
};

async function reportMetadata(buffer, viewerType = '2d') {
  const metadata = await sharp(buffer).metadata();
  return {
    report_render_version: 2,
    render_type: 'ANNOTATED',
    viewer_type: viewerType,
    render_width: metadata.width,
    render_height: metadata.height,
    source_width: metadata.width,
    source_height: metadata.height,
    window_center: 0.5,
    window_width: 1,
    invert: false,
    rotation: 0,
    marker_count: 1,
    rendered_at: new Date().toISOString(),
  };
}

const items = [
  {
    id: ids.pa11,
    display_order: 0,
    radiograph_type: 'PERIAPICAL',
    tooth_numbers: ['11'],
    title: 'Fixture QA — regio anterior',
    study_date: '2026-08-04',
    viewer_type: '2d',
    structured_findings: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', marker_number: 1, annotation_id: annotationIds.pa11, tooth_numbers: ['11'], region: 'Gigi 11', title: 'Lokasi uji marker', description: 'Uraian fixture untuk memverifikasi hubungan marker dan temuan; bukan interpretasi klinis.', display_order: 0 }],
    measurements: [{ id: 'measurement-pa11', label: 'Garis referensi fixture', metadata: { value_label: '18,4 mm' } }],
    render_metadata: await reportMetadata(fixture.annotated.pa11),
  },
  {
    id: ids.pa36,
    display_order: 1,
    radiograph_type: 'PERIAPICAL',
    tooth_numbers: ['36'],
    title: 'Fixture QA — regio posterior',
    study_date: '2026-08-04',
    viewer_type: '2d',
    structured_findings: [{ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', marker_number: 1, annotation_id: annotationIds.pa36, tooth_numbers: ['36'], region: 'Gigi 36', title: 'Lokasi uji marker', description: 'Uraian fixture kedua untuk memastikan nomor marker dimulai kembali pada radiografi berikutnya.', display_order: 0 }],
    measurements: [{ id: 'measurement-pa36', label: 'Garis referensi fixture', metadata: { value_label: '4,1 mm' } }],
    render_metadata: await reportMetadata(fixture.annotated.pa36),
  },
  {
    id: ids.pano,
    display_order: 2,
    radiograph_type: 'PANORAMIC',
    tooth_numbers: [],
    title: 'Fixture QA — panoramik',
    study_date: '2026-08-04',
    viewer_type: '2d',
    structured_findings: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', marker_number: 1, annotation_id: annotationIds.pano, tooth_numbers: [], region: 'Regio posterior kanan', title: 'Lokasi uji marker', description: 'Uraian fixture panoramik untuk pengujian layout landscape dan full-width.', display_order: 0 }],
    measurements: [],
    render_metadata: await reportMetadata(fixture.annotated.pano),
  },
];

const buffer = await buildXCoreAnalysisPdf({
  snapshot: {
    id: 'fixture-case',
    report_id: 'fixture-report-v2',
    report_version: 2,
    report_status: 'DRAFT',
    snapshot_checksum: 'fixture-snapshot-checksum-non-production',
    generated_at: '2026-08-04T08:00:00.000Z',
    patient_id: 'fixture-subject',
    created_by: 'fixture-author',
    patient: { name: 'Subjek Fixture Non-Klinis' },
    creator: { name: 'Penguji Sistem' },
    facility_name: null,
    title: 'Fixture QA X-Core — Dua Periapikal dan Satu Panoramik',
    clinical_data: {
      chief_complaint: 'Data fixture untuk verifikasi visual; bukan data pasien.',
      clinical_indication: 'Pengujian canonical render, marker, layout, dan pagination.',
      clinical_notes: `Sumber citra: aset pengujian repository ${path.basename(fixture.sourcePath)}. Crop periapikal hanya untuk pengujian layout non-klinis.`,
    },
    conclusion: 'Seluruh isi halaman ini adalah fixture QA non-klinis. Tiga gambar utama, marker, temuan, pengukuran, orientasi halaman, header, dan footer harus terlihat jelas.',
    items,
  },
  imageBuffers: new Map([
    [ids.pa11, fixture.annotated.pa11],
    [ids.pa36, fixture.annotated.pa36],
    [ids.pano, fixture.annotated.pano],
  ]),
});
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, buffer);
console.log(output);
