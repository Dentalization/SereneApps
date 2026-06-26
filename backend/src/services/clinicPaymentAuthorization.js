import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PAYMENT_ROLES = new Set(['cashier', 'manager', 'clinic_manager']);

export function toBigInt(value, fieldName = 'id') {
  try {
    if (value === undefined || value === null || value === '') {
      throw new Error('missing');
    }
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

function hasPermission(permissions, keys = []) {
  if (!permissions) return false;
  if (Array.isArray(permissions)) {
    return keys.some((key) => permissions.includes(key));
  }
  if (typeof permissions === 'object') {
    return keys.some((key) => permissions[key] === true);
  }
  return false;
}

function permissionBranchIds(permissions) {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
    return null;
  }
  const raw = permissions.branchIds || permissions.allowedBranchIds || permissions.branches;
  if (!Array.isArray(raw) || !raw.length) return null;
  return raw.map((value) => toBigInt(value, 'branchId'));
}

function serializeId(value) {
  return value === null || value === undefined ? null : value.toString();
}

export function assertCanAccessClinicPayment(ctx) {
  if (!ctx || !PAYMENT_ROLES.has(ctx.role)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }
  return true;
}

export function assertCanAccessBranch(ctx, branchId) {
  assertCanAccessClinicPayment(ctx);

  if (ctx.role === 'cashier' && !ctx.assignedBranchId) {
    const error = new Error('Cashier is not assigned to a branch.');
    error.status = 403;
    throw error;
  }

  const targetBranchId = toBigInt(branchId, 'branchId');
  const allowed = (ctx.allowedBranchIds || []).some((allowedBranchId) => (
    allowedBranchId.toString() === targetBranchId.toString()
  ));

  if (!allowed) {
    const error = new Error('BRANCH_ACCESS_DENIED');
    error.status = 403;
    throw error;
  }

  return targetBranchId;
}

export async function assertDentistInBranch(dentistId, branchId, { prismaClient = prisma } = {}) {
  const parsedDentistId = toBigInt(dentistId, 'dentistId');
  const parsedBranchId = toBigInt(branchId, 'branchId');

  const dentistStaff = await prismaClient.clinicStaff.findFirst({
    where: {
      userId: parsedDentistId,
      assignedBranchId: parsedBranchId,
      isActive: true,
      OR: [
        { role: 'dentist' },
        { user: { roles: { has: 'dentist' } } }
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          dentistProfile: {
            select: {
              title: true,
              primarySpecialization: true,
              consultationFee: true
            },
            take: 1
          }
        }
      },
      assignedBranch: {
        select: {
          id: true,
          branchName: true,
          clinicProfileId: true
        }
      }
    }
  });

  if (!dentistStaff) {
    const error = new Error('DENTIST_NOT_ASSIGNED_TO_BRANCH');
    error.status = 400;
    throw error;
  }

  return dentistStaff;
}

export async function resolveClinicStaffContext(user, { prismaClient = prisma } = {}) {
  const userId = toBigInt(user?.id ?? user?.userId, 'userId');
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      clinicProfileId: true,
      role: true,
      isActive: true,
      assignedBranchId: true,
      permissions: true
    }
  });

  if (!staff?.isActive) {
    const error = new Error('CLINIC_STAFF_CONTEXT_MISSING');
    error.status = 403;
    throw error;
  }

  const role = staff.role === 'clinic_manager' ? 'manager' : staff.role;
  const explicitBranchIds = permissionBranchIds(staff.permissions);
  const canAccessAllBranches = role === 'manager' && !staff.assignedBranchId;

  let allowedBranchIds = [];
  if (role === 'cashier') {
    allowedBranchIds = staff.assignedBranchId ? [staff.assignedBranchId] : [];
  } else if (staff.assignedBranchId && !canAccessAllBranches) {
    allowedBranchIds = [staff.assignedBranchId];
  } else if (explicitBranchIds?.length) {
    allowedBranchIds = explicitBranchIds;
  } else if (role === 'manager') {
    const branches = await prismaClient.clinicBranch.findMany({
      where: { clinicProfileId: staff.clinicProfileId, isActive: true },
      select: { id: true }
    });
    allowedBranchIds = branches.map((branch) => branch.id);
  }

  const context = {
    userId,
    staffId: staff.id,
    clinicProfileId: staff.clinicProfileId,
    role,
    rawRole: staff.role,
    assignedBranchId: staff.assignedBranchId,
    allowedBranchIds,
    isClinicWideManager: role === 'manager' && !staff.assignedBranchId && allowedBranchIds.length > 1,
    canAccessPaymentMenu: PAYMENT_ROLES.has(role)
  };

  return context;
}

export function serializeClinicPaymentContext(ctx) {
  return {
    userId: serializeId(ctx.userId),
    staffId: serializeId(ctx.staffId),
    clinicProfileId: serializeId(ctx.clinicProfileId),
    role: ctx.role,
    rawRole: ctx.rawRole,
    assignedBranchId: serializeId(ctx.assignedBranchId),
    allowedBranchIds: (ctx.allowedBranchIds || []).map(serializeId),
    isClinicWideManager: ctx.isClinicWideManager,
    canAccessPaymentMenu: ctx.canAccessPaymentMenu
  };
}

export const __testables = {
  hasPermission,
  permissionBranchIds
};
