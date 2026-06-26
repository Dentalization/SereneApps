import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanAccessBranch,
  assertCanAccessClinicPayment,
  resolveClinicStaffContext,
  serializeClinicPaymentContext
} from '../src/services/clinicPaymentAuthorization.js';

function fakePrisma({ staff, branches = [] }) {
  return {
    clinicStaff: {
      findUnique: async () => staff
    },
    clinicBranch: {
      findMany: async () => branches
    }
  };
}

test('cashier context is restricted to assigned branch', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '10' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 1n,
          userId: 10n,
          clinicProfileId: 20n,
          role: 'cashier',
          isActive: true,
          assignedBranchId: 30n,
          permissions: []
        }
      })
    }
  );

  assert.equal(ctx.canAccessPaymentMenu, true);
  assert.deepEqual(ctx.allowedBranchIds, [30n]);
  assert.equal(assertCanAccessBranch(ctx, '30'), 30n);
  assert.throws(() => assertCanAccessBranch(ctx, '31'), /BRANCH_ACCESS_DENIED/);
});

test('cashier without assigned branch can see permission context but cannot access branch actions', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '11' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 2n,
          userId: 11n,
          clinicProfileId: 20n,
          role: 'cashier',
          isActive: true,
          assignedBranchId: null,
          permissions: []
        }
      })
    }
  );

  assert.equal(ctx.canAccessPaymentMenu, true);
  assert.deepEqual(ctx.allowedBranchIds, []);
  assert.throws(() => assertCanAccessBranch(ctx, '30'), /Cashier is not assigned to a branch/);
});

test('manager with assigned branch is not clinic-wide', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '12' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 3n,
          userId: 12n,
          clinicProfileId: 20n,
          role: 'manager',
          isActive: true,
          assignedBranchId: 40n,
          permissions: ['all']
        },
        branches: [{ id: 40n }, { id: 41n }]
      })
    }
  );

  assert.equal(ctx.isClinicWideManager, false);
  assert.deepEqual(ctx.allowedBranchIds, [40n]);
  assert.throws(() => assertCanAccessBranch(ctx, '41'), /BRANCH_ACCESS_DENIED/);
});

test('manager without assigned branch can access active clinic branches', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '13' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 4n,
          userId: 13n,
          clinicProfileId: 20n,
          role: 'manager',
          isActive: true,
          assignedBranchId: null,
          permissions: []
        },
        branches: [{ id: 50n }, { id: 51n }]
      })
    }
  );

  assert.equal(ctx.canAccessPaymentMenu, true);
  assert.equal(ctx.isClinicWideManager, true);
  assert.deepEqual(ctx.allowedBranchIds, [50n, 51n]);
  assert.equal(assertCanAccessBranch(ctx, '51'), 51n);
});

test('non payment clinic role is not allowed for payment menu actions', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '14' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 5n,
          userId: 14n,
          clinicProfileId: 20n,
          role: 'front_office',
          isActive: true,
          assignedBranchId: 60n,
          permissions: []
        }
      })
    }
  );

  assert.equal(ctx.canAccessPaymentMenu, false);
  assert.throws(() => assertCanAccessClinicPayment(ctx), /FORBIDDEN/);
});

test('serialized permission context exposes string ids for API clients', async () => {
  const payload = serializeClinicPaymentContext({
    userId: 1n,
    staffId: 2n,
    clinicProfileId: 3n,
    role: 'cashier',
    rawRole: 'cashier',
    assignedBranchId: 4n,
    allowedBranchIds: [4n],
    isClinicWideManager: false,
    canAccessPaymentMenu: true
  });

  assert.deepEqual(payload, {
    userId: '1',
    staffId: '2',
    clinicProfileId: '3',
    role: 'cashier',
    rawRole: 'cashier',
    assignedBranchId: '4',
    allowedBranchIds: ['4'],
    isClinicWideManager: false,
    canAccessPaymentMenu: true
  });
});
