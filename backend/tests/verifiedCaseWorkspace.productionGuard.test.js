import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertVerifiedCaseWorkspaceRuntimeMode } from '../src/routes/verified-cases.js';

test('production startup refuses the in-memory verified case workspace store', () => {
  assert.throws(
    () => assertVerifiedCaseWorkspaceRuntimeMode({
      NODE_ENV: 'production',
      VERIFIED_CASE_WORKSPACE_STORE: 'memory',
    }),
    /verified_case_memory_store_forbidden/
  );
});

test('server does not expose verified clinical image storage through public uploads static middleware', () => {
  const serverSource = fs.readFileSync(path.resolve(import.meta.dirname, '../src/server.js'), 'utf8');
  const blockIndex = serverSource.indexOf("app.use('/uploads/verified-cases'");
  const staticIndex = serverSource.indexOf("app.use('/uploads', express.static");

  assert.ok(blockIndex >= 0, 'verified case uploads must be blocked before generic static uploads middleware');
  assert.ok(staticIndex > blockIndex, 'verified case upload block must run before generic /uploads static middleware');
});
