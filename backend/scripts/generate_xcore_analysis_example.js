import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildXCoreAnalysisPdf } from '../src/services/xCoreAnalysisPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(__dirname, '../artifacts/xcore-analysis-two-pa-one-pano.pdf');
const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const items = [
  { id: '11111111-1111-4111-8111-111111111111', display_order: 0, radiograph_type: 'PERIAPICAL', tooth_numbers: ['11'], title: 'Periapikal regio anterior', findings: 'Ruang ligamen periodontal gigi 11 tampak untuk evaluasi klinis.', measurements: [{ label: 'Panjang referensi 18.4 mm' }] },
  { id: '22222222-2222-4222-8222-222222222222', display_order: 1, radiograph_type: 'PERIAPICAL', tooth_numbers: ['36'], title: 'Periapikal regio posterior', findings: 'Area periapikal gigi 36 didokumentasikan terpisah.', measurements: [{ label: 'Lebar referensi 4.1 mm' }] },
  { id: '33333333-3333-4333-8333-333333333333', display_order: 2, radiograph_type: 'PANORAMIC', tooth_numbers: [], title: 'Panoramik', findings: 'Gambaran panoramik untuk penilaian keseluruhan rahang.', measurements: [] },
];

const buffer = await buildXCoreAnalysisPdf({
  snapshot: {
    id: 'example-case', report_id: 'example-report-v1', report_version: 1, report_status: 'DRAFT',
    generated_at: new Date().toISOString(), patient_id: 'example-patient', created_by: 'example-dentist',
    patient: { name: 'Pasien Contoh' }, creator: { name: 'drg. Contoh' }, title: 'Contoh Kasus Dua Periapikal dan Satu Panoramik',
    clinical_data: { chief_complaint: 'Contoh keluhan klinis', clinical_notes: 'PDF ini memakai placeholder citra non-klinis untuk verifikasi layout.' },
    conclusion: 'Contoh kesimpulan analisis multi-citra.', items,
  },
  imageBuffers: new Map(items.map((item) => [item.id, placeholder])),
});
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, buffer);
console.log(output);

