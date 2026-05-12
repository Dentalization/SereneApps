import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createVerifiedCaseWorkspaceService } from '../src/services/verifiedCaseWorkspaceService.js';
import { createVerifiedCaseWorkspaceRepository } from '../src/repositories/verifiedCaseWorkspaceRepository.js';
import { createMemoryImageStorageAdapter } from '../src/services/verifiedCaseImageStorage.js';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runPostgresIntegration = process.env.RUN_POSTGRES_INTEGRATION === '1' && Boolean(connectionString);
const postgresTest = runPostgresIntegration ? test : test.skip;

postgresTest('migration 048 and DB repository persist verified case workspace data in Postgres', async () => {
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
  });
  const client = await pool.connect();
  const migrationSql = await fs.readFile(path.resolve(import.meta.dirname, '../migrations/048_create_verified_case_workspace.sql'), 'utf8');
  const actor = { role: 'dentist', tenantId: `tenant-${Date.now()}`, clinicId: `clinic-${Date.now()}` };

  try {
    await client.query('BEGIN');
    await client.query(migrationSql);

    const repositoryA = createVerifiedCaseWorkspaceRepository({ query: (text, params) => client.query(text, params) });
    const storageState = {};
    const serviceA = createVerifiedCaseWorkspaceService({
      repository: repositoryA,
      storage: createMemoryImageStorageAdapter({ state: storageState }),
      aiAdapter: {
        analyzeImage: async () => ({
          raw_ai_result: { source: 'postgres-integration' },
          normalized_findings: { findings: [{ label: 'calculus', severity: 'mild' }] },
        }),
      },
      now: () => new Date('2026-05-08T04:00:00.000Z'),
    });

    const created = await serviceA.createCase({ title: 'Postgres durable case', actor });
    const image = await serviceA.addCaseImage({
      caseId: created.id,
      actor,
      file: {
        originalname: 'pg.jpg',
        mimetype: 'image/jpeg',
        size: 8,
        buffer: Buffer.from('pg-image'),
      },
    });
    await serviceA.runQualityCheck({
      caseId: created.id,
      imageId: image.id,
      actor,
      metrics: { width: 1200, height: 900, blur: 0.05, brightness: 0.55, contrast: 0.72, dentalRelevance: 0.95, teethVisible: true },
    });
    await serviceA.recordImageAnalysis({ caseId: created.id, imageId: image.id, actor });

    const repositoryB = createVerifiedCaseWorkspaceRepository({ query: (text, params) => client.query(text, params) });
    const serviceB = createVerifiedCaseWorkspaceService({
      repository: repositoryB,
      storage: createMemoryImageStorageAdapter({ state: storageState }),
      aiAdapter: { analyzeImage: async () => { throw new Error('analysis should not run during reload verification'); } },
      now: () => new Date('2026-05-08T04:01:00.000Z'),
    });

    const loaded = await serviceB.getCase(created.id, { actor });
    const images = await serviceB.listImages(created.id, { actor });
    const findings = await serviceB.listFindings(created.id, { actor });
    const auditEvents = await serviceB.listAuditEvents(created.id, { actor });
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'verified_cases'
        AND column_name IN ('tenant_id', 'clinic_id')
      ORDER BY column_name
    `);

    assert.equal(loaded.title, 'Postgres durable case');
    assert.equal(loaded.status, 'pending_clinician_review');
    assert.equal(images[0].id, image.id);
    assert.equal(findings[0].label, 'calculus');
    assert.ok(auditEvents.some((event) => event.event_type === 'image_analysis_completed'));
    assert.deepEqual(columns.rows.map((row) => row.column_name), ['clinic_id', 'tenant_id']);

    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
});
