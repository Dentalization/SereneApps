import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OWNER_ROLES = new Set(['clinic_owner', 'owner']);
const ADMIN_ROLES = new Set(['clinic_admin', 'manager', 'clinic_manager', 'admin']);
const STAFF_ROLES = new Set(['clinic_staff', 'staff', 'front_office', 'nurse', 'cashier']);
const OBSERVER_ALLOWED_CLINIC_ROLES = new Set(['clinic_owner', 'owner']);

export const TELE_CONSULTATION_TYPES = ['virtual', 'tele', 'teledentistry'];

export function toBigInt(value, fieldName = 'id') {
  try {
    return BigInt(value);
  } catch (_) {
    const error = new Error(`INVALID_${fieldName.toUpperCase()}`);
    error.status = 400;
    throw error;
  }
}

export function normalizeClinicRole(role) {
  if (OWNER_ROLES.has(role)) return 'clinic_owner';
  if (ADMIN_ROLES.has(role)) return 'clinic_admin';
  if (STAFF_ROLES.has(role)) return 'clinic_staff';
  return null;
}

export function clinicAdminCanViewClinicalSummary(env = process.env) {
  return env.CLINIC_ADMIN_CAN_VIEW_CLINICAL_SUMMARY === 'true';
}

export function capabilitiesForClinicRole(clinicRole, env = process.env) {
  return {
    canObserve: clinicRole === 'clinic_owner',
    canViewSummaries: clinicRole === 'clinic_owner' || clinicRole === 'clinic_admin',
    canViewClinicalSummaryBody: clinicRole === 'clinic_owner'
      || (clinicRole === 'clinic_admin' && clinicAdminCanViewClinicalSummary(env)),
    canViewChatHistory: clinicRole === 'clinic_owner',
    canViewAuditLog: clinicRole === 'clinic_owner',
    canViewSessions: clinicRole === 'clinic_owner' || clinicRole === 'clinic_admin'
  };
}

export function hasClinicRole(clinicRole, allowedRoles = []) {
  return allowedRoles.includes(clinicRole);
}

export function scopedClinicBranchIdsForContext(context, branchIds) {
  return context.assignedBranchId && context.clinicRole !== 'clinic_owner'
    ? [context.assignedBranchId]
    : branchIds;
}

export function isTeleAppointment(appointment) {
  return TELE_CONSULTATION_TYPES.includes(appointment?.consultationType) || Boolean(appointment?.videoRoomRef);
}

export function teleAppointmentScope(branchIds) {
  return {
    clinicBranchId: { in: branchIds },
    OR: [
      { consultationType: { in: TELE_CONSULTATION_TYPES } },
      { videoRoomRef: { not: null } }
    ]
  };
}

export async function getClinicTeledentistryContext(
  user,
  allowedRoles = ['clinic_owner', 'clinic_admin'],
  { prismaClient = prisma } = {}
) {
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId: toBigInt(user.id, 'userId') },
    select: {
      id: true,
      role: true,
      isActive: true,
      clinicProfileId: true,
      assignedBranchId: true
    }
  });

  const clinicRole = normalizeClinicRole(staff?.role);
  if (!staff?.isActive || !clinicRole || !hasClinicRole(clinicRole, allowedRoles)) {
    const error = new Error('FORBIDDEN');
    error.status = 403;
    throw error;
  }

  return {
    userId: toBigInt(user.id, 'userId'),
    staffId: staff.id,
    clinicRole,
    capabilities: capabilitiesForClinicRole(clinicRole),
    clinicProfileId: staff.clinicProfileId,
    assignedBranchId: staff.assignedBranchId
  };
}

export async function clinicBranchIdsForContext(context, { prismaClient = prisma } = {}) {
  if (context.assignedBranchId && context.clinicRole !== 'clinic_owner') {
    return [context.assignedBranchId];
  }
  const branches = await prismaClient.clinicBranch.findMany({
    where: { clinicProfileId: context.clinicProfileId },
    select: { id: true }
  });
  return scopedClinicBranchIdsForContext(context, branches.map((branch) => branch.id));
}

export function evaluateClinicObserverStaffAccess({ staff, appointment }) {
  if (!appointment?.clinicBranch?.clinicProfileId) {
    return { allowed: false, reason: 'independent_dentist_denied' };
  }
  if (!staff) return { allowed: false, reason: 'not_clinic_staff' };
  if (!staff.isActive) return { allowed: false, reason: 'inactive_clinic_staff', staffId: staff.id };
  if (staff.clinicProfileId !== appointment.clinicBranch.clinicProfileId) {
    return { allowed: false, reason: 'cross_clinic_denied', staffId: staff.id };
  }
  if (!isTeleAppointment(appointment)) {
    return { allowed: false, reason: 'appointment_not_tele', staffId: staff.id };
  }
  if (staff.assignedBranchId && staff.assignedBranchId !== appointment.clinicBranchId && !OWNER_ROLES.has(staff.role)) {
    return { allowed: false, reason: 'cross_branch_denied', staffId: staff.id };
  }
  if (!OBSERVER_ALLOWED_CLINIC_ROLES.has(staff.role)) {
    return { allowed: false, reason: 'clinic_role_not_allowed', staffId: staff.id };
  }

  return {
    allowed: true,
    reason: null,
    staffId: staff.id,
    clinicRole: normalizeClinicRole(staff.role)
  };
}

export async function evaluateClinicObserverAccess(user, appointment, { prismaClient = prisma } = {}) {
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId: toBigInt(user.id, 'userId') },
    select: {
      id: true,
      role: true,
      isActive: true,
      clinicProfileId: true,
      assignedBranchId: true
    }
  });

  return evaluateClinicObserverStaffAccess({ staff, appointment });
}

export const __testables = {
  capabilitiesForClinicRole,
  clinicAdminCanViewClinicalSummary,
  evaluateClinicObserverStaffAccess,
  isTeleAppointment,
  normalizeClinicRole,
  scopedClinicBranchIdsForContext,
  teleAppointmentScope
};
