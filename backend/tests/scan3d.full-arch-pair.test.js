import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFullArchPair } from '../src/services/scan3D/fullArchPair.js';

const upperProtocol = { mode: 'full_arch_pair', sequence: 1, arch: 'upper' };
const lowerProtocol = { mode: 'full_arch_pair', sequence: 2, arch: 'lower', pairedUpperScanId: '501' };
const recordedUpper = { id: 501n, folderName: 'SCAN-3D-UPPER', metadata: {
  videoFileName: 'raw_upper.mp4', fullArchPair: { arch: 'upper', associationVerifiedByServer: true },
} };

test('full-arch association requires a recorded upper scan owned by the same patient and dentist', async () => {
  assert.equal(await resolveFullArchPair(null, 'upper', 42n, 10n, () => null), null);
  const first = await resolveFullArchPair(upperProtocol, 'upper', 42n, 10n, () => null);
  assert.equal(first.sequence, 1);
  assert.equal(first.associationVerifiedByServer, true);

  let lookup;
  const second = await resolveFullArchPair(lowerProtocol, 'lower', 42n, 10n, query => {
    lookup = query;
    return recordedUpper;
  });
  assert.deepEqual(lookup, { id: 501n, patientId: 42n, dentistId: 10n });
  assert.equal(second.upperScanId, '501');
  assert.equal(second.pairGroupId, 'SCAN-3D-UPPER');

  await assert.rejects(() => resolveFullArchPair(lowerProtocol, 'lower', 42n, 10n, () => null),
    error => error.code === 'FULL_ARCH_UPPER_REQUIRED');
  await assert.rejects(() => resolveFullArchPair(lowerProtocol, 'lower', 42n, 10n, () => ({ ...recordedUpper,
    metadata: { fullArchPair: { arch: 'upper', associationVerifiedByServer: true } },
  })), error => error.code === 'FULL_ARCH_UPPER_REQUIRED');
  await assert.rejects(() => resolveFullArchPair({ ...lowerProtocol, pairedUpperScanId: '0' }, 'lower', 42n, 10n, () => recordedUpper),
    error => error.code === 'FULL_ARCH_UPPER_REQUIRED');
  await assert.rejects(() => resolveFullArchPair(upperProtocol, 'full', 42n, 10n, () => null),
    error => error.code === 'INVALID_FULL_ARCH_SEQUENCE');
});
