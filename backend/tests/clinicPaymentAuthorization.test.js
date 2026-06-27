import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanAccessBranch,
  assertCanAccessClinicPayment,
  assertDentistInBranch,
  resolveClinicStaffContext,
  serializeClinicPaymentContext
} from '../src/services/clinicPaymentAuthorization.js';

function fakePrisma({ staff, branches = [], dentists = [] }) {
  return {
    clinicStaff: {
      findUnique: async () => staff,
      findFirst: async ({ where }) => (
        dentists.find((dentist) => (
          dentist.isActive
          && dentist.userId.toString() === where.userId.toString()
          && dentist.assignedBranchId.toString() === where.assignedBranchId.toString()
        )) || null
      )
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

test('dentist clinic staff role is not allowed for cashier payment menu actions', async () => {
  const ctx = await resolveClinicStaffContext(
    { id: '15' },
    {
      prismaClient: fakePrisma({
        staff: {
          id: 6n,
          userId: 15n,
          clinicProfileId: 20n,
          role: 'dentist',
          isActive: true,
          assignedBranchId: 70n,
          permissions: []
        }
      })
    }
  );

  assert.equal(ctx.canAccessPaymentMenu, false);
  assert.throws(() => assertCanAccessClinicPayment(ctx), /FORBIDDEN/);
});

test('dentist lookup is scoped to selected branch', async () => {
  const dentistStaff = {
    id: 7n,
    userId: 16n,
    clinicProfileId: 20n,
    role: 'dentist',
    isActive: true,
    assignedBranchId: 80n,
    user: {
      id: 16n,
      name: 'Dr. Branch A',
      email: 'branch-a@example.test',
      phone_number: null,
      dentistProfile: []
    },
    assignedBranch: {
      id: 80n,
      branchName: 'Branch A',
      clinicProfileId: 20n
    }
  };
  const prismaClient = fakePrisma({ dentists: [dentistStaff] });

  assert.equal(await assertDentistInBranch('16', '80', { prismaClient }), dentistStaff);
  await assert.rejects(
    () => assertDentistInBranch('16', '81', { prismaClient }),
    /DENTIST_NOT_ASSIGNED_TO_BRANCH/
  );
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
