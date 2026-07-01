export const SPECIALIST_CASE_TYPES = Object.freeze(['radiology']);
export const SPECIALIST_CASE_STATUSES = Object.freeze(['draft', 'active', 'completed', 'archived']);

const CLINIC_SUMMARY_TOKEN_ROLES = new Set([
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'clinic_admin',
  'clinic_staff',
  'front_office',
  'nurse',
  'staff',
]);

const CLINIC_SUMMARY_STAFF_ROLES = new Set([
  'owner',
  'clinic_owner',
  'manager',
  'clinic_manager',
  'admin',
  'clinic_admin',
  'clinic_staff',
  'front_office',
  'nurse',
  'staff',
]);

const CLINIC_OWNER_ROLES = new Set(['owner', 'clinic_owner']);
const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function specialistWorkspaceError(status, code, message = code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function specialistWorkspaceId(value, fieldName = 'id') {
  try {
    if (value === undefined || value === null || value === '') throw new Error('missing');
    return BigInt(value);
  } catch (_) {
    throw specialistWorkspaceError(400, `invalid_${fieldName}`, `Invalid ${fieldName}.`);
  }
}

function rolesFor(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

function hasRole(user, role) {
  return rolesFor(user).includes(role);
}

function hasAnyRole(user, allowedRoles) {
  return rolesFor(user).some((role) => allowedRoles.has(role));
}

export async function assertCanCreateSpecialistCase(
  user,
  { patientId, originAppointmentId = null },
  { prismaClient },
) {
  if (!hasRole(user, 'dentist')) {
    throw specialistWorkspaceError(403, 'specialist_case_dentist_required');
  }

  const dentistId = specialistWorkspaceId(user.id ?? user.userId, 'user_id');
  const parsedPatientId = specialistWorkspaceId(patientId, 'patient_id');
  const parsedAppointmentId = originAppointmentId
    ? specialistWorkspaceId(originAppointmentId, 'origin_appointment_id')
    : null;

  const appointment = parsedAppointmentId
    ? await prismaClient.appointment.findFirst({
        where: {
          id: parsedAppointmentId,
          patientId: parsedPatientId,
          dentistId,
        },
        select: {
          id: true,
          patientId: true,
          dentistId: true,
          clinicBranchId: true,
          ownerClinicId: true,
          clinicBranch: {
            select: { clinicProfileId: true },
          },
        },
      })
    : await prismaClient.appointment.findFirst({
        where: {
          patientId: parsedPatientId,
          dentistId,
        },
        orderBy: { startsAt: 'desc' },
        select: {
          id: true,
          patientId: true,
          dentistId: true,
          clinicBranchId: true,
          ownerClinicId: true,
          clinicBranch: {
            select: { clinicProfileId: true },
          },
        },
      });

  if (!appointment) {
    throw specialistWorkspaceError(403, 'specialist_case_patient_scope_denied');
  }

  return {
    dentistId,
    patientId: parsedPatientId,
    appointment: parsedAppointmentId ? appointment : null,
    relationshipAppointment: appointment,
  };
}

export function assertCanViewSpecialistCase(user, specialistCase) {
  if (!hasRole(user, 'dentist')) {
    throw specialistWorkspaceError(403, 'specialist_case_dentist_required');
  }
  const userId = specialistWorkspaceId(user.id ?? user.userId, 'user_id');
  if (!specialistCase || specialistCase.dentistId !== userId) {
    throw specialistWorkspaceError(403, 'specialist_case_access_denied');
  }
  return true;
}

export function assertCanEditSpecialistCase(user, specialistCase) {
  assertCanViewSpecialistCase(user, specialistCase);
  if (specialistCase.status === 'archived') {
    throw specialistWorkspaceError(409, 'specialist_case_archived');
  }
  return true;
}

export function assertCanAddSpecialistCaseNote(user, specialistCase) {
  assertCanViewSpecialistCase(user, specialistCase);
  if (!['draft', 'active'].includes(specialistCase.status)) {
    throw specialistWorkspaceError(
      409,
      'specialist_case_not_editable',
      'Clinical notes can only be added to draft or active cases.',
    );
  }
  return true;
}

export async function assertCanViewSpecialistCaseSummary(
  user,
  specialistCase,
  { prismaClient },
) {
  const staff = await resolveSpecialistCaseClinicSummaryScope(user, { prismaClient });
  if (
    !specialistCase?.clinicProfileId
    || staff.clinicProfileId !== specialistCase.clinicProfileId
  ) {
    throw specialistWorkspaceError(403, 'specialist_case_clinic_scope_denied');
  }

  if (
    staff.assignedBranchId
    && specialistCase.clinicBranchId
    && !CLINIC_OWNER_ROLES.has(staff.role)
    && staff.assignedBranchId !== specialistCase.clinicBranchId
  ) {
    throw specialistWorkspaceError(403, 'specialist_case_branch_scope_denied');
  }

  return staff;
}

export async function resolveSpecialistCaseClinicSummaryScope(user, { prismaClient }) {
  if (!hasAnyRole(user, CLINIC_SUMMARY_TOKEN_ROLES)) {
    throw specialistWorkspaceError(403, 'specialist_case_clinic_role_required');
  }

  const userId = specialistWorkspaceId(user.id ?? user.userId, 'user_id');
  const staff = await prismaClient.clinicStaff.findUnique({
    where: { userId },
    select: {
      role: true,
      isActive: true,
      clinicProfileId: true,
      assignedBranchId: true,
    },
  });

  if (
    !staff?.isActive
    || !CLINIC_SUMMARY_STAFF_ROLES.has(staff.role)
  ) {
    throw specialistWorkspaceError(403, 'specialist_case_clinic_scope_denied');
  }

  return {
    ...staff,
    isClinicOwner: CLINIC_OWNER_ROLES.has(staff.role),
  };
}

export function assertCanViewSpecialistCaseAggregate(user) {
  if (!hasAnyRole(user, ADMIN_ROLES)) {
    throw specialistWorkspaceError(403, 'specialist_case_admin_required');
  }
  return true;
}

export const SPECIALIST_CASE_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['active', 'archived']),
  active: Object.freeze(['completed']),
  completed: Object.freeze(['archived']),
  archived: Object.freeze([]),
});

export const __testables = {
  CLINIC_SUMMARY_STAFF_ROLES,
  CLINIC_SUMMARY_TOKEN_ROLES,
  hasAnyRole,
  hasRole,
};
