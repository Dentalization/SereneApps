import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('xCoreController defines XCORE_CONVERSION_ARCH and awaits conversion only on sync', () => {
  const controller = read('src/controllers/xCoreController.js');

  assert.match(
    controller,
    /const XCORE_CONVERSION_ARCH = \(process\.env\.XCORE_CONVERSION_ARCH \|\| 'background'\)\.toLowerCase\(\);/
  );
  assert.match(
    controller,
    /if \(XCORE_CONVERSION_ARCH === 'sync'\) \{\s*await conversionRequest;\s*\}/
  );
  assert.match(
    controller,
    /console\.log\(`\[X-Core\] VTI conversion triggered \(\$\{XCORE_CONVERSION_ARCH\}\):/
  );
});
