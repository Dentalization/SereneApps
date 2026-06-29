import test from 'node:test';
import assert from 'node:assert/strict';
import {
  branchToForm,
  formToBranchPayload,
  normalizeBranch,
} from '../src/pages/clinic-portal/branches/branchData.mjs';

test('normalizes the real branch API fields without synthetic values', () => {
  const branch = normalizeBranch({
    id: 12n,
    streetAddress: 'Jl. Mawar 10',
    treatmentRoomsCount: 4,
    staffCount: 7,
    monthlyPatients: 19,
  });

  assert.deepEqual(
    {
      id: branch.id,
      address: branch.streetAddress,
      rooms: branch.treatmentRoomsCount,
      staff: branch.staffCount,
      patients: branch.monthlyPatients,
    },
    { id: '12', address: 'Jl. Mawar 10', rooms: 4, staff: 7, patients: 19 }
  );
});

test('maps stored branch fields into edit form without replacing them with defaults', () => {
  const form = branchToForm({
    streetAddress: 'Jl. Asli 1',
    treatmentRoomsCount: 8,
    operatingHours: { monday: '09:00-18:00' },
    isActive: false,
  });

  assert.equal(form.address, 'Jl. Asli 1');
  assert.equal(form.treatmentRooms, 8);
  assert.equal(form.operatingHours, '09:00-18:00');
  assert.equal(form.status, 'inactive');
});

test('maps edit form back to the backend branch contract', () => {
  const payload = formToBranchPayload({
    branchName: 'Cabang Barat',
    address: 'Jl. Barat 2',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    postalCode: '12345',
    phone: '021123',
    treatmentRooms: 6,
    operatingHours: '08:30-17:30',
    status: 'inactive',
  });

  assert.equal(payload.streetAddress, 'Jl. Barat 2');
  assert.equal(payload.treatmentRoomsCount, 6);
  assert.equal(payload.operatingHours.monday, '08:30-17:30');
  assert.equal(payload.isActive, false);
  assert.equal('address' in payload, false);
});
