import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.resolve(import.meta.dirname, '../migrations/048_create_verified_case_workspace.sql'), 'utf8');
const route = fs.readFileSync(path.resolve(import.meta.dirname, '../src/routes/verified-cases.js'), 'utf8');

test('migration scopes verified cases by tenant and clinic', () => {
  assert.match(migration, /tenant_id TEXT NULL/);
  assert.match(migration, /clinic_id TEXT NULL/);
  assert.match(migration, /idx_verified_cases_tenant_clinic_updated/);
});

test('migration keeps audit events immutable and blocks clinical hard delete', () => {
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /prevent_case_audit_event_mutation/);
  assert.match(migration, /BEFORE UPDATE ON case_audit_events/);
  assert.match(migration, /BEFORE DELETE ON case_audit_events/);
  assert.match(migration, /prevent_verified_case_hard_delete/);
});

test('verified case route defaults to DB-backed repository and only falls back to memory by explicit mock mode', () => {
  assert.match(route, /createVerifiedCaseWorkspaceRepository/);
  assert.match(route, /createDefaultDbBackedService/);
  assert.match(route, /VERIFIED_CASE_WORKSPACE_STORE === 'memory'/);
});
