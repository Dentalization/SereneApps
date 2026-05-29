import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIAL_OWNER_TYPES,
  assertFinancialOwnershipImmutable,
  assertResolvedFinancialOwner,
  normalizeFinancialOwnerType,
  resolvePaymentOwner
} from '../src/services/payments/ownership.js';

test('normalizes explicit financial owner aliases without changing stored values', () => {
  assert.equal(normalizeFinancialOwnerType('CLINIC'), FINANCIAL_OWNER_TYPES.CLINIC);
  assert.equal(normalizeFinancialOwnerType('clinic'), FINANCIAL_OWNER_TYPES.CLINIC);
  assert.equal(normalizeFinancialOwnerType('INDEPENDENT_DENTIST'), FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST);
  assert.equal(normalizeFinancialOwnerType('dentist'), FINANCIAL_OWNER_TYPES.INDEPENDENT_DENTIST);
});

test('resolves clinic appointment ownership to clinic only', () => {
  const owner = resolvePaymentOwner({
    ownerType: 'clinic',
    ownerClinicId: 10n,
    dentistId: 20n
  });

  assert.deepEqual(owner, {
    ownerType: 'clinic',
    ownerClinicId: 10n,
    ownerDentistId: null
  });
});

test('resolves clinic ownership from included clinicBranch when ownerClinicId is absent', () => {
  const owner = resolvePaymentOwner({
    clinicBranchId: 5n,
    clinicBranch: { clinicProfileId: 44n },
    dentistId: 20n
  });

  assert.deepEqual(owner, {
    ownerType: 'clinic',
    ownerClinicId: 44n,
    ownerDentistId: null
  });
});

test('resolves independent dentist appointment ownership to dentist only', () => {
  const owner = resolvePaymentOwner({
    ownerType: 'INDEPENDENT_DENTIST',
    dentistId: 20n
  });

  assert.deepEqual(owner, {
    ownerType: 'dentist',
    ownerClinicId: null,
    ownerDentistId: 20n
  });
});

test('rejects ambiguous clinic ownership with a dentist owner', () => {
  assert.throws(
    () => assertResolvedFinancialOwner({
      ownerType: 'clinic',
      ownerClinicId: 10n,
      ownerDentistId: 20n
    }),
    /Clinic-owned payments must have exactly one clinic owner/
  );
});

test('rejects independent dentist ownership without a dentist owner', () => {
  assert.throws(
    () => resolvePaymentOwner({
      ownerType: 'dentist'
    }),
    /Independent dentist-owned payments must have exactly one dentist owner/
  );
});

test('rejects clinic ownership without a clinic owner', () => {
  assert.throws(
    () => resolvePaymentOwner({
      ownerType: 'clinic',
      dentistId: 20n
    }),
    /Clinic-owned payments must have exactly one clinic owner/
  );
});

test('allows financial updates that do not attempt to change ownership', () => {
  assert.doesNotThrow(() => assertFinancialOwnershipImmutable(
    { ownerType: 'clinic', ownerClinicId: 10n, ownerDentistId: null },
    { status: 'settled' }
  ));
});

test('rejects changing payment ownership after creation', () => {
  assert.throws(
    () => assertFinancialOwnershipImmutable(
      { ownerType: 'clinic', ownerClinicId: 10n, ownerDentistId: null },
      { ownerType: 'dentist', ownerClinicId: null, ownerDentistId: 20n }
    ),
    /Financial ownership is immutable/
  );
});

test('rejects changing only the owner id after creation', () => {
  assert.throws(
    () => assertFinancialOwnershipImmutable(
      { ownerType: 'dentist', ownerClinicId: null, ownerDentistId: 20n },
      { ownerDentistId: 21n }
    ),
    /Financial ownership is immutable/
  );
});
