import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveDentistClinicContext,
  syncDentistProfileClinicAssignment,
} from '../src/services/dentistClinicContextService.js';

test('active ClinicStaff assignment overrides legacy dentist profile context', async () => {
  const prismaClient = {
    clinicStaff: {
      findUnique: async () => ({
        id: 9n,
        role: 'dentist',
        isActive: true,
        clinicProfileId: 4n,
        assignedBranch: {
          id: 7n,
          clinicProfileId: 4n,
          branchName: 'Serene Central',
          branchCode: 'CTR',
          isActive: true,
          streetAddress: 'Jl. Sehat 1',
          city: 'Jakarta',
          province: 'DKI Jakarta',
          postalCode: '10110',
          operatingHours: { monday: { open: '08:00', close: '17:00' } },
        },
        clinicProfile: {
          legalName: 'PT Serene Dental',
          brandName: 'Serene Dental',
          status: 'verified',
          timezone: 'Asia/Jakarta',
          operatingHours: {},
        },
      }),
    },
    clinicBranch: { findFirst: async () => null },
  };

  const context = await resolveDentistClinicContext({ prismaClient, dentistUserId: '22' });
  assert.equal(context.source, 'clinic_staff');
  assert.equal(context.clinicProfileId, '4');
  assert.equal(context.branchId, '7');
  assert.equal(context.clinicName, 'Serene Dental');
  assert.match(context.clinicAddress, /Jl\. Sehat 1, Jakarta/);
});

test('inactive or removed staff assignment mirrors dentist profile back to independent', async () => {
  let update;
  const prismaClient = {
    clinicStaff: {
      findUnique: async () => ({ clinicProfileId: 4n, isActive: false }),
    },
    dentistProfile: {
      updateMany: async (args) => {
        update = args;
        return { count: 1 };
      },
    },
  };

  const result = await syncDentistProfileClinicAssignment({ prismaClient, dentistUserId: 22 });
  assert.equal(result.dentistType, 'independent');
  assert.equal(result.clinicProfileId, null);
  assert.deepEqual(update.data, { clinic_id: null, dentist_type: 'independent' });
});

test('unassigned active dentist falls back to the main active branch', async () => {
  let branchLookup;
  const prismaClient = {
    clinicStaff: {
      findUnique: async () => ({
        id: 9n,
        role: 'dentist',
        isActive: true,
        clinicProfileId: 4n,
        assignedBranch: null,
        clinicProfile: {
          legalName: 'PT Serene Dental',
          brandName: null,
          status: 'verified',
          timezone: 'Asia/Jakarta',
          operatingHours: { monday: { open: '09:00', close: '16:00' } },
          streetAddress: 'Clinic HQ',
          city: 'Bandung',
          province: 'Jawa Barat',
          postalCode: '40111',
        },
      }),
    },
    clinicBranch: {
      findFirst: async (args) => {
        branchLookup = args;
        return { id: 5n, branchName: 'Main', isActive: true, isMainBranch: true };
      },
    },
  };

  const context = await resolveDentistClinicContext({ prismaClient, dentistUserId: 22 });
  assert.equal(context.branchId, '5');
  assert.equal(branchLookup.where.clinicProfileId, 4n);
  assert.equal(branchLookup.where.isActive, true);
});

test('cross-clinic assigned branch is ignored in favor of this clinic main branch', async () => {
  const prismaClient = {
    clinicStaff: {
      findUnique: async () => ({
        id: 9n,
        role: 'dentist',
        isActive: true,
        clinicProfileId: 4n,
        assignedBranch: {
          id: 99n,
          clinicProfileId: 12n,
          isActive: true,
          branchName: 'Wrong tenant branch',
        },
        clinicProfile: {
          legalName: 'PT Serene Dental',
          brandName: 'Serene Dental',
          status: 'verified',
          timezone: 'Asia/Jakarta',
          operatingHours: {},
        },
      }),
    },
    clinicBranch: {
      findFirst: async () => ({
        id: 5n,
        clinicProfileId: 4n,
        branchName: 'Correct main branch',
        isActive: true,
      }),
    },
  };

  const context = await resolveDentistClinicContext({ prismaClient, dentistUserId: 22 });
  assert.equal(context.branchId, '5');
  assert.equal(context.branchName, 'Correct main branch');
});
