import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EMPTY_DISPLAY_VALUE,
  formatBranchAddress,
  formatLocalizedDate,
  getBranchCount,
  getBranchPreview,
  getClinicDisplayName,
  getClinicSecondaryName,
  humanizeDisplayValue,
  normalizeDisplayKey,
  readNonNegativeInteger
} from '../src/components/clinic/clinicDisplayModel.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) => fs.readFileSync(path.resolve(here, '..', relativePath), 'utf8');

test('clinic display model normalizes partial API records without inventing values', () => {
  const clinic = {
    brandName: 'Serene Smile',
    legalName: 'PT Serene Dental Indonesia',
    branches: [{ branchName: 'Central' }, { branchName: '' }, { branchName: 'West' }]
  };

  assert.equal(getClinicDisplayName(clinic), 'Serene Smile');
  assert.equal(getClinicSecondaryName(clinic), 'PT Serene Dental Indonesia');
  assert.equal(getClinicDisplayName(null, 'Unnamed clinic'), 'Unnamed clinic');
  assert.equal(getBranchCount(clinic), 3);
  assert.deepEqual(getBranchPreview(clinic), ['Central', 'West']);
  assert.equal(formatBranchAddress({ city: 'Jakarta', province: 'DKI Jakarta' }), 'Jakarta, DKI Jakarta');
  assert.equal(formatBranchAddress({}), EMPTY_DISPLAY_VALUE);
  assert.equal(readNonNegativeInteger(undefined), null);
  assert.equal(readNonNegativeInteger(-1), null);
  assert.equal(readNonNegativeInteger('4'), 4);
});

test('clinic labels and dates are normalized for translation-safe rendering', () => {
  assert.equal(normalizeDisplayKey('Pending Review'), 'pending_review');
  assert.equal(humanizeDisplayValue('clinic_manager'), 'Clinic Manager');
  assert.equal(formatLocalizedDate('not-a-date', 'id'), EMPTY_DISPLAY_VALUE);
  assert.notEqual(formatLocalizedDate('2026-07-22T12:00:00.000Z', 'en'), EMPTY_DISPLAY_VALUE);
  assert.notEqual(formatLocalizedDate('2026-07-22T12:00:00.000Z', 'id'), EMPTY_DISPLAY_VALUE);
});

test('shared clinic components retain responsive, accessible, and media fallback contracts', () => {
  const table = readSource('src/components/clinic/ClinicTable.jsx');
  const branches = readSource('src/components/clinic/BranchList.jsx');
  const staff = readSource('src/components/clinic/StaffList.jsx');
  const legacyDirectory = readSource('src/pages/admin-portal/clinic-management/components/ClinicDirectory.jsx');

  assert.match(table, /overflow-x-auto/);
  assert.match(table, /<caption className="sr-only">/);
  assert.match(table, /onView\(clinic\)/);
  assert.match(table, /aria-label=\{`\$\{viewLabel\}: \$\{clinicName\}`\}/);
  assert.match(branches, /roomCount \?\? EMPTY_DISPLAY_VALUE/);
  assert.match(staff, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(staff, /resolvedAvatarUrl && !imageFailed/);
  assert.match(legacyDirectory, /onView=\{\(clinic\) => navigate\(`\/admin\/clinic-management\/\$\{clinic\.id\}`/);
});
