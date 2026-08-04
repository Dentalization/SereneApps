import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  createAnalysisCase,
  generateAnalysisReport,
  getAnalysisCase,
  getAnalysisReportFile,
  saveAnalysisCaseRender,
  updateAnalysisCase,
} from '../src/services/xCoreAnalysisCaseService.js';
import { XCORE_REPORT_ROOT } from '../src/services/xCoreAnalysisReportStorage.js';
import { buildXCoreExampleFixture } from './fixtures/xcoreExampleFixture.js';

const enabled = process.env.RUN_XCORE_ANALYSIS_DB_TESTS === '1';
const prisma = new PrismaClient();
const asDataUrl = (buffer) => `data:image/png;base64,${buffer.toString('base64')}`;

test('persists two periapicals plus panoramic and keeps immutable PDF versions', { skip: !enabled }, async () => {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let creator;
  let otherUser;
  let patient;
  let caseRecord;
  const studies = [];
  try {
    [creator, otherUser, patient] = await Promise.all([
      prisma.user.create({ data: { name: 'XCore Case Dentist', email: `xcase-d-${stamp}@test.local`, password_hash: 'hash', roles: ['dentist'] } }),
      prisma.user.create({ data: { name: 'Other Dentist', email: `xcase-o-${stamp}@test.local`, password_hash: 'hash', roles: ['dentist'] } }),
      prisma.user.create({ data: { name: 'XCore Case Patient', email: `xcase-p-${stamp}@test.local`, password_hash: 'hash', roles: ['patient'] } }),
    ]);
    for (let index = 0; index < 3; index += 1) {
      const study = await prisma.imagingStudy.create({
        data: {
          patientId: patient.id, dentistId: creator.id, studyDate: new Date(), modality: index === 2 ? 'OPG' : 'IO',
          folderName: `xcase-${stamp}-${index}`, originalName: `xcase-${index}`, status: 'processed', metadata: {}, sizeInBytes: 1n,
          series: { create: { seriesNumber: 1, modality: index === 2 ? 'OPG' : 'IO', numSlices: 1, folderPath: `series-${index}` } },
        },
        include: { series: true },
      });
      studies.push(study);
    }
    const access = async (studyId) => ({ study: studies.find((study) => study.id === BigInt(studyId)) });
    await assert.rejects(() => createAnalysisCase({
      userId: creator.id,
      patientId: otherUser.id,
      requireStudyAccess: access,
      payload: {
        title: 'Cross-patient case must fail',
        items: [{ study_id: studies[0].id, series_id: studies[0].series[0].id, series_uid: 'blocked', viewer_type: '2d', radiograph_type: 'PANORAMIC', display_order: 0 }],
      },
    }), (error) => error.status === 400 && error.code === 'case_patient_mismatch');
    caseRecord = await createAnalysisCase({
      userId: creator.id,
      patientId: patient.id,
      requireStudyAccess: access,
      payload: {
        title: 'Kasus E2E 2 PA + 1 panoramik', clinical_data: { complaint: 'uji persistensi' }, conclusion: 'Kesimpulan v1',
        items: [
          { study_id: studies[0].id, series_id: studies[0].series[0].id, series_uid: 'pa-11', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['11'], display_order: 0, findings: 'Temuan 11' },
          { study_id: studies[1].id, series_id: studies[1].series[0].id, series_uid: 'pa-36', viewer_type: '2d', radiograph_type: 'PERIAPICAL', tooth_numbers: ['36'], display_order: 1, findings: 'Temuan 36' },
          { study_id: studies[2].id, series_id: studies[2].series[0].id, series_uid: 'pano', viewer_type: '2d', radiograph_type: 'PANORAMIC', tooth_numbers: [], display_order: 2, findings: 'Temuan panoramik' },
        ],
      },
    });
    assert.equal(caseRecord.items.length, 3);
    assert.deepEqual(caseRecord.items.map((item) => item.tooth_numbers), [['11'], ['36'], []]);

    for (const item of caseRecord.items) {
      await prisma.studyAnnotation.create({
        data: {
          id: `xcase-${item.id}`, studyId: BigInt(item.study_id), seriesUid: item.series_uid, viewerType: '2d', type: 'measurement',
          coordinates: { start: { x: 0.1, y: 0.1 }, end: { x: 0.2, y: 0.2 } }, label: `measurement-${item.series_uid}`,
          metadata: { clinical_record_type: 'measurement', value_label: `${item.display_order + 1}.0 mm` }, createdBy: creator.id,
        },
      });
    }

    caseRecord = await updateAnalysisCase({
      caseId: caseRecord.id,
      userId: creator.id,
      requireStudyAccess: access,
      payload: {
        items: caseRecord.items.map((item) => ({
          ...item,
          structured_findings: [{
            id: crypto.randomUUID(), marker_number: 1, annotation_id: `xcase-${item.id}`,
            tooth_numbers: item.tooth_numbers, region: item.tooth_numbers.length ? `Gigi ${item.tooth_numbers.join(', ')}` : 'Regio panoramik',
            title: 'Temuan fixture', description: `Temuan terhubung ${item.series_uid}`, display_order: 0,
          }],
        })),
      },
    });
    const fixture = await buildXCoreExampleFixture();
    const annotatedBuffers = [fixture.annotated.pa11, fixture.annotated.pa36, fixture.annotated.pano];
    const cleanBuffers = [fixture.clean.pa11, fixture.clean.pa36, fixture.clean.pano];
    for (const [index, item] of caseRecord.items.entries()) {
      const common = {
        report_render_version: 2,
        case_item_id: item.id,
        study_id: item.study_id,
        series_uid: item.series_uid,
        viewer_type: item.viewer_type,
        source_width: 390,
        source_height: 620,
        render_width: 390,
        render_height: 620,
        window_center: 0.5,
        window_width: 1,
        invert: false,
        rotation: 0,
        marker_count: 1,
        rendered_at: new Date().toISOString(),
      };
      await saveAnalysisCaseRender({
        caseId: caseRecord.id,
        itemId: item.id,
        userId: creator.id,
        renders: {
          CLEAN: { data_url: asDataUrl(cleanBuffers[index]), metadata: { ...common, render_type: 'CLEAN', marker_count: 0 } },
          ANNOTATED: { data_url: asDataUrl(annotatedBuffers[index]), metadata: { ...common, render_type: 'ANNOTATED' } },
        },
      });
    }

    const refreshed = await getAnalysisCase(caseRecord.id, creator.id);
    assert.equal(refreshed.items.filter((item) => item.render_status.ready).length, 3);
    assert.deepEqual(refreshed.items.map((item) => item.display_order), [0, 1, 2]);
    await assert.rejects(() => getAnalysisCase(caseRecord.id, otherUser.id), (error) => error.status === 403);
    await assert.rejects(() => saveAnalysisCaseRender({
      caseId: caseRecord.id, itemId: refreshed.items[0].id, userId: otherUser.id, renders: {},
    }), (error) => error.status === 403);
    await assert.rejects(() => saveAnalysisCaseRender({
      caseId: caseRecord.id, itemId: crypto.randomUUID(), userId: creator.id, renders: {},
    }), (error) => error.status === 404 && error.code === 'case_item_not_found');

    const v1 = await generateAnalysisReport({ caseId: caseRecord.id, userId: creator.id, status: 'DRAFT' });
    const v1File = await getAnalysisReportFile({ caseId: caseRecord.id, reportId: v1.id, userId: creator.id });
    assert.equal(v1.version, 1);
    assert.equal(v1File.buffer.subarray(0, 4).toString(), '%PDF');

    const updated = await updateAnalysisCase({
      caseId: caseRecord.id, userId: creator.id, requireStudyAccess: access,
      payload: { conclusion: 'Kesimpulan v2', items: [...refreshed.items].reverse().map((item, index) => ({ ...item, display_order: index })) },
    });
    assert.deepEqual(updated.items.map((item) => item.series_uid), ['pano', 'pa-36', 'pa-11']);
    const v2 = await generateAnalysisReport({ caseId: caseRecord.id, userId: creator.id, status: 'DRAFT' });
    assert.equal(v2.version, 2);
    assert.notEqual(v2.checksum, v1.checksum);
    const v1Again = await getAnalysisReportFile({ caseId: caseRecord.id, reportId: v1.id, userId: creator.id });
    assert.equal(v1Again.checksum, v1File.checksum);
    assert.deepEqual(v1Again.buffer, v1File.buffer);

    const snapshotRows = await prisma.$queryRaw(Prisma.sql`
      SELECT display_order, radiograph_type, tooth_numbers, jsonb_array_length(annotation_snapshot) AS annotation_count,
        jsonb_array_length(structured_findings) AS finding_count,
        annotation_snapshot->0->>'label' AS annotation_label
      FROM xcore_analysis_report_items WHERE report_id=${v1.id}::uuid ORDER BY display_order
    `);
    assert.deepEqual(snapshotRows.map((row) => [row.radiograph_type, row.tooth_numbers, row.annotation_count, row.finding_count, row.annotation_label]), [
      ['PERIAPICAL', ['11'], 1, 1, 'measurement-pa-11'], ['PERIAPICAL', ['36'], 1, 1, 'measurement-pa-36'], ['PANORAMIC', [], 1, 1, 'measurement-pano'],
    ]);
  } finally {
    if (caseRecord?.id) {
      await prisma.$executeRaw(Prisma.sql`DELETE FROM xcore_analysis_report_items WHERE report_id IN (SELECT id FROM xcore_analysis_reports WHERE case_id=${caseRecord.id}::uuid)`).catch(() => {});
      await prisma.$executeRaw(Prisma.sql`DELETE FROM xcore_analysis_reports WHERE case_id=${caseRecord.id}::uuid`).catch(() => {});
      await prisma.$executeRaw(Prisma.sql`DELETE FROM xcore_analysis_case_items WHERE case_id=${caseRecord.id}::uuid`).catch(() => {});
      await prisma.$executeRaw(Prisma.sql`DELETE FROM xcore_analysis_cases WHERE id=${caseRecord.id}::uuid`).catch(() => {});
      await fs.rm(path.join(XCORE_REPORT_ROOT, caseRecord.id), { recursive: true, force: true });
    }
    for (const study of studies) await prisma.imagingStudy.delete({ where: { id: study.id } }).catch(() => {});
    for (const user of [creator, otherUser, patient]) if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    await prisma.$disconnect();
  }
});
