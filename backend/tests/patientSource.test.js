import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePatientSource } from '../src/services/patientSource.js';

test('cashier walk-in metadata is classified as clinic walk-in', () => {
  const source = resolvePatientSource({
    appointments: [{
      metadata: {
        source: 'clinic_walk_in',
        patientSource: 'clinic_walk_in',
        createdByStaffId: '958'
      }
    }],
    medicalDetails: { patientSource: 'clinic_walk_in' }
  });

  assert.deepEqual(source, {
    id: 'clinic_walk_in',
    label: 'Walk-in Klinik'
  });
});

test('dentist-created and mobile patients retain distinct sources', () => {
  assert.deepEqual(
    resolvePatientSource({
      appointments: [{ metadata: { patientSource: 'clinic_added' } }]
    }),
    { id: 'clinic_added', label: 'Ditambahkan Dokter' }
  );
  assert.deepEqual(
    resolvePatientSource({
      appointments: [{ metadata: { source: 'standard_booking' } }]
    }),
    { id: 'serene_mobile', label: 'Serene Mobile' }
  );
});

test('missing source is exposed as unknown instead of mobile', () => {
  assert.deepEqual(
    resolvePatientSource({ appointments: [], medicalDetails: {} }),
    { id: 'unknown', label: 'Sumber tidak tercatat' }
  );
});
